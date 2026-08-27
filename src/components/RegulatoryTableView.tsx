import React, { useState } from "react";
import { Copy, Check, Table as TableIcon, Layers, FileSpreadsheet } from "lucide-react";
import { RegulatoryTable, compareTables, parseTableData, isTableJson } from "../lib/tableStructure";
import { cn } from "../lib/utils";

interface RegulatoryTableViewProps {
  data: RegulatoryTable | string;
  originalData?: RegulatoryTable | string; // If provided, enables diff rendering
  className?: string;
  showCopyButton?: boolean;
  variant?: 'default' | 'official';
}

export const RegulatoryTableView: React.FC<RegulatoryTableViewProps> = ({
  data,
  originalData,
  className,
  showCopyButton = true,
  variant = 'default'
}) => {
  const [copied, setCopied] = useState(false);

  const tableData: RegulatoryTable = typeof data === "string" ? parseTableData(data) : data;
  const origTableData: RegulatoryTable | null = originalData
    ? typeof originalData === "string"
      ? parseTableData(originalData)
      : originalData
    : null;

  const diffResult = origTableData && variant !== 'official' ? compareTables(origTableData, tableData) : null;

  const handleCopyTSV = () => {
    if (!tableData || !tableData.headers) return;
    let tsv = tableData.headers.join("\t") + "\n";
    for (const row of tableData.rows) {
      tsv += tableData.headers.map((_, i) => (row[i] !== undefined && row[i] !== null ? String(row[i]) : "")).join("\t") + "\n";
    }
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tableData || !tableData.headers || tableData.headers.length === 0) {
    return <div className="text-xs text-slate-400 italic p-3">Tabela vazia ou formato inválido</div>;
  }

  // Official regulatory document presentation (Black and white, clean borders, no buttons/colors/indices)
  if (variant === 'official') {
    return (
      <div className={cn("w-full my-4 overflow-x-auto", className)}>
        <table className="w-full border-collapse border border-black text-black bg-white text-xs sm:text-sm font-serif">
          <thead>
            <tr>
              {tableData.headers.map((header, hIdx) => (
                <th
                  key={hIdx}
                  className="border border-black px-3 py-2.5 font-bold text-center text-black bg-white uppercase leading-snug tracking-tight"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {tableData.headers.map((_, cIdx) => {
                  const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "";
                  // Check if cell is a numeric/short code to center, else left-align
                  const isShortCode = val.trim().length <= 4 && !isNaN(Number(val.trim()));
                  return (
                    <td
                      key={cIdx}
                      className={cn(
                        "border border-black px-3 py-2 text-black bg-white leading-relaxed align-middle",
                        isShortCode ? "text-center font-bold" : "text-left"
                      )}
                    >
                      {val || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Calculate sensible max-width based on column count to avoid over-stretching on wide screens
  const numCols = tableData.headers.length;
  const defaultMaxWidth = numCols <= 2 ? "max-w-3xl" : numCols <= 3 ? "max-w-4xl" : "max-w-5xl";

  // Heuristic to check which columns are short/numeric (like factors, percentages, codes, amounts)
  const isColShort = (cIdx: number) => {
    if (numCols === 2 && cIdx === 1) return true; // Last column of 2-col table is typically numeric/value
    return tableData.rows.every(r => {
      const val = r[cIdx] ? String(r[cIdx]).trim() : "";
      return val.length <= 15;
    });
  };

  return (
    <div className={cn("space-y-2 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs w-full", defaultMaxWidth, className)}>
      {/* Title / Action Header */}
      <div className="px-3.5 py-2.5 bg-adasa-dark text-white border-b border-blue-900 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <TableIcon size={14} className="text-white shrink-0" />
          <span className="text-xs font-bold text-white tracking-wide truncate">
            {tableData.title || "Tabela Regulada"}
          </span>
          {diffResult && diffResult.hasChanges && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] shrink-0 shadow-2xs">
              {diffResult.totalChangedCells} alteração(ões)
            </span>
          )}
        </div>

        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopyTSV}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg transition-colors shrink-0 print:hidden cursor-pointer"
            title="Copiar dados para colar no Excel ou Word"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-300" />
                <span className="text-emerald-200">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copiar Tabela</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Rendered Table */}
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="w-10 px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 bg-slate-200/50 select-none shrink-0">
                #
              </th>
              {tableData.headers.map((header, hIdx) => {
                const headerDiff = diffResult?.headerDiffs[hIdx];
                const colShort = isColShort(hIdx);
                return (
                  <th
                    key={hIdx}
                    className={cn(
                      "px-3 py-2 font-black text-slate-700 uppercase tracking-wider text-[11px] border-r border-slate-200 last:border-r-0",
                      colShort ? "text-center w-36 sm:w-44 whitespace-normal" : "text-left",
                      headerDiff?.modified && "bg-emerald-100 text-emerald-950"
                    )}
                  >
                    {header}
                    {headerDiff?.modified && (
                      <div className="text-[9px] font-normal text-rose-700 line-through opacity-80">
                        {headerDiff.oldValue}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableData.rows.map((row, rIdx) => {
              return (
                <tr
                  key={rIdx}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    rIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  )}
                >
                  <td className="w-10 px-3 py-2 text-center font-bold text-slate-400 border-r border-slate-200 bg-slate-50/60 select-none text-[11px] shrink-0">
                    {rIdx + 1}
                  </td>
                  {tableData.headers.map((_, cIdx) => {
                    const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "";
                    const diffKey = `${rIdx}_${cIdx}`;
                    const cellDiff = diffResult?.cellDiffs[diffKey];
                    const isModified = cellDiff?.type === "modified";
                    const isAdded = cellDiff?.type === "added";
                    const colShort = isColShort(cIdx);

                    return (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3 py-2 border-r border-slate-100 last:border-r-0 text-slate-800 leading-relaxed",
                          colShort ? "text-center align-middle font-medium" : "text-left",
                          (isModified || isAdded) && "bg-emerald-50 text-emerald-950 font-bold"
                        )}
                      >
                        <div>{val || <span className="text-slate-300">-</span>}</div>
                        {isModified && cellDiff?.oldValue && (
                          <div className="text-[9px] font-normal text-rose-600 line-through mt-0.5">
                            {cellDiff.oldValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
