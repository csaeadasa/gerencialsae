import React from "react";
import { 
  Plus, Trash2, ArrowUp, ArrowDown, Tag, X, FileText, 
  Table as TableIcon, Copy, FolderTree, AlertTriangle, CheckCircle2, Move
} from "lucide-react";
import { cn } from "../lib/utils";
import { RegulatoryTableEditor } from "./RegulatoryTableEditor";
import { isTableJson, parseTableData, serializeTableData } from "../lib/tableStructure";
import { Article, getDispositivoInfo } from "./TomadaSubsidiosTab";

interface RegulatoryArticlesEditorProps {
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  isAlteracao: boolean;
  subjects: { id: string; name: string }[];
  onOpenSubjectPicker: (index: number) => void;
  // Optional for edit modal (moving multiple)
  selectedArticlesToMove?: (string | number)[];
  setSelectedArticlesToMove?: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  onRemoveArticle?: (index: number, articleId: string | number) => void;
}

export const RegulatoryArticlesEditor: React.FC<RegulatoryArticlesEditorProps> = ({
  articles,
  setArticles,
  isAlteracao,
  subjects,
  onOpenSubjectPicker,
  selectedArticlesToMove = [],
  setSelectedArticlesToMove,
  onRemoveArticle
}) => {
  const insertArticle = (index: number) => {
    const newArts = [...articles];
    const newArticle = {
      id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tomadaId: 0,
      originalText: "",
      proposedText: "",
      order: index + 2,
    };
    newArts.splice(index + 1, 0, newArticle as any);
    setArticles(newArts);
  };

  const moveArticle = (index: number, direction: number) => {
    if (index + direction < 0 || index + direction >= articles.length) return;
    const newArts = [...articles];
    const temp = newArts[index];
    newArts[index] = newArts[index + direction];
    newArts[index + direction] = temp;
    setArticles(newArts);
  };

  const removeArticle = (index: number, id: string | number) => {
    if (onRemoveArticle) {
        onRemoveArticle(index, id);
    } else {
        const newArts = [...articles];
        newArts.splice(index, 1);
        setArticles(newArts);
    }
  };

  if (!articles || articles.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
        Nenhum dispositivo cadastrado.
      </div>
    );
  }

  const handleRepeatProposedAsOriginalAll = () => {
    const updated = articles.map(art => {
      const textToCopy = art.proposedText !== undefined ? art.proposedText : (art.originalText || "");
      return {
        ...art,
        originalText: textToCopy
      };
    });
    setArticles(updated);
  };

  const handleRepeatOriginalAsProposedAll = () => {
    const updated = articles.map(art => ({
      ...art,
      proposedText: art.originalText || ""
    }));
    setArticles(updated);
  };

  return (
    <div className="space-y-4 pr-2 pb-4">
      {isAlteracao && (
        <div className="flex flex-wrap items-center justify-end gap-2 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-slate-500 uppercase mr-auto flex items-center gap-1.5"><Copy size={14}/> Ações em Lote:</span>
          <button
            type="button"
            onClick={handleRepeatProposedAsOriginalAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-sm transition-all"
            title="Copia o texto proposto de cada dispositivo para o campo de texto vigente"
          >
            <Copy size={13} /> Repetir Texto Proposto como Texto Atual
          </button>
          <button
            type="button"
            onClick={handleRepeatOriginalAsProposedAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-sm transition-all"
            title="Copia o texto atual vigente de cada dispositivo para o campo de texto proposto"
          >
            <Copy size={13} /> Repetir Texto Atual como Texto Proposto
          </button>
        </div>
      )}
      <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">
        <button type="button" onClick={() => insertArticle(-1)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all shadow-sm bg-white">
          <Plus size={13} /> Inserir Dispositivo no Topo
        </button>
      </div>
      {articles.map((art, i) => {
        const isMissingOriginal = isAlteracao && (!art.originalText || !art.originalText.trim());
        const dInfo = getDispositivoInfo((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "", i + 1);
        const isSelected = selectedArticlesToMove.includes(art.id as string | number);
        
        return (
          <div 
            key={art.id} 
            className={cn(
              "p-4 rounded-xl relative group transition-all border",
              dInfo.depth === 2 && "sm:ml-4 border-l-4 border-l-teal-500",
              dInfo.depth === 3 && "sm:ml-8 border-l-4 border-l-cyan-500",
              dInfo.depth >= 4 && "sm:ml-12 border-l-4 border-l-sky-500",
              isMissingOriginal ? "bg-amber-50/30 border-amber-300 ring-1 ring-amber-200" : "bg-slate-50 border-slate-200",
              isSelected && "border-amber-400 bg-amber-50/50"
            )}
          >
            <div className="absolute -left-3 top-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
              #{i+1}
            </div>
            <div className="mb-3 pl-3 pr-20 flex items-center gap-2 flex-wrap">
              {setSelectedArticlesToMove && art.id && !String(art.id).startsWith("new_") && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedArticlesToMove(prev => [...prev, art.id as string | number]);
                      } else {
                        setSelectedArticlesToMove(prev => prev.filter(id => id !== art.id));
                      }
                    }}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer mr-1"
                    title="Selecionar para mover"
                  />
              )}
              <span className="text-xs font-black uppercase text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-xs flex items-center gap-1.5">
                {dInfo.isAnnexOrDecimal ? <FolderTree size={12} className="text-teal-600" /> : <FileText size={12} className="text-indigo-600" />}
                {art.contentType === 'ementa' ? 'Ementa' : art.contentType === 'considerandos' ? 'Considerandos' : dInfo.label}
              </span>
              {dInfo.isAnnexOrDecimal && (
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md">
                  {dInfo.sublabel}
                </span>
              )}
              <button type="button" onClick={() => onOpenSubjectPicker(i)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 shrink-0 shadow-2xs active:scale-95">
                <Tag size={12} /> Vincular Assunto
              </button>
              <div className="flex flex-wrap items-center gap-1">
                {(art.subjectIds || []).map(sid => {
                  const s = subjects.find(sub => sub.id === sid);
                  return s ? (
                    <span key={sid} className="inline-flex items-center gap-1 text-[9px] font-medium bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded shadow-2xs">
                      <span className="truncate max-w-[140px]" title={s.name}>{s.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArticles(articles.map((a, idx) => idx === i ? { ...a, subjectIds: (a.subjectIds || []).filter(id => id !== sid) } : a));
                        }}
                        className="text-slate-400 hover:text-rose-600 rounded-full transition-colors"
                        title="Desvincular assunto"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100 p-0.5">
              <button type="button" onClick={() => moveArticle(i, -1)} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent" title="Mover para cima">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => moveArticle(i, 1)} disabled={i === articles.length - 1} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent" title="Mover para baixo">
                <ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => removeArticle(i, art.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Excluir dispositivo">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Formato do Dispositivo:
                </span>
                <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 border border-slate-300/60 flex-wrap gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'text';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      (!art.contentType || art.contentType === 'text')
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Texto Normativo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'ementa';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'ementa'
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Ementa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'considerandos';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'considerandos'
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Considerandos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'table';
                      if (!isTableJson((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText))) {
                        const parsedT = parseTableData((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "Item\tDescrição\tValor\n1\tTarifa Base\t100,00");
                        newArts[i].proposedText = serializeTableData(parsedT);
                      }
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'table'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <TableIcon size={12} /> Tabela
                  </button>
                </div>
              </div>
            </div>
            {art.contentType === 'table' ? (
              <div className="space-y-4">
                {isAlteracao && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Tabela Atual Vigente da Resolução <span className="text-rose-500 font-black">*</span>
                    </label>
                    <RegulatoryTableEditor
                      initialData={parseTableData(art.originalText || "")}
                      onChange={(table) => {
                        const newArts = [...articles];
                        newArts[i].originalText = serializeTableData(table);
                        setArticles(newArts);
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Tabela Proposta (Área Técnica)
                    </label>
                    {isAlteracao && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          newArts[i].proposedText = art.originalText || "";
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                        title="Copiar estrutura e dados da tabela atual vigente para a tabela proposta"
                      >
                        <Copy size={11} /> Copiar Tabela Atual para Tabela Proposta
                      </button>
                    )}
                  </div>
                  <RegulatoryTableEditor
                    initialData={parseTableData((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "")}
                    originalData={isAlteracao && art.originalText ? parseTableData(art.originalText) : undefined}
                    onChange={(table) => {
                      const newArts = [...articles];
                      newArts[i].proposedText = serializeTableData(table);
                      setArticles(newArts);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className={cn("grid gap-4", isAlteracao ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                {isAlteracao && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Texto Atual Vigente da Resolução <span className="text-rose-500 font-black">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          const textToCopy = art.proposedText !== undefined ? art.proposedText : (art.originalText || "");
                          newArts[i].originalText = textToCopy;
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                        title="Copiar texto proposto deste dispositivo para o texto original vigente"
                      >
                        <Copy size={11} /> Repetir Texto Proposto como Texto Atual
                      </button>
                    </div>
                    <textarea 
                      className={cn(
                        "w-full bg-white border rounded-lg p-3 resize-y text-sm font-medium whitespace-pre-wrap transition-all outline-none",
                        isMissingOriginal 
                          ? "border-amber-400 focus:ring-2 focus:ring-amber-300 text-slate-700 bg-amber-50/20" 
                          : "border-slate-200 focus:ring-2 focus:ring-slate-400 text-slate-600"
                      )}
                      value={art.originalText || ""}
                      onChange={e => {
                        const newArts = [...articles];
                        newArts[i].originalText = e.target.value;
                        setArticles(newArts);
                      }}
                      rows={Math.max(12, ((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "").split("\n").length)}
                      placeholder="Insira o texto atual vigente deste dispositivo (obrigatório)..."
                    />
                    {isMissingOriginal && (
                      <p className="text-[10px] text-amber-700 font-bold mt-1">
                        * Campo obrigatório para alteração de norma.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Texto Proposto (Área Técnica)</label>
                    {isAlteracao && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          newArts[i].proposedText = art.originalText || "";
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                        title="Copiar texto atual vigente deste dispositivo para o texto proposto"
                      >
                        <Copy size={11} /> Repetir Texto Atual como Texto Proposto
                      </button>
                    )}
                  </div>
                  <textarea 
                    className="w-full bg-white border border-indigo-200 rounded-lg p-3 resize-y focus:ring-2 focus:ring-indigo-600 text-sm font-medium text-slate-800 whitespace-pre-wrap outline-none"
                    value={art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : (art.originalText || "")}
                    onChange={e => {
                      const newArts = [...articles];
                      newArts[i].proposedText = e.target.value;
                      setArticles(newArts);
                    }}
                    rows={Math.max(12, ((art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "").split("\n").length)}
                    disabled={art.proposedText === ""}
                  />
                  {isAlteracao && (
                    <div className="flex items-center gap-2 mt-2 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                      <input
                        type="checkbox"
                        id={`revoke-${i}`}
                        checked={art.proposedText === ""}
                        onChange={(e) => {
                          const newArts = [...articles];
                          if (e.target.checked) {
                            newArts[i].proposedText = "";
                          } else {
                            newArts[i].proposedText = art.originalText || "";
                          }
                          setArticles(newArts);
                        }}
                        className="w-3.5 h-3.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor={`revoke-${i}`} className="text-[10px] font-bold text-rose-700 uppercase tracking-wider cursor-pointer select-none">
                        Propor revogação / exclusão deste dispositivo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-200/60 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => insertArticle(i)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all shadow-sm bg-white">
                <Plus size={13} /> Inserir Dispositivo Aqui
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
