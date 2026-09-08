import re

with open("src/lib/tableStructure.ts", "r") as f:
    content = f.read()

merged_row_interface = """export interface MergedRow {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  origIdx: number | null;
  propIdx: number | null;
  cells: string[];
  originalCells?: string[];
}

export interface TableDiffResult {"""
content = content.replace("export interface TableDiffResult {", merged_row_interface)

if "mergedRows: MergedRow[];" not in content:
    content = content.replace("headerDiffs: Record<number, { oldValue: string; newValue: string; modified: boolean }>;",
        "headerDiffs: Record<number, { oldValue: string; newValue: string; modified: boolean }>;\n  mergedRows: MergedRow[];")

new_compare_tables = """export const compareTables = (
  origTable: RegulatoryTable,
  proposedTable: RegulatoryTable
): TableDiffResult => {
  const result: TableDiffResult = {
    hasChanges: false,
    totalChangedCells: 0,
    addedRowsCount: 0,
    removedRowsCount: 0,
    cellDiffs: {},
    headerDiffs: {},
    mergedRows: []
  };

  const maxHeaders = Math.max(origTable.headers.length, proposedTable.headers.length);
  for (let c = 0; c < maxHeaders; c++) {
    const oldH = (origTable.headers[c] || "").trim();
    const newH = (proposedTable.headers[c] || "").trim();
    if (oldH !== newH) {
      result.hasChanges = true;
      result.headerDiffs[c] = {
        oldValue: oldH,
        newValue: newH,
        modified: true
      };
    }
  }

  const changes = diff.diffArrays(origTable.rows, proposedTable.rows, {
    comparator: (a: string[], b: string[]) => {
      if (JSON.stringify(a) === JSON.stringify(b)) return true;
      const maxCols = Math.max(a.length, b.length);
      if (maxCols === 0) return true;
      
      const a0 = (a[0] || "").trim();
      const b0 = (b[0] || "").trim();
      if (a0 !== "" && a0 === b0) return true;

      let same = 0;
      for (let i = 0; i < maxCols; i++) {
        if ((a[i] || "").trim() === (b[i] || "").trim()) same++;
      }
      return same >= Math.ceil(maxCols * 0.66);
    }
  });

  let oIdx = 0;
  let pIdx = 0;

  for (const change of changes) {
    if (change.removed) {
      result.removedRowsCount += change.count || 1;
      result.hasChanges = true;
      for (let i = 0; i < (change.count || 1); i++) {
        const origRow = origTable.rows[oIdx];
        if (origRow) {
          result.mergedRows.push({
            type: 'removed',
            origIdx: oIdx,
            propIdx: null,
            cells: origRow,
            originalCells: origRow
          });
          const maxCols = Math.max(origRow.length, maxHeaders);
          for (let c = 0; c < maxCols; c++) {
            result.cellDiffs[`removed_${oIdx}_${c}`] = {
              rowIndex: oIdx,
              colIndex: c,
              oldValue: (origRow[c] || "").trim(),
              newValue: "",
              type: "removed"
            };
          }
        }
        oIdx++;
      }
    } else if (change.added) {
      result.addedRowsCount += change.count || 1;
      result.hasChanges = true;
      for (let i = 0; i < (change.count || 1); i++) {
        const propRow = proposedTable.rows[pIdx];
        if (propRow) {
          result.mergedRows.push({
            type: 'added',
            origIdx: null,
            propIdx: pIdx,
            cells: propRow
          });
          const maxCols = Math.max(propRow.length, maxHeaders);
          for (let c = 0; c < maxCols; c++) {
            result.cellDiffs[`${pIdx}_${c}`] = {
              rowIndex: pIdx,
              colIndex: c,
              oldValue: "",
              newValue: (propRow[c] || "").trim(),
              type: "added"
            };
            result.totalChangedCells++;
          }
        }
        pIdx++;
      }
    } else {
      for (let i = 0; i < (change.count || 1); i++) {
        const origRow = origTable.rows[oIdx] || [];
        const propRow = proposedTable.rows[pIdx] || [];
        const maxCols = Math.max(origRow.length, propRow.length, maxHeaders);
        
        let rowType: 'modified' | 'unchanged' = 'unchanged';

        for (let c = 0; c < maxCols; c++) {
          const oldVal = (origRow[c] !== undefined && origRow[c] !== null ? String(origRow[c]) : "").trim();
          const newVal = (propRow[c] !== undefined && propRow[c] !== null ? String(propRow[c]) : "").trim();
          
          if (oldVal !== newVal) {
            rowType = 'modified';
            result.hasChanges = true;
            result.totalChangedCells++;
            result.cellDiffs[`${pIdx}_${c}`] = {
              rowIndex: pIdx,
              colIndex: c,
              oldValue: oldVal,
              newValue: newVal,
              type: "modified"
            };
          }
        }
        
        result.mergedRows.push({
          type: rowType,
          origIdx: oIdx,
          propIdx: pIdx,
          cells: propRow,
          originalCells: origRow
        });

        oIdx++;
        pIdx++;
      }
    }
  }

  return result;
};"""

pattern = re.compile(r"export const compareTables = \([\s\S]*?return result;\n};", re.MULTILINE)
content = pattern.sub(new_compare_tables, content)

with open("src/lib/tableStructure.ts", "w") as f:
    f.write(content)

