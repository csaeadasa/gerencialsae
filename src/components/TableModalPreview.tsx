import React, { useState, useEffect } from "react";
import { 
  Table as TableIcon, 
  Eye, 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { RegulatoryTable, parseTableData, compareTables, isTableJson } from "../lib/tableStructure";
import { RegulatoryTableView } from "./RegulatoryTableView";
import { cn } from "../lib/utils";

interface TableModalPreviewProps {
  data?: RegulatoryTable | string;
  originalData?: RegulatoryTable | string;
  title?: string;
  badgeLabel?: string;
  variant?: "default" | "vigente" | "proposta" | "contribuicao" | "final";
  isSuppressing?: boolean;
  className?: string;
  buttonText?: string;
}

export const TableModalPreview: React.FC<TableModalPreviewProps> = ({
  data,
  originalData,
  title,
  badgeLabel,
  variant = "default",
  isSuppressing = false,
  className,
  buttonText = "Visualizar Tabela"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (isSuppressing) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-2xs", className)}>
        <X size={13} className="text-rose-600 shrink-0" />
        <span>Supressão Integral da Tabela</span>
      </div>
    );
  }

  const tableData: RegulatoryTable = typeof data === "string" ? parseTableData(data) : (data || { headers: [], rows: [] });
  const origTableData: RegulatoryTable | null = originalData 
    ? (typeof originalData === "string" ? parseTableData(originalData) : originalData)
    : null;

  const diffResult = origTableData ? compareTables(origTableData, tableData) : null;
  const numRows = tableData.rows ? tableData.rows.length : 0;
  const numCols = tableData.headers ? tableData.headers.length : 0;
  const displayTitle = title || tableData.title || "Tabela Estruturada";

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

  // Color styling based on variant
  const cardStyle = {
    vigente: "border-slate-300 bg-slate-50/80 hover:bg-slate-100/90 text-slate-800",
    proposta: "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-indigo-950",
    contribuicao: diffResult?.hasChanges 
      ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950" 
      : "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/60 text-slate-800",
    final: "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-950",
    default: "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
  }[variant];

  return (
    <>
      {/* COMPACT CELL TRIGGER BUTTON / CARD */}
      <div 
        onClick={() => setIsOpen(true)}
        className={cn(
          "group relative p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-sm text-left flex flex-col gap-1.5 min-w-[170px]",
          cardStyle,
          className
        )}
        title="Clique para abrir e inspecionar a tabela completa"
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1 text-[11px] font-black tracking-tight truncate max-w-[180px]">
            <TableIcon size={13} className="shrink-0 text-indigo-600" />
            <span className="truncate">{displayTitle}</span>
          </span>
          <span className="p-1 rounded-md text-slate-400 group-hover:text-indigo-600 group-hover:bg-white/80 transition-colors shrink-0">
            <Eye size={13} />
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
          <span className="text-[10px] font-mono text-slate-500 bg-white/80 border border-slate-200/80 px-1.5 py-0.5 rounded">
            {numRows} {numRows === 1 ? "linha" : "linhas"} × {numCols} cols
          </span>

          {diffResult?.hasChanges && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Sparkles size={10} className="text-emerald-600" />
              {diffResult.totalChangedCells} {diffResult.totalChangedCells === 1 ? "alteração" : "alterações"}
            </span>
          )}

          {badgeLabel && !diffResult?.hasChanges && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
              {badgeLabel}
            </span>
          )}
        </div>

        <div className="mt-1 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {buttonText}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">Pop-up ↗</span>
        </div>
      </div>

      {/* MODAL POPUP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="px-5 py-4 bg-adasa-dark text-white flex items-center justify-between gap-4 shrink-0 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <TableIcon size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white truncate" title={displayTitle}>
                      {displayTitle}
                    </h3>
                    {badgeLabel && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                        {badgeLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-100 mt-0.5">
                    <span>{numRows} {numRows === 1 ? "linha" : "linhas"}</span>
                    <span>•</span>
                    <span>{numCols} colunas</span>
                    {diffResult?.hasChanges && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-300 font-bold flex items-center gap-1">
                          <Sparkles size={11} /> {diffResult.totalChangedCells} alteração(ões) destacada(s)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyTSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
                  title="Copiar dados da tabela para colar no Excel ou Word"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-300" />
                      <span className="text-emerald-200">Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="hidden sm:inline">Copiar Tabela</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
                  title="Fechar (Esc)"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* DIFF BANNER IF CHANGES PRESENT */}
            {diffResult?.hasChanges && (
              <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <Sparkles size={14} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Destaque Comparativo:</strong> As células com fundo verde representam modificações ou acréscimos sugeridos. Textos originais substituídos aparecem tachados em vermelho.
                  </span>
                </div>
              </div>
            )}

            {/* MODAL BODY (TABLE VIEW) */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/40">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
                <RegulatoryTableView 
                  data={tableData}
                  originalData={origTableData || undefined}
                  showCopyButton={false}
                />
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                Pressione <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono text-slate-700">ESC</kbd> para fechar a visualização
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
