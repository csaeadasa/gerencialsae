import re

with open("src/lib/tableStructure.ts", "r") as f:
    content = f.read()

# Add import if diff is not imported
if 'import * as diff from "diff";' not in content:
    content = 'import * as diff from "diff";\n' + content

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
    headerDiffs: {}
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
      let same = 0;
      const maxCols = Math.max(a.length, b.length);
      if (maxCols === 0) return true;
      for (let i = 0; i < maxCols; i++) {
        if ((a[i] || "").trim() === (b[i] || "").trim()) same++;
      }
      return same >= Math.max(1, Math.floor(maxCols / 2));
    }
  });

  let oIdx = 0;
  let pIdx = 0;

  for (const change of changes) {
    if (change.removed) {
      result.removedRowsCount += change.count || 1;
      result.hasChanges = true;
      // You could optionally add removed cells here using oIdx if you had a separate visualization
      oIdx += change.count || 1;
    } else if (change.added) {
      result.addedRowsCount += change.count || 1;
      result.hasChanges = true;
      for (let i = 0; i < (change.count || 1); i++) {
        const propRow = proposedTable.rows[pIdx];
        if (propRow) {
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

        for (let c = 0; c < maxCols; c++) {
          const oldVal = (origRow[c] !== undefined && origRow[c] !== null ? String(origRow[c]) : "").trim();
          const newVal = (propRow[c] !== undefined && propRow[c] !== null ? String(propRow[c]) : "").trim();
          
          if (oldVal !== newVal) {
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
        oIdx++;
        pIdx++;
      }
    }
  }

  return result;
};"""

# Replace the old compareTables
pattern = re.compile(r"export const compareTables = \([\s\S]*?return result;\n};", re.MULTILINE)
content = pattern.sub(new_compare_tables, content)

with open("src/lib/tableStructure.ts", "w") as f:
    f.write(content)
