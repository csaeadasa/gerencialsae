import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Copy, Sparkles, RotateCcw, Table as TableIcon, FileSpreadsheet, ArrowDown, ArrowRight, Check, AlertCircle } from "lucide-react";
import { RegulatoryTable, DEFAULT_TABLE_TEMPLATES, parsePastedSpreadsheet, compareTables } from "../lib/tableStructure";
import { cn } from "../lib/utils";

interface RegulatoryTableEditorProps {
  initialData: RegulatoryTable;
  originalData?: RegulatoryTable; // If provided, shows diff indicators while editing
  onChange: (data: RegulatoryTable) => void;
  isContributionMode?: boolean;
}

export const RegulatoryTableEditor: React.FC<RegulatoryTableEditorProps> = ({
  initialData,
  originalData,
  onChange,
  isContributionMode = false
}) => {
  const [table, setTable] = useState<RegulatoryTable>(() => ({
    title: initialData.title || "",
    headers: initialData.headers && initialData.headers.length > 0 ? [...initialData.headers] : ["Coluna 1", "Coluna 2", "Coluna 3"],
    rows: initialData.rows && initialData.rows.length > 0 ? initialData.rows.map(r => [...r]) : [["", "", ""]]
  }));

  const initialDataKey = JSON.stringify({
    t: initialData?.title,
    h: initialData?.headers,
    r: initialData?.rows
  });

  useEffect(() => {
    setTable({
      title: initialData.title || "",
      headers: initialData.headers && initialData.headers.length > 0 ? [...initialData.headers] : ["Coluna 1", "Coluna 2", "Coluna 3"],
      rows: initialData.rows && initialData.rows.length > 0 ? initialData.rows.map(r => [...r]) : [["", "", ""]]
    });
  }, [initialDataKey]);

  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  const updateTable = (newTable: RegulatoryTable) => {
    setTable(newTable);
    onChange(newTable);
  };

  const handleTitleChange = (newTitle: string) => {
    updateTable({ ...table, title: newTitle });
  };

  const handleHeaderChange = (index: number, value: string) => {
    const nextHeaders = [...table.headers];
    nextHeaders[index] = value;
    updateTable({ ...table, headers: nextHeaders });
  };

  const handleCellChange = (rIdx: number, cIdx: number, value: string) => {
    const nextRows = table.rows.map((row, r) => {
      if (r === rIdx) {
        const newRow = [...row];
        while (newRow.length <= cIdx) newRow.push("");
        newRow[cIdx] = value;
        return newRow;
      }
      return [...row];
    });
    updateTable({ ...table, rows: nextRows });
  };

  const addColumn = () => {
    const colNum = table.headers.length + 1;
    const nextHeaders = [...table.headers, `Coluna ${colNum}`];
    const nextRows = table.rows.map(r => [...r, ""]);
    updateTable({ ...table, headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (cIdx: number) => {
    if (table.headers.length <= 1) return;
    const nextHeaders = table.headers.filter((_, i) => i !== cIdx);
    const nextRows = table.rows.map(r => r.filter((_, i) => i !== cIdx));
    updateTable({ ...table, headers: nextHeaders, rows: nextRows });
  };

  const addRow = (insertIdx?: number) => {
    const emptyRow = table.headers.map(() => "");
    let nextRows: string[][];
    if (insertIdx !== undefined && insertIdx >= 0) {
      nextRows = [...table.rows];
      nextRows.splice(insertIdx + 1, 0, emptyRow);
    } else {
      nextRows = [...table.rows, emptyRow];
    }
    updateTable({ ...table, rows: nextRows });
  };

  const removeRow = (rIdx: number) => {
    if (table.rows.length <= 1) {
      // Clear instead of removing last row
      updateTable({ ...table, rows: [table.headers.map(() => "")] });
      return;
    }
    const nextRows = table.rows.filter((_, i) => i !== rIdx);
    updateTable({ ...table, rows: nextRows });
  };

  const handleApplyPaste = () => {
    if (!pastedText.trim()) return;
    const parsed = parsePastedSpreadsheet(pastedText, table.title);
    updateTable({
      title: table.title || parsed.title,
      headers: parsed.headers,
      rows: parsed.rows
    });
    setPastedText("");
    setShowPasteModal(false);
  };

  const handleApplyTemplate = (tmpl: typeof DEFAULT_TABLE_TEMPLATES[0]) => {
    updateTable({
      title: tmpl.data.title || "",
      headers: [...tmpl.data.headers],
      rows: tmpl.data.rows.map(r => [...r])
    });
    setShowTemplateMenu(false);
  };

  const handleRestoreOriginal = () => {
    if (!originalData) return;
    updateTable({
      title: originalData.title || "",
      headers: [...originalData.headers],
      rows: originalData.rows.map(r => [...r])
    });
  };

  // Compare with original if provided
  const diffResult = originalData ? compareTables(originalData, table) : null;

  const numCols = table.headers.length;
  const defaultMaxWidth = numCols <= 2 ? "max-w-3xl" : numCols <= 3 ? "max-w-4xl" : "max-w-5xl";

  return (
    <div className={cn("space-y-4 w-full", defaultMaxWidth)}>
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Título / Identificação da Tabela
          </label>
          <input
            type="text"
            value={table.title || ""}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ex: Tabela Tarifária - Estrutura de Custos por Faixa de Consumo"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Colar do Excel */}
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
            title="Importar linhas e colunas copiadas diretamente do Excel ou Word"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Colar do Excel/Word</span>
          </button>

          {/* Modelos Prontos (somente se não estiver em modo contribuição) */}
          {!isContributionMode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <Sparkles size={14} className="text-indigo-600" />
                <span>Modelos Prontos</span>
              </button>

              {showTemplateMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowTemplateMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 border-b border-slate-100 mb-1">
                      Selecione um Modelo Regulatório
                    </div>
                    {DEFAULT_TABLE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-50 transition-colors group"
                      >
                        <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                          {tmpl.name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          {tmpl.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Copiar Tabela Atual para Tabela Proposta */}
          {originalData && !isContributionMode && (
            <button
              type="button"
              onClick={handleRestoreOriginal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
              title="Copiar estrutura e dados da tabela atual vigente para esta tabela"
            >
              <Copy size={13} className="text-indigo-600" />
              <span>Copiar Tabela Atual para Tabela Proposta</span>
            </button>
          )}

          {/* Restaurar valores originais (em modo contribuição) */}
          {originalData && isContributionMode && (
            <button
              type="button"
              onClick={handleRestoreOriginal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-all"
              title="Restaurar a tabela exatamente como publicada na minuta"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span>Restaurar Original</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Diff Summary Badge if applicable */}
      {diffResult && diffResult.hasChanges && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>{diffResult.totalChangedCells} célula(s) alterada(s)</strong> em relação à minuta original.
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Diferenças destacadas em verde
          </span>
        </div>
      )}

      {/* Grid Editor */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left border-collapse min-w-[600px]">
            {/* Headers */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="w-12 px-2 py-2 text-center text-[10px] font-bold text-slate-400 border-r border-slate-200 bg-slate-200/50 select-none">
                  #
                </th>
                {table.headers.map((header, cIdx) => (
                  <th key={cIdx} className="px-2 py-2 border-r border-slate-200 group/col relative min-w-[150px]">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(cIdx, e.target.value)}
                        placeholder={`Cabeçalho ${cIdx + 1}`}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                      {!isContributionMode && table.headers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(cIdx)}
                          className="opacity-0 group-hover/col:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all hover:bg-rose-50"
                          title="Excluir coluna"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {!isContributionMode && (
                  <th className="w-16 px-2 py-2 text-center bg-slate-50 select-none">
                    <button
                      type="button"
                      onClick={addColumn}
                      className="px-2 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 flex items-center justify-center gap-1 w-full transition-colors"
                      title="Adicionar nova coluna"
                    >
                      <Plus size={12} /> Coluna
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((row, rIdx) => {
                return (
                  <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors group/row">
                    <td className="w-12 px-2 py-1.5 text-center text-xs font-bold text-slate-400 border-r border-slate-200 bg-slate-50/50 select-none">
                      {rIdx + 1}
                    </td>
                    {table.headers.map((_, cIdx) => {
                      const cellValue = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "";
                      const diffKey = `${rIdx}_${cIdx}`;
                      const isModified = diffResult && diffResult.cellDiffs[diffKey]?.type === "modified";
                      const isAdded = diffResult && diffResult.cellDiffs[diffKey]?.type === "added";
                      const oldVal = diffResult?.cellDiffs[diffKey]?.oldValue;

                      return (
                        <td
                          key={cIdx}
                          className={cn(
                            "px-2 py-1 border-r border-slate-100 relative",
                            (isModified || isAdded) && "bg-emerald-50/80"
                          )}
                        >
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                            placeholder="-"
                            className={cn(
                              "w-full px-2 py-1 bg-transparent border rounded text-xs text-slate-800 outline-none transition-all",
                              isModified || isAdded
                                ? "border-emerald-400 font-bold bg-white/90 shadow-2xs focus:ring-2 focus:ring-emerald-500"
                                : "border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            )}
                          />
                          {isModified && oldVal !== undefined && (
                            <div className="text-[9px] text-rose-600 font-medium px-1 truncate" title={`Antes: ${oldVal}`}>
                              Antes: <span className="line-through">{oldVal}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="w-16 px-2 py-1 text-center bg-slate-50/30">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => addRow(rIdx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Inserir linha abaixo"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(rIdx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Excluir linha"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Button at bottom */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => addRow()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs transition-colors"
          >
            <Plus size={13} className="text-indigo-600" />
            <span>Adicionar Linha</span>
          </button>
          <span className="text-[11px] text-slate-400 font-medium pr-2">
            Total: {table.rows.length} linha(s) × {table.headers.length} coluna(s)
          </span>
        </div>
      </div>

      {/* Paste from Excel / Word Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Colar do Excel / Word / Google Sheets</h3>
                  <p className="text-[11px] text-slate-500">
                    Copie qualquer tabela ou intervalo de células (Ctrl+C) e cole abaixo (Ctrl+V).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={"Categoria\tFaixa\tTarifa Vigente\tTarifa Proposta\nResidencial\t0 a 10\t3,85\t4,15\nResidencial\t11 a 25\t5,90\t6,35"}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none whitespace-pre"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={13} className="text-slate-400 shrink-0" />
                A primeira linha colada será considerada como os cabeçalhos das colunas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setPastedText("");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyPaste}
                disabled={!pastedText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
              >
                <Check size={15} />
                <span>Importar Tabela</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
