import React, { useState, useEffect, useMemo } from "react";
import { Plus, Edit3, Trash2, Check, X, FileText, MessageSquare, Save, ArrowLeft, ArrowRight, CornerDownRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Lock, AlertTriangle, RefreshCw, FileCode, PlusCircle, Wrench, Paperclip, Upload, CheckCircle2, ChevronDown, ChevronUp, CheckCircle, Eye, Sparkles, BarChart2, PieChart as PieChartIcon, FileSpreadsheet, Download, ScrollText, Copy, Printer, CheckCheck } from "lucide-react";
import * as XLSX from "xlsx";
import * as diff from "diff";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";


export const getSmartDiff = (oldText: string, newText: string) => {
  const oText = oldText || "";
  const nText = newText || "";
  if (!oText && !nText) return [];
  if (!oText) return [{ added: true, removed: false, value: nText }];
  if (!nText) return [{ added: false, removed: true, value: oText }];

  const oLines = oText.split('\n');
  const nLines = nText.split('\n');
  
  const lineDiffs = diff.diffArrays(oLines, nLines);
  
  let finalDiff: any[] = [];
  
  for (let i = 0; i < lineDiffs.length; i++) {
    const part = lineDiffs[i];
    const isLastPart = (i === lineDiffs.length - 1);
    
    if (!part.added && !part.removed) {
        finalDiff.push({ added: false, removed: false, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
    } else if (part.removed) {
        if (i + 1 < lineDiffs.length && lineDiffs[i+1].added) {
            const addedPart = lineDiffs[i+1];
            const isNextLastPart = (i + 1 === lineDiffs.length - 1);
            
            const oParas = part.value;
            const nParas = addedPart.value;
            
            const maxParas = Math.max(oParas.length, nParas.length);
            for (let j = 0; j < maxParas; j++) {
                const op = oParas[j] || "";
                const np = nParas[j] || "";
                
                const isLastLineInGroup = (j === maxParas - 1);
                const suffix = (isNextLastPart && isLastLineInGroup) ? '' : '\n';
                
                if (!op && !np) {
                    finalDiff.push({ added: false, removed: false, value: suffix });
                    continue; 
                }
                
                if (!op) {
                     finalDiff.push({ added: true, removed: false, value: np + suffix });
                     continue;
                }
                if (!np) {
                     finalDiff.push({ added: false, removed: true, value: op + suffix });
                     continue;
                }
                
                const wd = diff.diffWords(op, np);
                let ua = 0;
                wd.forEach((p: any) => {
                  if (!p.added && !p.removed) {
                    ua += p.value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '').length;
                  }
                });
                const oa = op.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '').length;
                const r = oa > 0 ? ua / oa : 0;
                
                if (oa > 5 && r < 0.35) {
                    finalDiff.push({ added: false, removed: true, value: op + suffix });
                    finalDiff.push({ added: true, removed: false, value: np + suffix });
                } else {
                    if (wd.length > 0) {
                        wd[wd.length - 1].value += suffix;
                    }
                    finalDiff.push(...wd);
                }
            }
            i++;
        } else {
            finalDiff.push({ added: false, removed: true, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
        }
    } else if (part.added) {
        finalDiff.push({ added: true, removed: false, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
    }
  }
  
  return finalDiff;
};

interface TomadaSubsidiosTabProps {
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
}

export interface TomadaSubsidio {
  id: string | number;
  numero: string;
  tipoResolucao?: "nova" | "alteracao";
  meioParticipacao?: "Consulta Pública" | "Tomada de Subsídios" | string;
  title: string;
  objeto: string;
  dataInicio: string;
  dataFim: string;
  createdAt: string;
  anexos?: { id: string | number; name: string; url: string }[];
}

export interface Article {
  id: string | number;
  tomadaId: string | number;
  order: number;
  originalText: string;
  proposedText?: string;
  finalText?: string;
  finalJustification?: string;
}

export interface Contribution {
  id: string | number;
  articleId: string | number;
  userId?: string | number | null;
  authorName: string;
  authorEmail?: string;
  proposedText: string;
  justification: string;
  decision?: string;
  complexity?: string;
  technicalJustification?: string;
  createdAt: string;
}

export const renderDiffInline = (originalText?: string, proposedText?: string) => {
  const orig = (originalText || "").trim();
  const prop = (proposedText !== undefined && proposedText !== null ? proposedText : originalText || "").trim();

  if (!orig && !prop) return <span className="text-slate-400 italic">Sem texto cadastrado</span>;
  if (!orig) return <span className="whitespace-pre-wrap">{prop}</span>;
  if (!prop) return <span className="whitespace-pre-wrap">{orig}</span>;
  if (orig === prop) return <span className="whitespace-pre-wrap">{prop}</span>;

  const diffParts = getSmartDiff(originalText || "", (proposedText !== undefined && proposedText !== null ? proposedText : originalText || ""));
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {diffParts.map((part, pIdx) => {
        if (!part.value.trim()) {
          return <span key={pIdx}>{part.value}</span>;
        }
        if (part.added) {
          return (
            <span
              key={pIdx}
              className="bg-emerald-100 text-emerald-950 font-bold px-1 py-0.5 rounded mx-0.5 border border-emerald-300 inline-block shadow-2xs"
              title="Texto inserido na minuta proposta"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={pIdx}
              className="bg-rose-100 text-rose-950 px-1 py-0.5 rounded mx-0.5 line-through decoration-rose-500 border border-rose-300 inline-block font-medium opacity-90"
              title="Texto excluído da redação vigente"
            >
              {part.value}
            </span>
          );
        }
        return <span key={pIdx}>{part.value}</span>;
      })}
    </span>
  );
};

interface TechnicalAnalysisArticleProps {
  article: Article;
  tipoResolucao?: "nova" | "alteracao";
  contributions: Contribution[];
  handleUpdateAnalysis: (contributionId: string | number, decision: string, complexity: string, technicalJustification: string) => void;
  handleUpdateFinalAnalysis: (articleId: string | number, finalText: string, finalJustification: string) => void;
  handleDeleteArticle?: (articleId: string | number, hasContributions: boolean) => void;
}

interface ContributionAnalysisItemProps {
  c: Contribution;
  article: Article;
  handleUpdateAnalysis: (contributionId: string | number, decision: string, complexity: string, technicalJustification: string) => void;
}

const ContributionAnalysisItem: React.FC<ContributionAnalysisItemProps> = ({ c, article, handleUpdateAnalysis }) => {
  const originalText = article.proposedText || article.originalText || "";
  const diffParts = getSmartDiff(originalText, c.proposedText);
  
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [decision, setDecision] = useState(c.decision || "");
  const [complexity, setComplexity] = useState(c.complexity || "");
  const [technicalJustification, setTechnicalJustification] = useState(c.technicalJustification || "");

  useEffect(() => {
    setDecision(c.decision || "");
    setComplexity(c.complexity || "");
    setTechnicalJustification(c.technicalJustification || "");
  }, [c]);

  const handleSuggestAI = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/reg/ai/analyze-contribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText,
          proposedText: c.proposedText,
          userJustification: c.justification
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDecision(data.decision || "Retida para Estudos Adicionais");
        setComplexity(data.complexity || "Média");
        setTechnicalJustification(data.technicalJustification || "");
        setIsEditingAnalysis(true);
      }
    } catch (e) {
      console.error("AI suggestion failed", e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = () => {
    handleUpdateAnalysis(c.id, decision, complexity, technicalJustification);
    setIsEditingAnalysis(false);
  };

  const handleCancel = () => {
    setDecision(c.decision || "");
    setComplexity(c.complexity || "");
    setTechnicalJustification(c.technicalJustification || "");
    setIsEditingAnalysis(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
            {c.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-slate-700">{c.authorName}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
          {isEditingAnalysis ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Complexidade:</span>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border outline-none cursor-pointer border-slate-300 text-slate-700 bg-white"
                >
                  <option value="" disabled>Selecionar...</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parecer Técnico:</span>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border outline-none cursor-pointer border-slate-300 text-slate-700 bg-white"
                >
                  <option value="" disabled>Selecionar...</option>
                  <option value="Acatada">Acatada</option>
                  <option value="Acatada Parcialmente">Acatada Parcialmente</option>
                  <option value="Não Acatada">Não Acatada</option>
                  <option value="Prejudicada">Prejudicada</option>
                  <option value="Retida para Estudos Adicionais">Retida para Estudos Adicionais</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {c.complexity && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Complexidade:</span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-2 py-1 bg-slate-100 rounded border border-slate-200">{c.complexity}</span>
                </div>
              )}
              {c.decision && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parecer:</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border",
                    c.decision === "Acatada" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    c.decision === "Acatada Parcialmente" ? "bg-amber-100 text-amber-800 border-amber-300" :
                    c.decision === "Não Acatada" ? "bg-rose-100 text-rose-800 border-rose-300" :
                    c.decision === "Prejudicada" ? "bg-slate-200 text-slate-700 border-slate-400" :
                    c.decision === "Retida para Estudos Adicionais" ? "bg-indigo-100 text-indigo-800 border-indigo-300" :
                    "bg-slate-100 text-slate-600 border-slate-300"
                  )}>
                    {c.decision}
                  </span>
                </div>
              )}
            </>
          )}
          
          {isEditingAnalysis ? (
            <div className="flex items-center gap-1">
              <button onClick={handleCancel} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Cancelar">
                <X size={16} />
              </button>
              <button onClick={handleSave} className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors" title="Salvar">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleSuggestAI} disabled={isGeneratingAI} className="p-1.5 text-indigo-500 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50" title="Sugerir Análise com IA">
                <Sparkles size={14} className={isGeneratingAI ? "animate-pulse" : ""} /> {isGeneratingAI ? "Gerando..." : "IA"}
              </button>
              <button onClick={() => setIsEditingAnalysis(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" title="Editar Análise">
                <Edit3 size={14} /> Análise
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-4">
          <span className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Texto da Contribuição Sugerida (Com destaques)</span>
          <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
            {diffParts.map((part, pIdx) => {
              if (part.added) {
                return <span key={pIdx} className="bg-emerald-100 text-emerald-950 font-bold px-1 rounded mx-0.5 border border-emerald-300">{part.value}</span>;
              }
              if (part.removed) {
                return <span key={pIdx} className="bg-rose-100 text-rose-950 px-1 rounded mx-0.5 line-through decoration-rose-500 border border-rose-300">{part.value}</span>;
              }
              return <span key={pIdx}>{part.value}</span>;
            })}
          </div>
        </div>
        <div className="p-4 bg-slate-50 flex flex-col gap-4">
          <div>
            <span className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Justificativa do Participante</span>
            <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {c.justification}
            </div>
          </div>
          
          {(isEditingAnalysis || technicalJustification || c.technicalJustification) && (
            <div className="pt-4 border-t border-slate-200">
              <span className="block text-xs font-black text-indigo-600 uppercase tracking-wider mb-3">Justificativa Técnica (Resposta)</span>
              {isEditingAnalysis ? (
                <textarea
                  value={technicalJustification}
                  onChange={(e) => setTechnicalJustification(e.target.value)}
                  rows={6}
                  className="w-full bg-white px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
                  placeholder="Insira a justificativa técnica para esta contribuição..."
                />
              ) : (
                <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                  {c.technicalJustification}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TechnicalAnalysisArticle: React.FC<TechnicalAnalysisArticleProps> = ({ article, tipoResolucao, contributions, handleUpdateAnalysis, handleUpdateFinalAnalysis, handleDeleteArticle }) => {
  const [finalText, setFinalText] = useState(article.finalText || "");
  const [finalJustification, setFinalJustification] = useState(article.finalJustification || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [repeatProposed, setRepeatProposed] = useState(false);

  const prevContributionsRef = React.useRef<string>("");

  useEffect(() => {
    // Check if decisions changed to auto-fill text
    const currentDecisions = contributions.map(c => `${c.id}:${c.decision}`).join('|');
    
    if (prevContributionsRef.current !== "" && prevContributionsRef.current !== currentDecisions) {
      const acatadas = contributions.filter(c => c.decision === "Acatada");
      const todasNaoAcatadas = contributions.length > 0 && contributions.every(c => 
        c.decision === "Não Acatada" || 
        c.decision === "Prejudicada" || 
        c.decision === "Retida para Estudos Adicionais"
      );

      let newFinalText = finalText;
      let shouldUpdate = false;

      if (acatadas.length === 1) {
        newFinalText = acatadas[0].proposedText || "";
        shouldUpdate = true;
      } else if (acatadas.length > 1) {
        newFinalText = acatadas.map(c => c.proposedText).filter(Boolean).join("\n\n");
        shouldUpdate = true;
      } else if (todasNaoAcatadas) {
        newFinalText = article.proposedText || article.originalText || "";
        shouldUpdate = true;
      } else {
        newFinalText = "";
        shouldUpdate = true;
      }

      if (shouldUpdate && newFinalText !== finalText) {
        setFinalText(newFinalText);
        handleUpdateFinalAnalysis(article.id, newFinalText, finalJustification);
      }
    }
    
    prevContributionsRef.current = currentDecisions;
  }, [contributions, article.id, article.proposedText, article.originalText, finalJustification, handleUpdateFinalAnalysis, finalText]);

  useEffect(() => {
    setFinalText(article.finalText || "");
    setFinalJustification(article.finalJustification || "");
    setRepeatProposed(false);
  }, [article.finalText, article.finalJustification]);

  const handleSuggestAI = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/reg/ai/analyze-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: article.proposedText || article.originalText || "",
          contributions
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFinalText(data.finalText || "");
        setFinalJustification(data.finalJustification || "");
        setIsEditing(true);
      }
    } catch (e) {
      console.error("AI article suggestion failed", e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const onSave = () => {
    handleUpdateFinalAnalysis(article.id, finalText, finalJustification);
    setIsEditing(false);
  };

  const isFullyAnalyzed = contributions.length > 0 && contributions.every(c => c.decision);

  return (
    <div className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden mb-6 transition-all", isFullyAnalyzed ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-slate-200")}>
      {/* Cabeçalho do Dispositivo */}
      <div className={cn("border-b p-4 flex flex-col md:flex-row md:items-start justify-between gap-4", isFullyAnalyzed ? "bg-emerald-50/50 border-emerald-100" : "bg-slate-50 border-slate-200")}>
        <div className="flex-1 space-y-4">
          {tipoResolucao === "alteracao" && article.originalText && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                  Texto Atual (Vigente)
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium whitespace-pre-wrap leading-relaxed bg-slate-100 p-3 rounded-xl border border-slate-200">
                {article.originalText}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                Texto Proposto em Consulta (Minuta)
              </span>
              {isFullyAnalyzed && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={12} /> Totalmente Analisado
                </span>
              )}
            </div>
            <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              {tipoResolucao === "alteracao" && article.originalText
                ? renderDiffInline(article.originalText, article.proposedText)
                : (article.proposedText !== undefined ? article.proposedText : article.originalText)}
            </div>
          </div>
        </div>
        {handleDeleteArticle && (
          <div className="shrink-0 flex self-start mt-2 md:mt-0">
            <button
              onClick={() => handleDeleteArticle(article.id, contributions.length > 0)}
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-rose-200 shadow-sm"
              title="Excluir dispositivo e contribuições associadas"
            >
              <Trash2 size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block">Excluir</span>
            </button>
          </div>
        )}
      </div>

      {/* Lista de Contribuições */}
      <div className="p-4 space-y-4">
        <div className="inline-flex items-center mb-1 bg-slate-200/70 px-3.5 py-2 rounded-lg">
          <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-0">Contribuições Recebidas ({contributions.length})</h5>
        </div>
        
        {contributions.length === 0 ? (
          <div className="text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 italic">
            Nenhuma contribuição recebida para este dispositivo.
          </div>
        ) : (
          contributions.map(c => (
            <ContributionAnalysisItem 
              key={c.id} 
              c={c} 
              article={article} 
              handleUpdateAnalysis={handleUpdateAnalysis} 
            />
          ))
        )}
      </div>

      {/* Parecer Final do Dispositivo */}
      <div className="bg-indigo-50/50 border-t border-indigo-100 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center bg-indigo-100 px-3.5 py-2 rounded-lg">
            <h5 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 mb-0">
              <CheckCircle2 size={16} className="text-indigo-600" /> Redação Final Após Análise
            </h5>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button onClick={handleSuggestAI} disabled={isGeneratingAI} className="p-1 text-[10px] font-bold uppercase tracking-wider text-indigo-50 hover:text-white bg-indigo-500 rounded hover:bg-indigo-600 transition-colors flex items-center gap-1 disabled:opacity-50">
                <Sparkles size={12} className={isGeneratingAI ? "animate-pulse" : ""} /> {isGeneratingAI ? "Gerando..." : "IA"}
              </button>
              <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                {article.finalText || article.finalJustification ? "Editar Parecer" : "Adicionar Parecer"}
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-100/60">
              <input
                type="checkbox"
                id={`repeat-${article.id}`}
                checked={repeatProposed}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRepeatProposed(checked);
                  if (checked) {
                    setFinalText(article.proposedText !== undefined ? article.proposedText : (article.originalText || ""));
                    setFinalJustification("Texto Final do Dispositivo igual ao Texto Proposto em Consulta. Sem contribuições recebidas");
                  } else {
                    setFinalText(article.finalText || "");
                    setFinalJustification(article.finalJustification || "");
                  }
                }}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
              />
              <label htmlFor={`repeat-${article.id}`} className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                Repetir Texto Proposto como Texto Final?
              </label>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Texto Final do Dispositivo</label>
              <textarea
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                rows={10}
                className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800 font-medium"
                placeholder="Insira como ficará o texto final..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-widest mb-2">Justificativa Técnica Final</label>
              <textarea
                value={finalJustification}
                onChange={(e) => setFinalJustification(e.target.value)}
                rows={6}
                className="w-full bg-white px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
                placeholder="Insira as considerações técnicas da ADASA sobre o aceite ou não das contribuições..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setIsEditing(false); setFinalText(article.finalText || ""); setFinalJustification(article.finalJustification || ""); }} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
                Cancelar
              </button>
              <button onClick={onSave} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
                <Save size={14} /> Salvar Parecer
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Texto Final do Dispositivo</span>
              {article.finalText ? (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium whitespace-pre-wrap shadow-2xs">
                  {article.finalText}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Pendente...</div>
              )}
            </div>
            <div>
              <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Justificativa Técnica Final</span>
              {article.finalJustification ? (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 text-xs text-slate-700 whitespace-pre-wrap shadow-2xs">
                  {article.finalJustification}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">Pendente...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TomadaSubsidiosTab: React.FC<TomadaSubsidiosTabProps> = ({ showToast, currentUser }) => {
  const auth = useAuth();
  const effectiveUser = currentUser || auth?.currentUser;

  const canCreateSubsidios = auth?.checkPermission ? auth.checkPermission("reg_subsidios", "create") : true;
  const canEditSubsidios = auth?.checkPermission ? auth.checkPermission("reg_subsidios", "edit") : true;
  const canDeleteSubsidios = auth?.checkPermission ? auth.checkPermission("reg_subsidios", "delete") : true;
  const canViewPainel = auth?.checkPermission ? auth.checkPermission("reg_subsidios_painel", "view") : true;
  const canViewAnalise = auth?.checkPermission ? auth.checkPermission("reg_subsidios_analise", "view") : true;
  const canEditAnalise = auth?.checkPermission ? auth.checkPermission("reg_subsidios_analise", "edit") : true;
  const canViewMinuta = auth?.checkPermission ? auth.checkPermission("reg_subsidios_minuta", "view") : true;
  const canViewPortal = auth?.checkPermission ? auth.checkPermission("reg_subsidios_portal", "view") : true;
  const canContribute = auth?.checkPermission ? auth.checkPermission("reg_subsidios_portal", "create") : true;

  const [tomadas, setTomadas] = useState<TomadaSubsidio[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [activeView, setActiveView] = useState<"list" | "create_step1" | "create_step2" | "public_view" | "public_contribute" | "public_contributions" | "technical_analysis">("list");
  const [publicTab, setPublicTab] = useState<"contribuir" | "ver">("contribuir");
  const [analysisTab, setAnalysisTab] = useState<"contribuicoes" | "painel" | "minuta">("contribuicoes");
  const [expandedRowArtId, setExpandedRowArtId] = useState<string | number | null>(null);
  const [selectedTomada, setSelectedTomada] = useState<TomadaSubsidio | null>(null);
  const [participantRankingViewMode, setParticipantRankingViewMode] = useState<"chart" | "bento">("bento");


  // Minuta da Norma State
  const minutaModel = selectedTomada?.tipoResolucao === "alteracao" ? "alteracao" : "nova";
  const [minutaTipoAto, setMinutaTipoAto] = useState<string>("RESOLUÇÃO");
  const [minutaNumero, setMinutaNumero] = useState<string>("65");
  const [minutaData, setMinutaData] = useState<string>(() => {
    const today = new Date();
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const dia = String(today.getDate()).padStart(2, "0");
    const mes = meses[today.getMonth()];
    const ano = today.getFullYear();
    return `${dia} DE ${mes} DE ${ano}`;
  });
  const [minutaEmenta, setMinutaEmenta] = useState<string>("");
  const [minutaProcessoSEI, setMinutaProcessoSEI] = useState<string>("00197-00000724/2025-51");
  const [minutaResolucoesAlteradas, setMinutaResolucoesAlteradas] = useState<string>("Resolução nº 03, de 13 de abril de 2012");
  const [minutaConsiderandos, setMinutaConsiderandos] = useState<string>(
    "Considerando os dispositivos da Lei nº 11.445, de 5 de janeiro de 2007 que estabelece as diretrizes nacionais para o saneamento básico;\nConsiderando a competência regulatória e fiscalizatória atribuída a esta Agência Reguladora nos termos da Lei Distrital nº 4.285, de 26 de dezembro de 2008;\nConsiderando as contribuições recebidas e acatadas no âmbito da Consulta Pública / Tomada de Subsídios;"
  );
  const [minutaVigencia, setMinutaVigencia] = useState<string>("Esta Resolução entra em vigor na data de sua publicação.");
  const [minutaAssinante, setMinutaAssinante] = useState<string>("RAIMUNDO RIBEIRO");
  const [minutaCopied, setMinutaCopied] = useState<boolean>(false);
  const [minutaClassificationOverrides, setMinutaClassificationOverrides] = useState<Record<string | number, "acrescido" | "alterado">>({});
  const [minutaSubunitOverrides, setMinutaSubunitOverrides] = useState<Record<string, "acrescido" | "alterado" | "ignorar">>({});
  const [showGranularBreakdown, setShowGranularBreakdown] = useState<boolean>(true);

  // Create Form State
  const [formData, setFormData] = useState<{
    numero: string;
    tipoResolucao: "nova" | "alteracao";
    meioParticipacao: string;
    title: string;
    objeto: string;
    dataInicio: string;
    dataFim: string;
    rawText: string;
    anexos: File[];
  }>({
    numero: "",
    tipoResolucao: "nova",
    meioParticipacao: "Consulta Pública",
    title: "",
    objeto: "",
    dataInicio: "",
    dataFim: "",
    rawText: "",
    anexos: []
  });
  const [previewArticles, setPreviewArticles] = useState<Article[]>();
  
  const [extractedArticles, setExtractedArticles] = useState<string[]>([]);
  const [selectedExtractedArticles, setSelectedExtractedArticles] = useState<boolean[]>([]);
  const [isExtractingText, setIsExtractingText] = useState(false);

  const handleExtractText = async (file: File) => {
    setIsExtractingText(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        throw new Error(`Erro do servidor: ${res.status}`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta inválida do servidor.");
      }

      const data = await res.json();
      if (data.success && data.text) {
        const text = data.text as string;
        
        // Regex to identify articles (Art. 1, Art 1º, etc.)
        const articleRegex = /(?:^|\n)(Art\.\s*[\d]+[ºo]?\.*?[\s\S]*?)(?=\nArt\.\s*[\d]+[ºo]?\.?|$)/gi;
        const matches = [...text.matchAll(articleRegex)];
        
        if (matches.length > 0) {
          const articles = matches.map(m => m[1].trim());
          setExtractedArticles(articles);
          setSelectedExtractedArticles(articles.map(() => true)); // Select all by default
          showToast("Extração Concluída", `Foram identificados ${articles.length} artigos no documento.`, "success");
        } else {
          showToast("Nenhum Artigo", "Nenhum artigo encontrado no documento. O texto completo foi carregado.", "info");
          setFormData(prev => ({ ...prev, rawText: text }));
        }
      } else {
        showToast("Erro na Extração", data.error || "Erro ao extrair texto", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao processar documento", "error");
    } finally {
      setIsExtractingText(false);
    }
  };

  const handleLoadSelectedArticles = () => {
    const selectedText = extractedArticles.filter((_, i) => selectedExtractedArticles[i]).join("\n\n");
    setFormData(prev => ({ ...prev, rawText: prev.rawText ? prev.rawText + "\n\n" + selectedText : selectedText }));
    setExtractedArticles([]);
    setSelectedExtractedArticles([]);
    showToast("Sucesso", "Artigos carregados na minuta.", "success");
  };

  useEffect(() => {
    fetchTomadas();
  }, []);

  useEffect(() => {
    if (selectedTomada && selectedTomada.id) {
      fetchTomadaDetails(String(selectedTomada.id));
    }
  }, [selectedTomada?.id]);

  const normalizeTomada = (t: any): TomadaSubsidio => {
    const dInicio = t.dataInicio || t.datainicio || t.data_inicio || "";
    const dFim = t.dataFim || t.datafim || t.data_fim || "";
    const cAt = t.createdAt || t.createdat || t.created_at || "";
    return {
      ...t,
      id: t.id,
      numero: t.numero || "",
      tipoResolucao: t.tipoResolucao || t.tipo_resolucao || "nova",
      meioParticipacao: t.meioParticipacao || t.meio_participacao || "Consulta Pública",
      title: t.title || "",
      objeto: t.objeto || "",
      dataInicio: typeof dInicio === "string" ? dInicio.split("T")[0] : "",
      dataFim: typeof dFim === "string" ? dFim.split("T")[0] : "",
      createdAt: typeof cAt === "string" ? cAt : "",
      anexos: t.anexos || []
    };
  };

  const formatDateBr = (dateStr?: string): string => {
    if (!dateStr || dateStr.trim() === "") return "-";
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y && m && d && !isNaN(Number(y)) && !isNaN(Number(m)) && !isNaN(Number(d))) {
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  const fetchTomadas = async () => {
    try {
      const res = await fetch('/api/reg/tomadas');
      if (res.ok) {
        const data = await res.json();
        const normalized = Array.isArray(data) ? data.map(normalizeTomada) : [];
        setTomadas(normalized);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTomadaDetails = async (id: string) => {
    try {
      const [artRes, contRes] = await Promise.all([
        fetch(`/api/reg/tomadas/${id}/articles`),
        fetch(`/api/reg/tomadas/${id}/contributions`)
      ]);
      
      if (artRes.ok && contRes.ok) {
        const arts = await artRes.json();
        const conts = await contRes.json();
        setArticles(arts);
        setContributions(conts);
      }
    } catch (e) {
      console.error(e);
    }
  };


  const getNextSequentialNumber = (meio: string, list: TomadaSubsidio[] = tomadas): string => {
    const currentYear = new Date().getFullYear();
    const isTS = meio === "Tomada de Subsídios" || meio === "TS";
    const prefix = isTS ? "TS" : "CP";
    
    let maxNumber = 0;
    
    list.forEach(t => {
      const tMeio = t.meioParticipacao || "Consulta Pública";
      const isTargetType = isTS 
        ? (tMeio === "Tomada de Subsídios" || (t.numero && t.numero.trim().toUpperCase().startsWith("TS")))
        : (tMeio === "Consulta Pública" || (t.numero && t.numero.trim().toUpperCase().startsWith("CP")));
      
      if (isTargetType && t.numero) {
        const match = t.numero.match(/(?:CP|TS)?\s*(\d+)\s*\/\s*(\d{4})/i);
        if (match) {
          const num = parseInt(match[1], 10);
          const year = parseInt(match[2], 10);
          if (year === currentYear && !isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    const nextSeq = maxNumber + 1;
    return `${prefix} ${nextSeq}/${currentYear}`;
  };

  const handleOpenCreate = () => {
    const defaultMeio = "Consulta Pública";
    const autoNumero = getNextSequentialNumber(defaultMeio, tomadas);
    setFormData({
      numero: autoNumero,
      meioParticipacao: defaultMeio,
      title: "",
      objeto: "",
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: "",
      rawText: "",
      anexos: []
    });
    setPreviewArticles([]);
    setActiveView("create_step1");
  };

  // Contribution State
  const [contributingArticleId, setContributingArticleId] = useState<string | null>(null);
  const [editingContributionId, setEditingContributionId] = useState<string | number | null>(null);
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [publicContributionsView, setPublicContributionsView] = useState<"minhas" | "todas">("minhas");
  const [contributionsSortConfig, setContributionsSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [proposedText, setProposedText] = useState("");
  const [isSuppressing, setIsSuppressing] = useState(false);
  const [justification, setJustification] = useState("");
  const [contributeArticleFilter, setContributeArticleFilter] = useState<"todos" | "com_contribuicao" | "sem_contribuicao">("todos");
  const [analysisArticleFilter, setAnalysisArticleFilter] = useState<"todos" | "analisados" | "pendentes">("todos");
  const [expandedUserContribs, setExpandedUserContribs] = useState<Record<string, boolean>>({});
  const [sessionContribArticleIds, setSessionContribArticleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sgi_session_contributions");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const getUserContributionsForArticle = (articleId: string | number): Contribution[] => {
    const sId = String(articleId);
    const currentUserId = effectiveUser?.id ? String(effectiveUser.id) : null;
    const authorName = (effectiveUser?.name || effectiveUser?.email || "").toLowerCase().trim();
    return contributions.filter(c => {
      if (String(c.articleId) !== sId) return false;
      
      if (currentUserId && c.userId !== undefined && c.userId !== null && String(c.userId) === currentUserId) return true;
      if (authorName && (c.authorName || "").toLowerCase().trim() === authorName) return true;
      if (!currentUserId && !authorName && sessionContribArticleIds.includes(sId) && (!c.userId || c.authorName === "Usuário")) return true;
      
      return false;
    });
  };

  const getUserContributionForArticle = (articleId: string | number): Contribution | null => {
    const list = getUserContributionsForArticle(articleId);
    return list.length > 0 ? list[0] : null;
  };

  const isUserContributedArticle = (articleId: string | number): boolean => {
    return getUserContributionsForArticle(articleId).length > 0;
  };

  const toggleExpandUserContrib = (articleId: string | number) => {
    const sId = String(articleId);
    setExpandedUserContribs(prev => ({ ...prev, [sId]: !prev[sId] }));
  };

  // Edit Modal State
  const [editingTomada, setEditingTomada] = useState<TomadaSubsidio | null>(null);
  const [editModalTab, setEditModalTab] = useState<"geral" | "minuta" | "anexos">("geral");
  const [showOrientacoesModal, setShowOrientacoesModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: "" as string | number,
    numero: "",
    tipoResolucao: "nova" as "nova" | "alteracao",
    meioParticipacao: "Consulta Pública",
    title: "",
    objeto: "",
    dataInicio: "",
    dataFim: ""
  });
  const [editArticles, setEditArticles] = useState<Article[]>([]);
  const [editAnexos, setEditAnexos] = useState<{ id: string | number; name: string; url: string }[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirmation Modal State (Safe for Sandboxed iFrames)
  const [deletingTomada, setDeletingTomada] = useState<TomadaSubsidio | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<{ id: string | number, hasContributions: boolean } | null>(null);
  const [deletingContribution, setDeletingContribution] = useState<{ contribId: string | number, articleId: string | number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMeio, setFilterMeio] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [sortConfig, setSortConfig] = useState<{ key: keyof TomadaSubsidio | "status"; direction: "asc" | "desc" }>({ key: "dataInicio", direction: "desc" });

  const getStatus = (dataInicio?: string, dataFim?: string) => {
    if (!dataInicio || !dataFim) return "Fechada";
    const today = new Date().toISOString().split('T')[0];
    const start = dataInicio.split("T")[0];
    const end = dataFim.split("T")[0];
    if (today >= start && today <= end) return "Aberta (Contribuir)";
    return "Fechada";
  };

  const filteredTomadas = useMemo(() => {
    return tomadas.filter(tomada => {
      const term = searchQuery.toLowerCase();
      const tipoLabel = tomada.tipoResolucao === "alteracao" ? "alteração de norma" : "nova norma";
      const matchSearch = 
        tomada.numero.toLowerCase().includes(term) ||
        (tomada.meioParticipacao || "").toLowerCase().includes(term) ||
        (tomada.tipoResolucao || "").toLowerCase().includes(term) ||
        tipoLabel.includes(term) ||
        tomada.title.toLowerCase().includes(term) ||
        tomada.objeto.toLowerCase().includes(term);
      const status = getStatus(tomada.dataInicio, tomada.dataFim);
      const matchStatus = filterStatus === "TODOS" || status === filterStatus;
      const matchMeio = filterMeio === "TODOS" || (tomada.meioParticipacao || "Tomada de Subsídios") === filterMeio;
      return matchSearch && matchStatus && matchMeio;
    });
  }, [tomadas, searchQuery, filterStatus, filterMeio]);

  const sortedFilteredTomadas = useMemo(() => {
    return [...filteredTomadas].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dirMultiplier = direction === "asc" ? 1 : -1;
      
      let valA = "";
      let valB = "";
      
      if (key === "status") {
        valA = getStatus(a.dataInicio, a.dataFim);
        valB = getStatus(b.dataInicio, b.dataFim);
      } else if (key === "dataInicio" || key === "dataFim" || key === "createdAt") {
        valA = (a[key as keyof TomadaSubsidio] || "").toString();
        valB = (b[key as keyof TomadaSubsidio] || "").toString();
        if (valA && valB) {
          const timeA = new Date(valA).getTime();
          const timeB = new Date(valB).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            return (timeA - timeB) * dirMultiplier;
          }
        }
      } else {
        valA = (a[key as keyof TomadaSubsidio] || "").toString().toLowerCase();
        valB = (b[key as keyof TomadaSubsidio] || "").toString().toLowerCase();
      }

      if (valA < valB) return -1 * dirMultiplier;
      if (valA > valB) return 1 * dirMultiplier;
      return 0;
    });
  }, [filteredTomadas, sortConfig]);

  const handleSort = (key: keyof TomadaSubsidio | "status") => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  };

  const getSortIcon = (key: keyof TomadaSubsidio | "status") => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="text-slate-300 ml-1" />;
    return sortConfig.direction === "asc" ? <ArrowUp size={12} className="text-indigo-600 ml-1" /> : <ArrowDown size={12} className="text-indigo-600 ml-1" />;
  };

  // Parsing Logic (Regex to split articles)
  const parseRawTextToArticles = (text: string) => {
    // Regex for capturing "Art. X", "Artigo X", etc.
    const articleRegex = /(Art\.\s*\d+º?|Artigo\s*\d+º?)/gi;
    
    // Split text by the article pattern
    const parts = text.split(articleRegex);
    const newArticles: Article[] = [];
    
    let order = 1;

    // Helper to extract structural headers (TÍTULO, CAPÍTULO, SEÇÃO) from the end of a text block
    const extractHeadersFromEnd = (textBlock: string) => {
      const headerRegex = /(?:^|\n[ \t]*\n)[ \t]*(TÍTULO|CAPÍTULO|SEÇÃO|SECAO|SUBSEÇÃO|SUBSECAO)[ \t]+[IVXLCDM\d]+/i;
      const match = headerRegex.exec(textBlock);
      
      if (match) {
        const keywordIndex = textBlock.indexOf(match[1], match.index);
        let lineStartIndex = keywordIndex;
        while (lineStartIndex > 0 && textBlock[lineStartIndex - 1] !== '\n') {
          lineStartIndex--;
        }
        return {
          remainingText: textBlock.substring(0, lineStartIndex),
          headers: textBlock.substring(lineStartIndex)
        };
      }
      return { remainingText: textBlock, headers: "" };
    };

    let preamble = parts[0] || "";
    let pendingHeaders = "";

    const preambleExtraction = extractHeadersFromEnd(preamble);
    preamble = preambleExtraction.remainingText.trim();
    pendingHeaders = preambleExtraction.headers.trim();

    if (preamble !== "") {
      newArticles.push({
        id: crypto.randomUUID(),
        tomadaId: "",
        order: order++,
        originalText: "", proposedText: preamble
      });
    }

    for (let i = 1; i < parts.length; i += 2) {
      const artHeader = parts[i];
      let artBody = parts[i + 1] || "";
      
      const bodyExtraction = extractHeadersFromEnd(artBody);
      artBody = bodyExtraction.remainingText.trimEnd();
      
      let fullText = artHeader + artBody;
      if (pendingHeaders) {
         fullText = pendingHeaders + "\n\n" + fullText;
      }
      
      newArticles.push({
        id: crypto.randomUUID(),
        tomadaId: "",
        order: order++,
        originalText: "", proposedText: fullText.trim()
      });

      pendingHeaders = bodyExtraction.headers.trim();
    }

    // Append any trailing headers to the last article just in case
    if (pendingHeaders && newArticles.length > 0) {
       newArticles[newArticles.length - 1].proposedText += "\n\n" + pendingHeaders;
    }

    return newArticles;
  };

  const movePreviewArticle = (index: number, direction: number) => {
    if (!previewArticles) return;
    const newArts = [...previewArticles];
    if (index + direction >= 0 && index + direction < newArts.length) {
      const temp = newArts[index];
      newArts[index] = newArts[index + direction];
      newArts[index + direction] = temp;
      newArts.forEach((art, idx) => { art.order = idx + 1; });
      setPreviewArticles(newArts);
    }
  };

  const insertPreviewArticle = (index: number) => {
    if (!previewArticles) return;
    const newArts = [...previewArticles];
    const newArticle = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      tomadaId: 0,
      originalText: "",
      proposedText: "",
      order: index + 2,
    };
    newArts.splice(index + 1, 0, newArticle as any);
    newArts.forEach((art, idx) => { art.order = idx + 1; });
    setPreviewArticles(newArts);
  };
  
  const removePreviewArticle = (index: number) => {
    if (!previewArticles) return;
    const newArts = [...previewArticles];
    newArts.splice(index, 1);
    newArts.forEach((art, idx) => { art.order = idx + 1; });
    setPreviewArticles(newArts);
  };

  const handleRepeatProposedAsOriginal = () => {
    if (!previewArticles || previewArticles.length === 0) return;
    const updated = previewArticles.map(art => {
      const textToCopy = (art.proposedText !== undefined && art.proposedText !== null && art.proposedText !== "")
        ? art.proposedText
        : (art.originalText || "");
      return {
        ...art,
        originalText: textToCopy
      };
    });
    setPreviewArticles(updated);
    showToast("Texto Replicado", "O texto proposto foi replicado como texto original vigente em todos os dispositivos.", "success");
  };

  const handleProcessText = () => {
    if (!formData.title.trim()) {
      showToast("Aviso", "Preencha o título da Participação Social.", "warning");
      return;
    }
    if (!formData.rawText.trim()) {
      showToast("Aviso", "Cole o texto da minuta para processar.", "warning");
      return;
    }

    const parsed = parseRawTextToArticles(formData.rawText);
    setPreviewArticles(parsed);
    setActiveView("create_step2");
  };

  const handleSaveTomada = async () => {
    if (formData.tipoResolucao === "alteracao") {
      const emptyOriginalArticles = (previewArticles || []).filter(
        art => !art.originalText || !art.originalText.trim()
      );
      if (emptyOriginalArticles.length > 0) {
        showToast(
          "Campo Obrigatório",
          `No modelo de Alteração de Norma Existente, é obrigatório preencher o Texto Atual Vigente da Resolução em todos os dispositivos (${emptyOriginalArticles.length} pendente(s)). Utilize o botão "Repetir Texto Proposto como Texto Original" no topo caso deseje preencher automaticamente.`,
          "warning"
        );
        return;
      }
    }

    const anexosMapped = formData.anexos.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      url: URL.createObjectURL(f)
    }));

    const autoNumero = formData.numero || getNextSequentialNumber(formData.meioParticipacao || "Consulta Pública", tomadas);

    const newTomada = {
      id: crypto.randomUUID(),
      numero: autoNumero,
      tipoResolucao: formData.tipoResolucao,
      meioParticipacao: formData.meioParticipacao || "Consulta Pública",
      title: formData.title,
      objeto: formData.objeto,
      dataInicio: formData.dataInicio || new Date().toISOString().split('T')[0],
      dataFim: formData.dataFim || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      anexos: anexosMapped,
      articles: previewArticles?.map(a => ({ ...a, tomadaId: "" })) || []
    };
    
    newTomada.articles = newTomada.articles.map((a: any) => ({ ...a, tomadaId: newTomada.id }));

    try {
      const res = await fetch('/api/reg/tomadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTomada)
      });
      
      if (res.ok) {
        setFormData({
          numero: "",
          meioParticipacao: "Consulta Pública",
          title: "",
          objeto: "",
          dataInicio: "",
          dataFim: "",
          rawText: "",
          anexos: []
        });
        setPreviewArticles([]);
        setActiveView("list");
        showToast("Sucesso", "Participação Social publicada com sucesso!", "success");
        fetchTomadas();
      } else {
        showToast("Erro", "Falha ao publicar", "error");
      }
    } catch (e) {
      showToast("Erro", "Erro no servidor", "error");
    }
  };

  const handleOpenEdit = async (tomada: TomadaSubsidio, e?: React.MouseEvent, defaultTab: "geral" | "minuta" | "anexos" = "geral") => {
    if (e) e.stopPropagation();
    setEditingTomada(tomada);
    setEditModalTab(defaultTab);
    setEditFormData({
      id: tomada.id,
      numero: tomada.numero || "",
      tipoResolucao: (tomada.tipoResolucao === "alteracao" ? "alteracao" : "nova"),
      meioParticipacao: tomada.meioParticipacao || "Consulta Pública",
      title: tomada.title || "",
      objeto: tomada.objeto || "",
      dataInicio: tomada.dataInicio ? tomada.dataInicio.split("T")[0] : "",
      dataFim: tomada.dataFim ? tomada.dataFim.split("T")[0] : ""
    });
    setEditAnexos(tomada.anexos ? [...tomada.anexos] : []);

    // Fetch articles for editing
    try {
      const res = await fetch(`/api/reg/participations/${tomada.id}/articles`);
      if (res.ok) {
        const data = await res.json();
        setEditArticles(data);
      } else {
        const local = articles.filter(a => String(a.tomadaId) === String(tomada.id));
        setEditArticles(local);
      }
    } catch (err) {
      const local = articles.filter(a => String(a.tomadaId) === String(tomada.id));
      setEditArticles(local);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData.title.trim()) {
      showToast("Aviso", "Preencha o título da Participação Social.", "warning");
      return;
    }
    if (!editFormData.objeto.trim()) {
      showToast("Aviso", "Preencha o objeto da Participação Social.", "warning");
      return;
    }
    if (!editFormData.dataInicio || !editFormData.dataFim) {
      showToast("Aviso", "Preencha as datas de início e fim do período.", "warning");
      return;
    }

    try {
      setIsSubmittingEdit(true);
      // 1. Update basic info and attachments
      const res = await fetch(`/api/reg/participations/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          anexos: editAnexos
        })
      });

      // 2. Update articles
      if (editArticles && editArticles.length > 0) {
        // Guarantee order reflects the current array state
        const articlesToSave = editArticles.map((art, idx) => ({
          ...art,
          order: idx + 1
        }));
        
        await fetch(`/api/reg/participations/${editFormData.id}/articles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articles: articlesToSave })
        });
      }

      if (res.ok) {
        showToast("Sucesso", "Participação Social, Minuta e Anexos atualizados com sucesso!", "success");
        setEditingTomada(null);
        await fetchTomadas();
        if (selectedTomada && String(selectedTomada.id) === String(editFormData.id)) {
          await fetchTomadaDetails(String(editFormData.id));
        }
      } else {
        showToast("Erro", "Falha ao atualizar o registro.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenDeleteConfirm = (tomada: TomadaSubsidio, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingTomada(tomada);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTomada) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/reg/participations/${deletingTomada.id}`, { method: 'DELETE' });
      if (res.ok) {
        const deletedId = deletingTomada.id;
        setTomadas(prev => prev.filter(t => String(t.id) !== String(deletedId)));
        setArticles(prev => prev.filter(a => String(a.tomadaId) !== String(deletedId)));
        setContributions(prev => prev.filter(c => {
          const art = articles.find(a => String(a.id) === String(c.articleId));
          return art && String(art.tomadaId) !== String(deletedId);
        }));
        showToast("Sucesso", "Registro de Participação Social excluído com sucesso.", "success");
        setDeletingTomada(null);
        if (selectedTomada && String(selectedTomada.id) === String(deletedId)) {
          setSelectedTomada(null);
          setActiveView("list");
        }
        fetchTomadas();
      } else {
        showToast("Erro", "Falha ao excluir registro.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenPublicView = async (tomada: TomadaSubsidio) => {
    await fetchTomadaDetails(String(tomada.id));
    setSelectedTomada(tomada);
    
    const isAberta = getStatus(tomada.dataInicio, tomada.dataFim).startsWith("Aberta");
    setPublicTab(isAberta ? "contribuir" : "ver");
    setPublicContributionsView("minhas");
    
    setActiveView("public_view");
  };

  const handleAddContribution = (article: Article) => {
    if (!effectiveUser) {
      showToast("Autenticação Necessária", "Você precisa estar conectado à sua conta para propor alterações.", "warning");
      return;
    }
    setContributingArticleId(String(article.id));
    setEditingContributionId(null);
    const baseText = (article.proposedText !== undefined && article.proposedText !== null && article.proposedText.trim() !== "")
      ? article.proposedText
      : (article.originalText || "");
    setProposedText(baseText);
    setIsSuppressing(false);
    setJustification("");
  };

  const handleStartEditContribution = (article: Article, contrib: Contribution) => {
    if (!effectiveUser) {
      showToast("Autenticação Necessária", "Você precisa estar conectado para editar propostas.", "warning");
      return;
    }
    setContributingArticleId(String(article.id));
    setEditingContributionId(contrib.id);
    setProposedText(contrib.proposedText || "");
    setIsSuppressing(!contrib.proposedText || contrib.proposedText.trim() === "");
    setJustification(contrib.justification || "");
  };

  const handleDeleteUserContribution = (contribId: string | number, articleId: string | number) => {
    setDeletingContribution({ contribId, articleId });
  };

  const handleConfirmDeleteContribution = async () => {
    if (!deletingContribution) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reg/contributions/${deletingContribution.contribId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setContributions(prev => prev.filter(c => String(c.id) !== String(deletingContribution.contribId)));
        const sArtId = String(deletingContribution.articleId);
        setSessionContribArticleIds(prev => {
          const next = prev.filter(id => id !== sArtId);
          try { localStorage.setItem("sgi_session_contributions", JSON.stringify(next)); } catch {}
          return next;
        });
        
        if (contributingArticleId === sArtId) {
          setContributingArticleId(null);
          setEditingContributionId(null);
        }
        showToast("Sucesso", "Proposta de contribuição excluída com sucesso.", "info");
        setDeletingContribution(null);
        if (selectedTomada) {
          await fetchTomadaDetails(String(selectedTomada.id));
        }
      } else {
        showToast("Erro", "Falha ao excluir contribuição.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro", "Erro ao conectar ao servidor.", "error");
    } finally {
      setIsDeleting(false);
      setDeletingContribution(null);
    }
  };

  const handleSaveContribution = async () => {
    if (!contributingArticleId) return;
    if (!effectiveUser) {
      showToast("Autenticação Necessária", "Você precisa estar logado para enviar uma contribuição.", "warning");
      return;
    }
    if ((!isSuppressing && !proposedText.trim()) || !justification.trim()) {
      showToast("Aviso", "Preencha a proposta de alteração (ou marque a opção de supressão) e a justificativa técnica.", "warning");
      return;
    }

    const currentArtIdStr = String(contributingArticleId);
    const currentUserId = effectiveUser?.id ? Number(effectiveUser.id) : null;
    const authorSignature = (effectiveUser?.name || effectiveUser?.email || "Usuário").trim();
    const authorEmail = (effectiveUser?.email || "").trim();

    const currentArt = articles.find(a => String(a.id) === currentArtIdStr);
    let finalProposedText = proposedText;

    if (currentArt && !isSuppressing) {
      const originalTextForArt = currentArt.originalText || "";
      const baseMatch = originalTextForArt.match(/(?:^|\n)\s*(?:Art\.|Artigo)\s*(\d+)/i);
      if (baseMatch) {
        const baseNum = baseMatch[1];
        let letterIndex = 0;
        let formatApplied = false;

        finalProposedText = proposedText.replace(/(^|\n)(\s*)(Art\.|Artigo)(\s+)(\d+)(?:\s*-\s*)?([A-Za-z])?(º|°|o|-)?/gi, (match, prefix, spaces, artWord, spaces2, num, existingLetter, suffix) => {
          if (existingLetter || num === baseNum) return match;
          formatApplied = true;
          const letter = String.fromCharCode(65 + letterIndex);
          letterIndex++;
          return `${prefix}${spaces}${artWord}${spaces2}${baseNum}${letter}${suffix || 'º'}`;
        });

        if (formatApplied) {
          showToast("Formatação Automática", "A numeração de novos artigos foi ajustada para letras maiúsculas (padrão de técnica legislativa).", "info");
        }
      }
    }

    try {
      if (editingContributionId) {
        // Edit existing contribution
        const res = await fetch(`/api/reg/contributions/${editingContributionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposedText: isSuppressing ? "" : finalProposedText,
            justification,
            authorName: authorSignature,
            authorEmail,
            userId: currentUserId
          })
        });

        if (res.ok) {
          setContributions(prev => prev.map(c => {
            if (String(c.id) === String(editingContributionId)) {
              return {
                ...c,
                userId: currentUserId,
                proposedText: isSuppressing ? "" : finalProposedText,
                justification,
                authorName: authorSignature,
                authorEmail,
                createdAt: new Date().toISOString()
              };
            }
            return c;
          }));

          setExpandedUserContribs(prev => ({ ...prev, [currentArtIdStr]: true }));
          showToast("Sucesso", "Sua proposta de alteração foi atualizada com sucesso!", "success");
          setProposedText("");
          setIsSuppressing(false);
          setJustification("");
          setContributingArticleId(null);
          setEditingContributionId(null);

          if (selectedTomada) {
            await fetchTomadaDetails(String(selectedTomada.id));
          }
        } else {
          showToast("Erro", "Falha ao atualizar contribuição.", "error");
        }
      } else {
        // Create new contribution (single per article per user)
        const newContrib = {
          articleId: Number(contributingArticleId),
          userId: currentUserId,
          authorName: authorSignature,
          authorEmail,
          proposedText: isSuppressing ? "" : finalProposedText,
          justification,
          createdAt: new Date().toISOString()
        };

        const res = await fetch('/api/reg/contributions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContrib)
        });
        
        if (res.ok) {
          const data = await res.json();
          const createdId = data.id;

          setContributions(prev => [
            {
              id: createdId,
              articleId: Number(contributingArticleId),
              userId: currentUserId,
              authorName: authorSignature,
              proposedText: isSuppressing ? "" : finalProposedText,
              justification,
              createdAt: newContrib.createdAt
            },
            ...prev.filter(c => !(String(c.articleId) === currentArtIdStr && String(c.userId) === String(currentUserId)))
          ]);

          // Record session contributed id
          setSessionContribArticleIds(prev => {
            const next = Array.from(new Set([...prev, currentArtIdStr]));
            try { localStorage.setItem("sgi_session_contributions", JSON.stringify(next)); } catch {}
            return next;
          });

          // Automatically expand the user contribution view on that article
          setExpandedUserContribs(prev => ({ ...prev, [currentArtIdStr]: true }));

          showToast("Sucesso", "Contribuição cadastrada com sucesso!", "success");
          setProposedText("");
          setJustification("");
          setContributingArticleId(null);
          setEditingContributionId(null);

          if (selectedTomada) {
            await fetchTomadaDetails(String(selectedTomada.id));
          }
        } else {
          showToast("Erro", "Falha ao enviar contribuição", "error");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao conectar com o servidor.", "error");
    }
  };

  const handleUpdateAnalysis = async (contributionId: string | number, decision: string, complexity: string, technicalJustification: string) => {
    try {
      const res = await fetch(`/api/reg/contributions/${contributionId}/analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, complexity, technicalJustification })
      });
      if (res.ok) {
        setContributions(prev => prev.map(c => c.id === contributionId ? { ...c, decision, complexity, technicalJustification } : c));
        showToast("Sucesso", "Análise atualizada com sucesso.", "success");
      } else {
        showToast("Erro", "Falha ao atualizar análise.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao conectar com o servidor.", "error");
    }
  };

  const handleDeleteAnalysisArticle = (articleId: string | number, hasContributions: boolean) => {
    setDeletingArticle({ id: articleId, hasContributions });
  };

  const handleConfirmDeleteArticle = async () => {
    if (!deletingArticle) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reg/articles/${deletingArticle.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setArticles(prev => prev.filter(a => String(a.id) !== String(deletingArticle.id)));
        setContributions(prev => prev.filter(c => String(c.articleId) !== String(deletingArticle.id)));
        showToast("Sucesso", "Dispositivo excluído com sucesso.", "success");
        setDeletingArticle(null);
      } else {
        showToast("Erro", "Falha ao excluir o dispositivo.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao conectar com o servidor.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateFinalAnalysis = async (articleId: string | number, finalText: string, finalJustification: string) => {
    try {
      const res = await fetch(`/api/reg/articles/${articleId}/final-analysis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalText, finalJustification })
      });
      if (res.ok) {
        setArticles(prev => prev.map(a => a.id === articleId ? { ...a, finalText, finalJustification } : a));
        showToast("Sucesso", "Análise final salva com sucesso.", "success");
      } else {
        showToast("Erro", "Falha ao salvar análise final.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao conectar com o servidor.", "error");
    }
  };

  const renderUserContributionComparison = (baseText: string, suggestedText: string) => {
    const diffParts = getSmartDiff(baseText || "", suggestedText || "");
    const hasAdded = diffParts.some(p => p.added);
    const hasRemoved = diffParts.some(p => p.removed);
    const isIdentical = !hasAdded && !hasRemoved;

    return (
      <div className="space-y-3">
        {/* Header com Legenda Clara */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 px-3.5 py-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-emerald-700 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Comparativo: Texto Proposto em Consulta (Minuta) × Texto da Contribuição Sugerida
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
              [+ Inserido pelo Cidadão]
            </span>
            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-950 border border-rose-300 px-2 py-0.5 rounded line-through decoration-rose-600 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
              [- Excluído da Minuta]
            </span>
          </div>
        </div>

        {/* Grade Comparativa de 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Painel 1: Texto Proposto da Minuta */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                1. Texto Proposto em Consulta (Minuta)
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs h-full">
              <div className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                {baseText || <span className="text-slate-400 italic">Nenhum texto base definido.</span>}
              </div>
            </div>
          </div>

          {/* Painel 2: Contribuição Sugerida com Destaque de Inserções e Exclusões */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                2. Texto da Contribuição Sugerida (Com destaques)
              </span>
            </div>
            <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-2xs ring-2 ring-emerald-500/20 h-full">
              {isIdentical ? (
                <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                  Redação idêntica ao texto proposto da minuta (nenhuma alteração textual detectada).
                </div>
              ) : (
                <div className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                  {diffParts.map((part, pIdx) => {
                    if (part.added) {
                      return (
                        <span
                          key={pIdx}
                          className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded mx-0.5 border border-emerald-300 shadow-2xs inline-block my-0.5"
                          title="Texto inserido na sua proposta"
                        >
                          {part.value}
                        </span>
                      );
                    }
                    if (part.removed) {
                      return (
                        <span
                          key={pIdx}
                          className="bg-rose-100 text-rose-900 line-through decoration-rose-600 font-semibold px-1.5 py-0.5 rounded mx-0.5 border border-rose-300 shadow-2xs inline-block my-0.5"
                          title="Texto excluído na sua proposta"
                        >
                          {part.value}
                        </span>
                      );
                    }
                    return <span key={pIdx}>{part.value}</span>;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderArticleDiff = (original: string, proposed: string) => {
    const diffResult = getSmartDiff(original, proposed);

    return (
      <div className="text-sm mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <strong className="text-slate-500 block mb-2 text-[10px] uppercase tracking-wider">Texto Atual (Vigente)</strong>
          <div className="text-slate-500 whitespace-pre-wrap">{original}</div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
          <strong className="text-indigo-600 block mb-2 text-[10px] uppercase tracking-wider">Proposta da Área Técnica</strong>
          <div className="text-slate-800 font-medium whitespace-pre-wrap">
            {diffResult.map((part, index) => {
              if (part.removed) {
                return (
                  <span key={index} className="text-rose-600 line-through bg-rose-50/50">
                    {part.value}
                  </span>
                );
              }
              if (part.added) {
                return (
                  <span key={index} className="text-emerald-700 font-bold bg-emerald-100/50">
                    {part.value}
                  </span>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDiff = (original: string, proposed: string) => {
    const diffResult = getSmartDiff(original, proposed);

    return (
      <div className="text-sm bg-slate-50 border border-slate-200 rounded-lg p-3 mt-2 grid grid-cols-2 gap-4">
        <div>
          <strong className="text-rose-600 block mb-1 text-xs">Texto Original:</strong>
          <div className="text-slate-500 whitespace-pre-wrap">{original}</div>
        </div>
        <div>
          <strong className="text-emerald-600 block mb-1 text-xs">Texto da Contribuição:</strong>
          <div className="text-slate-800 font-medium whitespace-pre-wrap">
            {diffResult.map((part, index) => {
              if (part.removed) {
                return (
                  <span key={index} className="text-rose-600 line-through">
                    {part.value}
                  </span>
                );
              }
              if (part.added) {
                return (
                  <span key={index} className="text-emerald-600 font-bold">
                    {part.value}
                  </span>
                );
              }
              return <span key={index}>{part.value}</span>;
            })}
          </div>
        </div>
      </div>
    );
  };


  const renderMainContent = () => {
    if (activeView === "create_step1") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <button onClick={() => setActiveView("list")} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nova Participação Social - Passo 1</h2>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo de Norma</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all font-medium text-slate-700 cursor-pointer"
                value={formData.tipoResolucao}
                onChange={e => setFormData({ ...formData, tipoResolucao: e.target.value as "nova" | "alteracao" })}
              >
                <option value="nova">Nova Norma</option>
                <option value="alteracao">Alteração de Norma Existente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meio de Participação</label>
              <select
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all font-medium text-slate-700 cursor-pointer"
                value={formData.meioParticipacao}
                onChange={e => {
                  const newMeio = e.target.value;
                  const newNumero = getNextSequentialNumber(newMeio, tomadas);
                  setFormData({ ...formData, meioParticipacao: newMeio, numero: newNumero });
                }}
              >
                <option value="Consulta Pública">Consulta Pública (CP)</option>
                <option value="Tomada de Subsídios">Tomada de Subsídios (TS)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock size={12} className="text-slate-400" />
                  Número
                </span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded uppercase tracking-normal">
                  Automático
                </span>
              </label>
              <input 
                type="text" 
                readOnly
                disabled
                placeholder="Ex: CP 1/2026"
                className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-not-allowed select-none transition-all shadow-inner"
                value={formData.numero || getNextSequentialNumber(formData.meioParticipacao, tomadas)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Sequencial anual gerado automaticamente pelo banco de dados.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título</label>
            <input 
              type="text" 
              placeholder="Ex: Revisão Tarifária"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Objeto</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all resize-y"
              value={formData.objeto}
              onChange={e => setFormData({ ...formData, objeto: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data Início</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-slate-700"
                value={formData.dataInicio}
                onChange={e => setFormData({ ...formData, dataInicio: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data Fim</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-slate-700"
                value={formData.dataFim}
                onChange={e => setFormData({ ...formData, dataFim: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Material de Apoio (Anexos)</label>
            <input 
              type="file" 
              multiple
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={e => {
                if (e.target.files) {
                  setFormData({ ...formData, anexos: [...formData.anexos, ...Array.from(e.target.files)] });
                }
              }}
            />
            {formData.anexos.length > 0 && (
              <ul className="mt-3 space-y-2">
                {formData.anexos.map((file, i) => (
                  <li key={i} className="text-xs font-medium text-slate-700 flex items-center justify-between bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                    <span className="truncate flex items-center gap-2">
                      <FileText size={14} className="text-indigo-500"/> {file.name}
                    </span>
                    <button 
                      onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, idx) => idx !== i)})} 
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Remover anexo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Importar de Arquivo (Word/PDF)</label>
            <p className="text-xs text-slate-400 mb-2">Selecione um arquivo Word ou PDF para extrair os artigos automaticamente antes de carregar na minuta.</p>
            <div className="flex items-center gap-3 mb-4">
              <input 
                type="file" 
                accept=".docx,.pdf"
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleExtractText(e.target.files[0]);
                    e.target.value = ''; // Reset input
                  }
                }}
              />
              {isExtractingText && <span className="text-xs text-indigo-600 font-bold animate-pulse flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Extraindo...</span>}
            </div>

            {extractedArticles.length > 0 && (
              <div className="mb-6 p-4 bg-white border border-indigo-100 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-indigo-50 pb-2">
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600"/> Artigos Identificados ({extractedArticles.length})
                  </h4>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                        checked={selectedExtractedArticles.every(Boolean)}
                        onChange={e => setSelectedExtractedArticles(extractedArticles.map(() => e.target.checked))}
                      />
                      Selecionar Todos
                    </label>
                    <button 
                      onClick={handleLoadSelectedArticles}
                      disabled={!selectedExtractedArticles.some(Boolean)}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Carregar Selecionados
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {extractedArticles.map((article, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-lg border border-slate-200 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                        checked={selectedExtractedArticles[i] || false}
                        onChange={e => {
                          const newSelected = [...selectedExtractedArticles];
                          newSelected[i] = e.target.checked;
                          setSelectedExtractedArticles(newSelected);
                        }}
                      />
                      <div className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                        <span className="font-bold text-slate-900 mr-2">{article.split('\n')[0]}</span>
                        {article.substring(article.indexOf('\n') + 1)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Minuta da Resolução (Cole o texto completo)</label>
            <p className="text-xs text-slate-400 mb-2">Cole o texto do SEI ou do Word, ou carregue do arquivo acima. O sistema identificará os artigos automaticamente.</p>
            <textarea 
              rows={15}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all whitespace-pre-wrap"
              placeholder="Art. 1º Esta Norma de Referência estabelece..."
              value={formData.rawText}
              onChange={e => setFormData({ ...formData, rawText: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => handleProcessText()} className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:bg-indigo-700 transition-all flex items-center gap-2">
            Processar Minuta <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

    if (activeView === "create_step2") {
      const isAlteracao = formData.tipoResolucao === "alteracao";
      const totalArticles = (previewArticles || []).length;
      const missingOriginalCount = (previewArticles || []).filter(a => !a.originalText || !a.originalText.trim()).length;

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveView("create_step1")} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <ArrowLeft size={18} className="text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Revisão de Artigos - Passo 2</h2>
                <p className="text-xs text-slate-500 font-medium">Confira e ajuste os dispositivos antes de publicar a Participação Social.</p>
              </div>
            </div>

            {isAlteracao && (
              <button
                type="button"
                onClick={handleRepeatProposedAsOriginal}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all"
                title="Copia o texto proposto de cada dispositivo para o campo de texto vigente"
              >
                <Copy size={15} />
                <span>Repetir Texto Proposto como Texto Original</span>
              </button>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className={cn(
              "flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border",
              isAlteracao 
                ? (missingOriginalCount > 0 ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-emerald-50/70 border-emerald-200 text-emerald-900")
                : "bg-slate-50 border-slate-200 text-slate-700"
            )}>
              <div>
                <p className="text-sm font-medium">
                  O sistema identificou <strong>{totalArticles}</strong> dispositivo(s) estrutural(is).
                </p>
                {isAlteracao && (
                  <p className="text-xs mt-1 font-semibold flex items-center gap-1.5">
                    {missingOriginalCount > 0 ? (
                      <>
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>
                          <strong>Alteração de Norma Existente:</strong> O preenchimento do <strong>Texto Atual Vigente da Resolução</strong> é obrigatório em todos os dispositivos ({missingOriginalCount} pendente(s)).
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Todos os textos originais vigentes foram devidamente preenchidos.</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {isAlteracao && (
                <button
                  type="button"
                  onClick={handleRepeatProposedAsOriginal}
                  className="flex sm:hidden items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <Copy size={14} />
                  <span>Repetir Texto Proposto como Original</span>
                </button>
              )}
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
              <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => insertPreviewArticle(-1)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all shadow-sm bg-white">
                  <Plus size={13} /> Inserir Dispositivo no Topo
                </button>
              </div>
              {(previewArticles || []).map((art, i) => {
                const isMissingOriginal = isAlteracao && (!art.originalText || !art.originalText.trim());

                return (
                  <div 
                    key={art.id} 
                    className={cn(
                      "p-4 rounded-xl relative group transition-all border",
                      isMissingOriginal ? "bg-amber-50/30 border-amber-300 ring-1 ring-amber-200" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="absolute -left-3 top-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
                      #{i+1}
                    </div>
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-100 p-0.5">
                      <button type="button" onClick={() => movePreviewArticle(i, -1)} disabled={i === 0} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent" title="Mover para cima">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" onClick={() => movePreviewArticle(i, 1)} disabled={i === (previewArticles?.length || 0) - 1} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md disabled:opacity-30 disabled:hover:bg-transparent" title="Mover para baixo">
                        <ArrowDown size={14} />
                      </button>
                      <button type="button" onClick={() => removePreviewArticle(i)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md" title="Excluir dispositivo">
                        <Trash2 size={14} />
                      </button>
                    </div>

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
                                const newArts = [...(previewArticles || [])];
                                const textToCopy = (art.proposedText !== undefined && art.proposedText !== null && art.proposedText !== "")
                                  ? art.proposedText
                                  : (art.originalText || "");
                                newArts[i].originalText = textToCopy;
                                setPreviewArticles(newArts);
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                              title="Copiar texto proposto deste dispositivo para o texto original vigente"
                            >
                              <Copy size={11} /> Repetir proposto
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
                              const newArts = [...(previewArticles || [])];
                              newArts[i].originalText = e.target.value;
                              setPreviewArticles(newArts);
                            }}
                            rows={Math.max(12, (art.proposedText || art.originalText || "").split('\n').length)}
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
                        <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Texto Proposto (Área Técnica)</label>
                        <textarea 
                          className="w-full bg-white border border-indigo-200 rounded-lg p-3 resize-y focus:ring-2 focus:ring-indigo-600 text-sm font-medium text-slate-800 whitespace-pre-wrap outline-none"
                          value={art.proposedText !== undefined ? art.proposedText : art.originalText}
                          onChange={e => {
                            const newArts = [...(previewArticles || [])];
                            newArts[i].proposedText = e.target.value;
                            setPreviewArticles(newArts);
                          }}
                          rows={Math.max(12, (art.proposedText || art.originalText || "").split('\n').length)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200/60 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => insertPreviewArticle(i)} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all shadow-sm bg-white">
                        <Plus size={13} /> Inserir Dispositivo Aqui
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
  
          <div className="flex justify-between items-center gap-3">
            {isAlteracao && (
              <button
                type="button"
                onClick={handleRepeatProposedAsOriginal}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                <Copy size={15} />
                <span>Repetir Texto Proposto como Texto Original</span>
              </button>
            )}
            <button onClick={handleSaveTomada} className="ml-auto px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:-translate-y-0.5 hover:bg-indigo-700 transition-all flex items-center gap-2">
              Confirmar e Publicar <Check size={18} />
            </button>
          </div>
        </div>
      );
    }

  if (["public_view", "public_contribute", "public_contributions", "technical_analysis"].includes(activeView) && selectedTomada) {
    const currentArticles = articles.filter(a => String(a.tomadaId) === String(selectedTomada.id)).sort((a,b) => a.order - b.order);
    const tomadaStatus = getStatus(selectedTomada.dataInicio, selectedTomada.dataFim);
    const isTomadaAberta = tomadaStatus.startsWith("Aberta");
    
    // Calculate stats
    const tomadaContributions = contributions.filter(c => currentArticles.some(a => String(a.id) === String(c.articleId)));
    const uniqueParticipants = new Set(tomadaContributions.map(c => c.authorName)).size;
    const userContributedCount = currentArticles.filter(a => isUserContributedArticle(a.id)).length;

    const filteredContributeArticles = currentArticles.filter(art => {
      if (contributeArticleFilter === "com_contribuicao") return isUserContributedArticle(art.id);
      if (contributeArticleFilter === "sem_contribuicao") return !isUserContributedArticle(art.id);
      return true;
    });

    const handleExportConsolidadoExcel = () => {
      try {
        // Sheet 1: Quadro Consolidado
        const consolidadoRows = currentArticles.map((art, idx) => {
          const cArt = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
          const a = cArt.filter(c => c.decision === "Acatada" || c.decision === "Acatada Parcialmente").length;
          const na = cArt.filter(c => c.decision === "Não Acatada" || c.decision === "Prejudicada" || c.decision === "Retida para Estudos Adicionais").length;
          const pend = cArt.filter(c => !c.decision).length;
          const origText = art.proposedText || art.originalText || "";
          const fText = art.finalText || origText;
          const isAlterada = fText.trim() !== origText.trim();

          const row: any = {
            "Nº Dispositivo": idx + 1,
          };
          if (selectedTomada.tipoResolucao === "alteracao") {
            row["Texto Atual (Vigente)"] = art.originalText || "Sem texto original cadastrado";
          }
          row["Texto Proposto em Consulta (Minuta)"] = origText;
          row["Texto Final do Dispositivo"] = fText;
          row["Status da Redação"] = isAlterada ? "Alterada pós-contribuições" : "Inalterada (Texto Original Mantido)";
          row["Justificativa Técnica Final"] = art.finalJustification || "Sem justificativa final cadastrada";
          row["Total de Contribuições"] = cArt.length;
          row["Acatadas / Parciais"] = a;
          row["Não Acatadas / Outras"] = na;
          row["Aguardando Parecer"] = pend;
          
          return row;
        });

        // Sheet 2: Detalhamento de Contribuições
        const contribuicoesRows: any[] = [];
        currentArticles.forEach((art, idx) => {
          const cArt = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
          cArt.forEach(c => {
            const row: any = {
              "Nº Dispositivo": idx + 1,
            };
            if (selectedTomada.tipoResolucao === "alteracao") {
              row["Texto Atual (Vigente)"] = art.originalText || "Sem texto original cadastrado";
            }
            row["Texto Proposto em Consulta (Minuta)"] = art.proposedText || art.originalText || "";
            row["Participante"] = c.authorName;
            row["E-mail do Participante"] = c.authorEmail || "";
            row["Data da Contribuição"] = formatDateBr(c.createdAt);
            row["Texto Proposto pelo Participante"] = c.proposedText;
            row["Justificativa do Participante"] = c.justification;
            row["Parecer Técnico"] = c.decision || "Aguardando Análise";
            row["Complexidade"] = c.complexity || "";
            row["Justificativa Técnica"] = c.technicalJustification || "";
            contribuicoesRows.push(row);
          });
        });

        const wb = XLSX.utils.book_new();

        const wsConsolidado = XLSX.utils.json_to_sheet(consolidadoRows);
        wsConsolidado["!cols"] = [
          { wch: 15 },
          { wch: 45 },
          { wch: 45 },
          { wch: 30 },
          { wch: 40 },
          { wch: 20 },
          { wch: 20 },
          { wch: 20 },
          { wch: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, wsConsolidado, "Quadro Consolidado");

        if (contribuicoesRows.length > 0) {
          const wsContrib = XLSX.utils.json_to_sheet(contribuicoesRows);
          wsContrib["!cols"] = [
            { wch: 15 },
            { wch: 35 },
            { wch: 25 },
            { wch: 25 },
            { wch: 18 },
            { wch: 35 },
            { wch: 35 },
            { wch: 20 },
            { wch: 15 },
            { wch: 35 },
          ];
          XLSX.utils.book_append_sheet(wb, wsContrib, "Contribuições Recebidas");
        }

        const safeNumero = (selectedTomada.numero || "participacao_social").replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `Quadro_Consolidado_Redacao_Final_${safeNumero}.xlsx`;

        XLSX.writeFile(wb, filename);
        showToast("Exportação Concluída", "O arquivo Excel do Quadro Consolidado foi gerado com sucesso!", "success");
      } catch (error: any) {
        console.error("Erro ao exportar Excel:", error);
        showToast("Erro na Exportação", "Não foi possível gerar o arquivo Excel.", "error");
      }
    };

    const handleExportConsolidadoPDF = () => {
      try {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showToast("Erro", "O bloqueador de pop-ups impediu a geração do PDF.", "error");
          return;
        }

        const safeNumero = (selectedTomada.numero || "participacao").replace(/[^a-zA-Z0-9_-]/g, "_");
        const title = `Quadro Consolidado da Redação Final - ${selectedTomada.numero || "N/A"}`;
        
        const escapeHtml = (unsafe: string) => {
          return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        };

        let html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: sans-serif; font-size: 11px; margin: 20px; color: #333; }
              h1 { font-size: 16px; text-align: center; margin-bottom: 20px; text-transform: uppercase; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
              th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 10px; }
              .text-red { color: #e11d48; }
              .text-green { color: #059669; }
              pre { white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 11px; }
              @media print {
                @page { margin: 1.5cm; size: landscape; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">Nº</th>
                  ${selectedTomada.tipoResolucao === "alteracao" ? '<th style="width: 20%;">Texto Atual (Vigente)</th>' : ''}
                  <th style="width: 25%;">Texto Proposto em Consulta (Minuta)</th>
                  <th style="width: 25%;">Texto Final do Dispositivo</th>
                  <th style="width: 20%;">Justificativa Técnica</th>
                  <th style="width: 120px;">Contribuições</th>
                </tr>
              </thead>
              <tbody>
        `;

        currentArticles.forEach((art, idx) => {
          const cArt = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
          const a = cArt.filter(c => c.decision === "Acatada" || c.decision === "Acatada Parcialmente").length;
          const na = cArt.filter(c => c.decision === "Não Acatada" || c.decision === "Prejudicada" || c.decision === "Retida para Estudos Adicionais").length;
          const pend = cArt.filter(c => !c.decision).length;
          
          const origText = escapeHtml(art.proposedText || art.originalText || "");
          const origTextVigente = escapeHtml(art.originalText || "Sem texto original cadastrado");
          const fText = escapeHtml(art.finalText || art.proposedText || art.originalText || "");
          const fJust = escapeHtml(art.finalJustification || "-");
          
          html += `
            <tr>
              <td>${idx + 1}</td>
              ${selectedTomada.tipoResolucao === "alteracao" ? `<td><pre>${origTextVigente}</pre></td>` : ''}
              <td><pre>${origText}</pre></td>
              <td><pre>${fText}</pre></td>
              <td><pre>${fJust}</pre></td>
              <td>
                Total: <b>${cArt.length}</b><br>
                <span class="text-green">Acatadas/Parc: ${a}</span><br>
                <span class="text-red">Não Acat/Outras: ${na}</span><br>
                Pendentes: ${pend}
              </td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </body>
          </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        // Timeout para garantir que o CSS seja renderizado antes de chamar print()
        setTimeout(() => {
          printWindow.print();
        }, 500);

      } catch (error: any) {
        console.error("Erro ao gerar PDF:", error);
        showToast("Erro na Exportação", "Não foi possível gerar o arquivo PDF.", "error");
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <button onClick={() => { setActiveView("list"); setSelectedTomada(null); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{selectedTomada.title}</h2>
            <p className="text-xs font-medium text-slate-500">{selectedTomada.meioParticipacao || "Participação Social"} Pública</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Número</span>
              <span className="text-sm font-bold text-slate-800">{selectedTomada.numero}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meio de Participação</span>
              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                {selectedTomada.meioParticipacao || "Tomada de Subsídios"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Período</span>
              <span className="text-sm font-bold text-slate-800">{formatDateBr(selectedTomada.dataInicio)} até {formatDateBr(selectedTomada.dataFim)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
              <span className={cn(
                  "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mt-0.5",
                  getStatus(selectedTomada.dataInicio, selectedTomada.dataFim).startsWith("Aberta") ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>
                {getStatus(selectedTomada.dataInicio, selectedTomada.dataFim)}
              </span>
            </div>
          </div>
          
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Objeto</span>
            <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{selectedTomada.objeto}</p>
          </div>

          {selectedTomada.anexos && selectedTomada.anexos.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Material de Apoio</span>
              <div className="flex flex-wrap gap-2">
                {selectedTomada.anexos.map(anexo => (
                  <a key={anexo.id} href={anexo.url} download={anexo.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors text-xs font-bold">
                    <FileText size={14} /> {anexo.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeView === "public_view" && (
          <div className="w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Contribuições Recebidas</h4>
                  <p className="text-2xl font-bold text-slate-800">{tomadaContributions.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Participantes</h4>
                  <p className="text-2xl font-bold text-slate-800">{uniqueParticipants}</p>
                </div>
              </div>
            </div>

            {userContributedCount > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 font-medium">
                  Você já registrou contribuições em <strong className="font-bold text-emerald-950">{userContributedCount}</strong> {userContributedCount === 1 ? 'dispositivo' : 'dispositivos'} desta minuta.
                </p>
              </div>
            )}
            
            <div className="flex gap-4 mb-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/60 shadow-inner overflow-x-auto">
              <button
                onClick={() => isTomadaAberta && setPublicTab("contribuir")}
                disabled={!isTomadaAberta}
                className={cn(
                  "px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 rounded-xl outline-none whitespace-nowrap",
                  publicTab === "contribuir" 
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  !isTomadaAberta && "opacity-50 cursor-not-allowed text-slate-400 hover:bg-transparent hover:text-slate-500"
                )}
              >
                <Edit3 size={18} /> {userContributedCount > 0 ? "GERENCIAR CONTRIBUIÇÕES" : "CONTRIBUIR"}
                {!isTomadaAberta && <Lock size={14} className="ml-1" />}
              </button>
              <button
                onClick={() => {
                  setPublicTab("ver");
                  setPublicContributionsView("minhas");
                }}
                className={cn(
                  "px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 rounded-xl outline-none whitespace-nowrap",
                  publicTab === "ver" 
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <FileText size={18} /> TABELA DE CONTRIBUIÇÕES
              </button>
            </div>
          </div>
        )}

        {activeView === "public_view" && publicTab === "contribuir" && (
          <div className="space-y-6 w-full">

            {/* Painel de Destaque e Filtro dos Dispositivos Contribuídos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Minhas Contribuições</span>
                    {userContributedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" /> {userContributedCount} {userContributedCount === 1 ? 'dispositivo com proposta' : 'dispositivos com proposta'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Nenhuma proposta enviada ainda
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 font-medium mt-1">
                    Você enviou contribuições em <strong className="text-emerald-700 font-bold">{userContributedCount}</strong> de <strong className="text-slate-900 font-bold">{currentArticles.length}</strong> dispositivos da minuta.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl shrink-0">
                  <button
                    onClick={() => setContributeArticleFilter("todos")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      contributeArticleFilter === "todos"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Todos ({currentArticles.length})
                  </button>
                  <button
                    onClick={() => setContributeArticleFilter("com_contribuicao")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      contributeArticleFilter === "com_contribuicao"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-700 hover:bg-emerald-50"
                    )}
                  >
                    <CheckCircle2 size={13} />
                    Com Minhas Propostas ({userContributedCount})
                  </button>
                  <button
                    onClick={() => setContributeArticleFilter("sem_contribuicao")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      contributeArticleFilter === "sem_contribuicao"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    Pendentes ({currentArticles.length - userContributedCount})
                  </button>
                </div>
              </div>
            </div>

            {filteredContributeArticles.map((art, artIdx) => {
              const isContributing = String(contributingArticleId) === String(art.id);
              const userArticleContribs = getUserContributionsForArticle(art.id);
              const hasUserContributed = userArticleContribs.length > 0;
              const isExpanded = !!expandedUserContribs[String(art.id)];
              const actualArtIdx = currentArticles.findIndex(a => String(a.id) === String(art.id));
              const displayIdx = actualArtIdx >= 0 ? actualArtIdx + 1 : artIdx + 1;

              return (
                <div 
                  key={art.id} 
                  className={cn(
                    "rounded-2xl border shadow-sm overflow-hidden transition-all",
                    hasUserContributed 
                      ? "bg-emerald-50/20 border-emerald-300 ring-2 ring-emerald-500/20" 
                      : "bg-white border-slate-200"
                  )}
                >
                  <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md",
                          hasUserContributed
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-indigo-50 text-indigo-600"
                        )}>
                          Dispositivo #{displayIdx}
                        </span>
                        
                        {hasUserContributed && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Contribuição Cadastrada
                          </span>
                        )}
                      </div>

                      {hasUserContributed && (
                        <button
                          onClick={() => toggleExpandUserContrib(art.id)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-300/80 shadow-2xs"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? "Ocultar comparativo da proposta" : "Ver comparativo da minha proposta"}
                        </button>
                      )}
                    </div>

                    {selectedTomada.tipoResolucao === "alteracao" && art.originalText && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                            Texto Atual (Vigente)
                          </span>
                        </div>
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 shadow-2xs">
                          <div className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {art.originalText}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                          Texto Proposto em Consulta (Minuta)
                        </span>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {selectedTomada.tipoResolucao === "alteracao" && art.originalText
                            ? renderDiffInline(art.originalText, art.proposedText)
                            : (art.proposedText !== undefined ? art.proposedText : art.originalText)}
                        </div>
                      </div>
                    </div>

                    {/* Comparativo Texto Proposto X Contribuição Sugerida */}
                    {hasUserContributed && isExpanded && userArticleContribs[0] && (
                      <div className="mt-5 pt-4 border-t border-emerald-200/80 space-y-4">
                        {renderUserContributionComparison(
                          (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "")
                            ? art.proposedText
                            : (art.originalText || ""),
                          userArticleContribs[0].proposedText
                        )}
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                                Sua Justificativa Técnica / Motivação
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">
                              Registrada em {formatDateBr(userArticleContribs[0].createdAt)} por {userArticleContribs[0].authorName}
                            </span>
                          </div>
                          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                            <p className="text-sm text-slate-700 italic bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                              "{userArticleContribs[0].justification}"
                            </p>
                          </div>
                        </div>

                        {!isContributing && isTomadaAberta && (
                          <div className="flex justify-end items-center gap-2 pt-2 border-t border-emerald-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteUserContribution(userArticleContribs[0].id, art.id);
                              }}
                              className="px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <Trash2 size={13} /> Excluir Proposta
                            </button>
                            <button
                              onClick={() => handleStartEditContribution(art, userArticleContribs[0])}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <Edit3 size={13} /> Editar Minha Proposta
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className={cn(
                    "px-6 py-3 border-t flex flex-wrap items-center justify-between gap-2",
                    hasUserContributed ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="text-xs font-medium">
                      {hasUserContributed ? (
                        <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" /> Proposta registrada por você neste dispositivo
                        </span>
                      ) : (
                        <span className="text-slate-400">Nenhuma proposta enviada por você neste dispositivo</span>
                      )}
                    </div>

                    {!isContributing && (
                      <>
                        {isTomadaAberta ? (
                          !hasUserContributed ? (
                            <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAddContribution(art)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-indigo-700 hover:text-indigo-700"
                            >
                              <MessageSquare size={14} className="text-indigo-600" /> Propor Alteração
                            </button>
                            <button 
                              onClick={() => setShowOrientacoesModal(true)}
                              className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-800 hover:text-slate-800"
                              title="Orientações sobre como propor alterações"
                            >
                              <AlertTriangle size={14} className="text-amber-500" /> Orientações
                            </button>
                            </div>
                          ) : null
                        ) : (
                          <button 
                            disabled
                            className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg shadow-none cursor-not-allowed flex items-center gap-2 select-none"
                            title="Contribuições encerradas para esta participação."
                          >
                            <Lock size={13} className="text-slate-400" /> Contribuições Encerradas
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Formulário de Criação / Edição de Proposta */}
                  {isContributing && (
                    <div className="p-6 border-t-2 border-emerald-600 bg-emerald-50/20">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Edit3 size={16} className="text-emerald-700" /> 
                            {editingContributionId ? `Editar Minha Proposta - Dispositivo #${displayIdx}` : `Nova Proposta de Alteração - Dispositivo #${displayIdx}`}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Cada usuário pode enviar 1 proposta por dispositivo. Você pode editar o texto e a justificativa enquanto o período estiver aberto.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                                Texto da Contribuição Sugerida
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 shadow-sm">
                              <input
                                type="checkbox"
                                id={`suppress-${art.id}`}
                                checked={isSuppressing}
                                onChange={(e) => {
                                  setIsSuppressing(e.target.checked);
                                  if (e.target.checked) setProposedText("");
                                }}
                                className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-600 cursor-pointer"
                              />
                              <label htmlFor={`suppress-${art.id}`} className="text-xs font-bold text-rose-800 cursor-pointer select-none">
                                Propor supressão (exclusão) integral deste dispositivo
                              </label>
                            </div>
                          </div>
                          <textarea 
                            className={cn(
                              "w-full px-4 py-3 border rounded-xl text-sm font-medium shadow-2xs transition-all",
                              isSuppressing ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white border-slate-300 focus:ring-2 focus:ring-emerald-600 text-slate-800"
                            )}
                            rows={10}
                            value={proposedText}
                            onChange={e => setProposedText(e.target.value)}
                            disabled={isSuppressing}
                            placeholder={isSuppressing ? "Dispositivo será excluído integralmente." : "Insira a redação que você propõe para este dispositivo..."}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                              Justificativa Técnica / Motivação
                            </span>
                          </div>
                          <textarea 
                            className="w-full bg-white px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-sm shadow-2xs"
                            rows={6}
                            placeholder="Explique os motivos técnicos, operacionais ou jurídicos da alteração solicitada..."
                            value={justification}
                            onChange={e => setJustification(e.target.value)}
                          />
                        </div>

                        {/* Pré-visualização ao vivo do comparativo */}
                        {proposedText.trim() && (
                          <div className="pt-2">
                            {renderUserContributionComparison(
                              (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "")
                                ? art.proposedText
                                : (art.originalText || ""),
                              proposedText
                            )}
                          </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-emerald-200/50">
                          <button 
                            onClick={() => {
                              setContributingArticleId(null);
                              setEditingContributionId(null);
                            }} 
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleSaveContribution} 
                            className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors shadow-md flex items-center gap-2"
                          >
                            <Save size={14} /> {editingContributionId ? "Salvar Alterações da Proposta" : "Gravar Proposta"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredContributeArticles.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic bg-white rounded-2xl border border-slate-200">
                {currentArticles.length === 0 
                  ? "Nenhum artigo encontrado nesta minuta."
                  : "Nenhum dispositivo encontrado para o filtro selecionado."}
              </div>
            )}
          </div>
        )}

        {activeView === "public_view" && publicTab === "ver" && (
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60 overflow-hidden">
                <button 
                  onClick={() => setPublicContributionsView("minhas")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 outline-none",
                    publicContributionsView === "minhas" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Minhas Contribuições
                </button>
                <button 
                  onClick={() => setPublicContributionsView("todas")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 outline-none",
                    publicContributionsView === "todas" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Todas as Contribuições
                </button>
              </div>
              {tomadaContributions.length > 0 && publicContributionsView === "todas" && (
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar por:</span>
                  <select 
                    value={participantFilter}
                    onChange={(e) => setParticipantFilter(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Participantes</option>
                    {Array.from(new Set(tomadaContributions.map(c => c.authorName))).sort().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {(() => {
              const baseList = publicContributionsView === "minhas" 
                ? tomadaContributions.filter(c => String(c.userId) === String(effectiveUser?.id))
                : tomadaContributions.filter(c => participantFilter === "all" || c.authorName === participantFilter);

              if (baseList.length === 0) {
                 return (
                   <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-4xl mx-auto mt-6">
                     <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                     <h3 className="text-lg font-black text-slate-700">Nenhuma contribuição encontrada</h3>
                     <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                       Não há contribuições correspondentes para este filtro ou categoria.
                     </p>
                   </div>
                 );
              }

              const handleSort = (key: string) => {
                let direction: 'asc' | 'desc' = 'asc';
                if (contributionsSortConfig && contributionsSortConfig.key === key && contributionsSortConfig.direction === 'asc') {
                  direction = 'desc';
                }
                setContributionsSortConfig({ key, direction });
              };

              const getSortIcon = (key: string) => {
                if (!contributionsSortConfig || contributionsSortConfig.key !== key) return <span className="ml-1 text-slate-300">↕</span>;
                return contributionsSortConfig.direction === 'asc' ? <span className="ml-1 text-indigo-600">↑</span> : <span className="ml-1 text-indigo-600">↓</span>;
              };

              const sortedContributions = [...baseList].sort((a, b) => {
                if (contributionsSortConfig) {
                  if (contributionsSortConfig.key === 'data') {
                     const aVal = new Date(a.createdAt || 0).getTime();
                     const bVal = new Date(b.createdAt || 0).getTime();
                     return contributionsSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                  }
                  if (contributionsSortConfig.key === 'participante') {
                     const aVal = (a.authorName || "").toLowerCase();
                     const bVal = (b.authorName || "").toLowerCase();
                     if (aVal < bVal) return contributionsSortConfig.direction === 'asc' ? -1 : 1;
                     if (aVal > bVal) return contributionsSortConfig.direction === 'asc' ? 1 : -1;
                     return 0;
                  }
                  if (contributionsSortConfig.key === 'parecer') {
                     const aVal = (a.decision || "").toLowerCase();
                     const bVal = (b.decision || "").toLowerCase();
                     if (aVal < bVal) return contributionsSortConfig.direction === 'asc' ? -1 : 1;
                     if (aVal > bVal) return contributionsSortConfig.direction === 'asc' ? 1 : -1;
                     return 0;
                  }
                  if (contributionsSortConfig.key === 'dispositivo') {
                     const artAIndex = currentArticles.findIndex(art => String(art.id) === String(a.articleId));
                     const artBIndex = currentArticles.findIndex(art => String(art.id) === String(b.articleId));
                     const orderA = artAIndex !== -1 ? artAIndex : 999999;
                     const orderB = artBIndex !== -1 ? artBIndex : 999999;
                     return contributionsSortConfig.direction === 'asc' ? orderA - orderB : orderB - orderA;
                  }
                  if (['texto_atual', 'texto_contribuicao', 'justificativa', 'justificativa_tecnica', 'texto_final'].includes(contributionsSortConfig.key)) {
                    const getArt = (c: any) => currentArticles.find(art => String(art.id) === String(c.articleId));
                    let aVal = "";
                    let bVal = "";
                    const artA = getArt(a);
                    const artB = getArt(b);
                    if (contributionsSortConfig.key === 'texto_atual') {
                      aVal = artA?.originalText || "";
                      bVal = artB?.originalText || "";
                    } else if (contributionsSortConfig.key === 'texto_contribuicao') {
                      aVal = a.proposedText || "";
                      bVal = b.proposedText || "";
                    } else if (contributionsSortConfig.key === 'justificativa') {
                      aVal = a.justification || "";
                      bVal = b.justification || "";
                    } else if (contributionsSortConfig.key === 'justificativa_tecnica') {
                      aVal = a.technicalJustification || artA?.finalJustification || "";
                      bVal = b.technicalJustification || artB?.finalJustification || "";
                    } else if (contributionsSortConfig.key === 'texto_final') {
                      aVal = artA?.finalText || artA?.proposedText || artA?.originalText || "";
                      bVal = artB?.finalText || artB?.proposedText || artB?.originalText || "";
                    }
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                    if (aVal < bVal) return contributionsSortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return contributionsSortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                  }
                }
                // Default sort (device order then date)
                const artAIndex = currentArticles.findIndex(art => String(art.id) === String(a.articleId));
                const artBIndex = currentArticles.findIndex(art => String(art.id) === String(b.articleId));
                const orderA = artAIndex !== -1 ? artAIndex : 999999;
                const orderB = artBIndex !== -1 ? artBIndex : 999999;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
              });

              const handleExportContributionsExcel = () => {
                  try {
                      const rows = sortedContributions.map((c) => {
                          const artIndex = currentArticles.findIndex(a => String(a.id) === String(c.articleId));
                          const originalArticle = artIndex !== -1 ? currentArticles[artIndex] : undefined;
                          
                          const row: any = {
                              "Data": formatDateBr(c.createdAt),
                          };
                          if (selectedTomada?.tipoResolucao === "alteracao") {
                              row["Texto Atual (Vigente)"] = originalArticle?.originalText || "Sem texto original cadastrado";
                          }
                          row["Texto Proposto em Consulta (Minuta)"] = originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || "");
                          row["Texto da Contribuição Sugerida"] = c.proposedText || "";
                          row["Justificativa da Contribuição"] = c.justification || "";
                          row["Participante"] = c.authorName || "";
                          row["Parecer"] = c.decision || "Aguardando Análise";
                          row["Justificativa Técnica"] = c.technicalJustification || originalArticle?.finalJustification || "";
                          row["Texto Final do Dispositivo"] = originalArticle?.finalText || originalArticle?.proposedText || originalArticle?.originalText || "";
                          return row;
                      });

                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(rows);
                      ws["!cols"] = [
                          { wch: 15 },
                          ...(selectedTomada?.tipoResolucao === "alteracao" ? [{ wch: 35 }] : []),
                          { wch: 35 },
                          { wch: 35 },
                          { wch: 35 },
                          { wch: 20 },
                          { wch: 20 },
                          { wch: 35 },
                          { wch: 35 },
                      ];
                      XLSX.utils.book_append_sheet(wb, ws, "Contribuições");

                      const viewType = publicContributionsView === "minhas" ? "Minhas" : "Todas";
                      const safeNumero = (selectedTomada?.numero || "participacao").replace(/[^a-zA-Z0-9_-]/g, "_");
                      XLSX.writeFile(wb, `Contribuicoes_${viewType}_${safeNumero}.xlsx`);
                      showToast("Exportação Concluída", "O arquivo Excel foi gerado com sucesso!", "success");
                  } catch (error) {
                      console.error(error);
                      showToast("Erro na Exportação", "Não foi possível gerar o arquivo Excel.", "error");
                  }
              };

              const handleExportContributionsPDF = () => {
                  try {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) {
                          showToast("Erro", "O bloqueador de pop-ups impediu a geração do PDF.", "error");
                          return;
                      }

                      const viewType = publicContributionsView === "minhas" ? "Minhas Contribuições" : "Todas as Contribuições";
                      const title = `${viewType} - ${selectedTomada?.numero || "N/A"}`;
                      
                      const escapeHtml = (unsafe: string) => {
                          return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
                      };

                      let html = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>${title}</title>
                          <style>
                            body { font-family: sans-serif; font-size: 11px; margin: 20px; color: #333; }
                            h1 { font-size: 16px; text-align: center; margin-bottom: 20px; text-transform: uppercase; color: #111; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
                            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 10px; }
                            pre { white-space: pre-wrap; font-family: inherit; margin: 0; font-size: 11px; }
                            @media print {
                              @page { margin: 1.5cm; size: landscape; }
                              body { margin: 0; }
                            }
                          </style>
                        </head>
                        <body>
                          <h1>${title}</h1>
                          <table>
                            <thead>
                              <tr>
                                <th style="width: 80px;">Data</th>
                                ${selectedTomada?.tipoResolucao === "alteracao" ? '<th style="width: 15%;">Texto Atual (Vigente)</th>' : ''}
                                <th style="width: 15%;">Minuta</th>
                                <th style="width: 15%;">Contribuição Sugerida</th>
                                <th style="width: 15%;">Justificativa Participante</th>
                                <th style="width: 100px;">Participante</th>
                                <th style="width: 80px;">Parecer</th>
                                <th style="width: 15%;">Justificativa Técnica</th>
                                <th style="width: 15%;">Texto Final</th>
                              </tr>
                            </thead>
                            <tbody>
                      `;

                      sortedContributions.forEach((c) => {
                          const artIndex = currentArticles.findIndex(a => String(a.id) === String(c.articleId));
                          const originalArticle = artIndex !== -1 ? currentArticles[artIndex] : undefined;
                          
                          const dataStr = escapeHtml(formatDateBr(c.createdAt));
                          const vigStr = escapeHtml(originalArticle?.originalText || "Sem texto original cadastrado");
                          const minStr = escapeHtml(originalArticle?.proposedText !== undefined ? originalArticle.proposedText : (originalArticle?.originalText || ""));
                          const sugStr = escapeHtml(c.proposedText || "");
                          const justStr = escapeHtml(c.justification || "");
                          const partStr = escapeHtml(c.authorName || "");
                          const parStr = escapeHtml(c.decision || "Aguardando Análise");
                          const jTechStr = escapeHtml(c.technicalJustification || originalArticle?.finalJustification || "");
                          const finStr = escapeHtml(originalArticle?.finalText || originalArticle?.proposedText || originalArticle?.originalText || "");

                          html += `
                          <tr>
                            <td>${dataStr}</td>
                            ${selectedTomada?.tipoResolucao === "alteracao" ? `<td><pre>${vigStr}</pre></td>` : ''}
                            <td><pre>${minStr}</pre></td>
                            <td><pre>${sugStr}</pre></td>
                            <td><pre>${justStr}</pre></td>
                            <td>${partStr}</td>
                            <td>${parStr}</td>
                            <td><pre>${jTechStr}</pre></td>
                            <td><pre>${finStr}</pre></td>
                          </tr>
                          `;
                      });

                      html += `
                            </tbody>
                          </table>
                        </body>
                        </html>
                      `;

                      printWindow.document.write(html);
                      printWindow.document.close();
                      
                      setTimeout(() => {
                        printWindow.print();
                      }, 500);

                  } catch (error: any) {
                      console.error("Erro ao gerar PDF:", error);
                      showToast("Erro na Exportação", "Não foi possível gerar o arquivo PDF.", "error");
                  }
              };

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <FileText size={18} className="text-indigo-600" />
                      {publicContributionsView === "minhas" ? "Minhas Contribuições" : "Todas as Contribuições"}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportContributionsPDF}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all group"
                        title="Exportar para PDF"
                      >
                        <Printer size={14} className="group-hover:scale-110 transition-transform" />
                        <span>Exportar PDF</span>
                      </button>
                      <button
                        onClick={handleExportContributionsExcel}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all group"
                        title="Exportar para Excel"
                      >
                        <FileSpreadsheet size={14} className="group-hover:scale-110 transition-transform" />
                        <span>Exportar Excel</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left min-w-[1300px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" onClick={() => handleSort('data')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-24">Data{getSortIcon('data')}</th>
                          {selectedTomada?.tipoResolucao === "alteracao" && (
                            <th scope="col" onClick={() => handleSort('texto_atual')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/5">Texto Atual (Vigente){getSortIcon('texto_atual')}</th>
                          )}
                          <th scope="col" onClick={() => handleSort('dispositivo')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/5">Texto Proposto em Consulta (Minuta){getSortIcon('dispositivo')}</th>
                          <th scope="col" onClick={() => handleSort('texto_contribuicao')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/5">Texto da Contribuição Sugerida{getSortIcon('texto_contribuicao')}</th>
                          <th scope="col" onClick={() => handleSort('justificativa')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-48">Justificativa da Contribuição{getSortIcon('justificativa')}</th>
                          <th scope="col" onClick={() => handleSort('participante')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-40">Participante{getSortIcon('participante')}</th>
                          <th scope="col" onClick={() => handleSort('parecer')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-36">Parecer{getSortIcon('parecer')}</th>
                          <th scope="col" onClick={() => handleSort('justificativa_tecnica')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/5">Justificativa Técnica{getSortIcon('justificativa_tecnica')}</th>
                          <th scope="col" onClick={() => handleSort('texto_final')} className="cursor-pointer hover:bg-slate-100 transition-colors px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider w-1/5">Texto Final do Dispositivo{getSortIcon('texto_final')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {sortedContributions.map(c => {
                          const artIndex = currentArticles.findIndex(a => String(a.id) === String(c.articleId));
                          const originalArticle = artIndex !== -1 ? currentArticles[artIndex] : undefined;
                          const originalText = originalArticle ? (originalArticle.proposedText !== undefined ? originalArticle.proposedText : originalArticle.originalText) : "Artigo não encontrado";
                          const diffResult = getSmartDiff(originalText, c.proposedText || "");
                          
                          const fText = originalArticle?.finalText || originalText;
                          const finalDiffParts = getSmartDiff(originalText, fText);
                          
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/40 transition-colors align-top">
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                                {formatDateBr(c.createdAt)}
                              </td>
                              {selectedTomada?.tipoResolucao === "alteracao" && (
                                <td className="px-4 py-4 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-normal">
                                  {originalArticle?.originalText || <span className="text-slate-400 italic">Sem texto original cadastrado</span>}
                                </td>
                              )}
                              <td className="px-4 py-4 text-xs">
                                <div className="mb-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                                    Dispositivo #{artIndex !== -1 ? artIndex + 1 : "?"}
                                  </span>
                                </div>
                                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed font-normal">
                                  {selectedTomada?.tipoResolucao === "alteracao" && originalArticle?.originalText
                                    ? renderDiffInline(originalArticle.originalText, originalArticle.proposedText)
                                    : originalText}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs">
                                <div className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                                  {diffResult.map((part, index) => {
                                    if (part.added) {
                                      return (
                                        <span key={index} className="text-emerald-950 font-bold bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded mx-0.5 inline-block">
                                          {part.value}
                                        </span>
                                      );
                                    }
                                    if (part.removed) {
                                      return (
                                        <span key={index} className="text-rose-950 bg-rose-100 border border-rose-300 px-1 py-0.5 rounded line-through decoration-rose-600 mx-0.5 inline-block font-medium">
                                          {part.value}
                                        </span>
                                      );
                                    }
                                    return <span key={index}>{part.value}</span>;
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {c.justification}
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-slate-800">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[11px] font-black text-slate-700 shrink-0">
                                    {c.authorName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="line-clamp-1 text-slate-900 font-bold">{c.authorName}</div>
                                    {c.authorEmail && (
                                      <div className="text-[10px] text-slate-400 font-normal truncate">{c.authorEmail}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs">
                                {c.decision ? (
                                  <span className={cn(
                                    "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border whitespace-nowrap",
                                    c.decision === "Acatada" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    c.decision === "Acatada Parcialmente" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    c.decision === "Não Acatada" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    c.decision === "Prejudicada" ? "bg-slate-100 text-slate-700 border-slate-300" :
                                    c.decision === "Retida para Estudos Adicionais" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  )}>
                                    {c.decision === "Acatada" || c.decision === "Acatada Parcialmente" ? (
                                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                    ) : c.decision === "Não Acatada" ? (
                                      <X size={12} className="text-rose-600 shrink-0" />
                                    ) : null}
                                    {c.decision}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                                    Aguardando Análise
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs">
                                {(c.technicalJustification || originalArticle?.finalJustification) ? (
                                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {c.technicalJustification || originalArticle?.finalJustification}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Pendente de justificativa técnica</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs">
                                {originalArticle?.finalText ? (
                                  <div className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed bg-indigo-50/30 p-2.5 rounded-lg border border-indigo-100/60">
                                    {finalDiffParts.map((part, pIdx) => {
                                      if (part.added) {
                                        return <span key={pIdx} className="bg-emerald-100 text-emerald-950 font-bold px-1 rounded mx-0.5 border border-emerald-300">{part.value}</span>;
                                      }
                                      if (part.removed) {
                                        return <span key={pIdx} className="bg-rose-100 text-rose-950 px-1 rounded mx-0.5 line-through decoration-rose-500 border border-rose-300">{part.value}</span>;
                                      }
                                      return <span key={pIdx}>{part.value}</span>;
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px] font-normal">Aguardando revisão final</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeView === "technical_analysis" && (
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => { setActiveView("list"); setSelectedTomada(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2 text-sm shadow-sm">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={20} />
                  Análise Técnica das Contribuições
                </h3>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200/60 overflow-hidden">
                {canViewAnalise && (
                  <button 
                    onClick={() => setAnalysisTab("contribuicoes")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 outline-none",
                      analysisTab === "contribuicoes" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <MessageSquare size={14} /> Contribuições
                  </button>
                )}
                {canViewPainel && (
                  <button 
                    onClick={() => setAnalysisTab("painel")}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 outline-none",
                      analysisTab === "painel" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <BarChart2 size={14} /> Painel das Contribuições
                  </button>
                )}
                {canViewMinuta && (
                  <>
                    <button 
                      onClick={() => setAnalysisTab("minuta")}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 outline-none",
                        analysisTab === "minuta" ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <ScrollText size={14} /> Minuta da Resolução
                    </button>
                  </>
                )}
              </div>
            </div>

            {analysisTab === "contribuicoes" && (() => {
              const articlesWithContributions = currentArticles.filter(art => {
                const artsContribs = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
                return artsContribs.length > 0;
              });
              const fullyAnalyzedCount = articlesWithContributions.filter(art => {
                const artsContribs = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
                return artsContribs.every(c => c.decision);
              }).length;
              const totalWithContributions = articlesWithContributions.length;

              const finalizedTextCount = currentArticles.filter(art => Boolean(art.finalText && art.finalText.trim().length > 0)).length;
              const totalArticlesCount = currentArticles.length;

              const filteredAnalysisArticles = currentArticles.filter(art => {
                const artsContribs = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
                if (analysisArticleFilter === "todos") return true;
                if (artsContribs.length === 0) return false;
                const isFullyAnalyzed = artsContribs.every(c => c.decision);
                if (analysisArticleFilter === "analisados") return isFullyAnalyzed;
                if (analysisArticleFilter === "pendentes") return !isFullyAnalyzed;
                return true;
              });

              return (
                <div className="space-y-6">
                  {/* Painel de Destaque e Filtro dos Dispositivos Analisados */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">CONTRIBUIÇÕES ANALISADAS</span>
                          {fullyAnalyzedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" /> {fullyAnalyzedCount} {fullyAnalyzedCount === 1 ? 'dispositivo analisado' : 'dispositivos analisados'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Nenhuma análise concluída ainda
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 font-medium mt-1">
                          Você analisou contribuições em <strong className="text-emerald-700 font-bold">{fullyAnalyzedCount}</strong> de <strong className="text-slate-900 font-bold">{totalWithContributions}</strong> dispositivos com contribuições.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl shrink-0">
                        <button
                          onClick={() => setAnalysisArticleFilter("todos")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            analysisArticleFilter === "todos"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          Todos ({currentArticles.length})
                        </button>
                        <button
                          onClick={() => setAnalysisArticleFilter("analisados")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                            analysisArticleFilter === "analisados"
                              ? "bg-white text-emerald-700 shadow-sm"
                              : "text-slate-600 hover:text-emerald-600"
                          )}
                        >
                          <CheckCircle2 size={14} /> Analisados ({fullyAnalyzedCount})
                        </button>
                        <button
                          onClick={() => setAnalysisArticleFilter("pendentes")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                            analysisArticleFilter === "pendentes"
                              ? "bg-white text-rose-700 shadow-sm"
                              : "text-slate-600 hover:text-rose-600"
                          )}
                        >
                          Pendentes ({totalWithContributions - fullyAnalyzedCount})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Painel de Destaque dos Dispositivos com Texto Final */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">TEXTO FINAL CONCLUÍDO</span>
                          {finalizedTextCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase tracking-wider border border-indigo-200">
                              <CheckCircle2 size={12} className="text-indigo-600" /> {finalizedTextCount} {finalizedTextCount === 1 ? 'redação finalizada' : 'redações finalizadas'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Nenhuma redação finalizada ainda
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 font-medium mt-1">
                          Você redigiu o texto final de <strong className="text-indigo-700 font-bold">{finalizedTextCount}</strong> de <strong className="text-slate-900 font-bold">{totalArticlesCount}</strong> dispositivos da norma.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {filteredAnalysisArticles.map((art, index) => {
                      const artsContribs = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
                      const actualArtIdx = currentArticles.findIndex(a => String(a.id) === String(art.id));
                      return (
                        <div key={art.id} className="relative">
                          <div className="absolute -left-3 top-4 bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
                            #{actualArtIdx + 1}
                          </div>
                          <TechnicalAnalysisArticle
                            article={art}
                            tipoResolucao={selectedTomada?.tipoResolucao}
                            contributions={artsContribs}
                            handleUpdateAnalysis={handleUpdateAnalysis}
                            handleUpdateFinalAnalysis={handleUpdateFinalAnalysis}
                            handleDeleteArticle={handleDeleteAnalysisArticle}
                          />
                        </div>
                      );
                    })}

                    {filteredAnalysisArticles.length === 0 && currentArticles.length > 0 && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-4xl mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-slate-700">Nenhum dispositivo encontrado para este filtro</h3>
                        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                          Altere o filtro acima para ver mais dispositivos.
                        </p>
                      </div>
                    )}

                    {currentArticles.length === 0 && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-4xl mx-auto">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-slate-700">Minuta Vazia</h3>
                        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                          Nenhum dispositivo encontrado nesta Participação Social.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {analysisTab === "painel" && (() => {
              // Dashboard logic
              const totalContribs = tomadaContributions.length;
              const acatadas = tomadaContributions.filter(c => c.decision === "Acatada" || c.decision === "Acatada Parcialmente").length;
              const naoAcatadas = tomadaContributions.filter(c => c.decision === "Não Acatada" || c.decision === "Prejudicada" || c.decision === "Retida para Estudos Adicionais").length;
              const aguardando = tomadaContributions.filter(c => !c.decision).length;

              const pieData = [
                { name: "Acatadas", value: acatadas, color: "#10b981" },
                { name: "Não Acatadas", value: naoAcatadas, color: "#f43f5e" },
                { name: "Aguardando", value: aguardando, color: "#cbd5e1" }
              ].filter(d => d.value > 0);

              const barData = currentArticles.map((art, i) => {
                const count = tomadaContributions.filter(c => String(c.articleId) === String(art.id)).length;
                return {
                  name: `Disp. #${i + 1}`,
                  value: count
                };
              }).filter(d => d.value > 0).sort((a,b) => b.value - a.value).slice(0, 10); // top 10

              // 1. Complexity Distribution
              const compAlta = tomadaContributions.filter(c => c.complexity === "Alta").length;
              const compMedia = tomadaContributions.filter(c => c.complexity === "Média").length;
              const compBaixa = tomadaContributions.filter(c => c.complexity === "Baixa").length;
              const compNaoDef = tomadaContributions.filter(c => !c.complexity).length;

              const complexityPieData = [
                { name: "Alta", value: compAlta, color: "#f43f5e" },
                { name: "Média", value: compMedia, color: "#f59e0b" },
                { name: "Baixa", value: compBaixa, color: "#10b981" },
                { name: "Não Classificada", value: compNaoDef, color: "#94a3b8" }
              ].filter(d => d.value > 0);

              // 2. Participant Ranking
              const participantMap = new Map<string, { count: number; acatadas: number; email: string }>();
              tomadaContributions.forEach(c => {
                const name = c.authorName || "Participante Anônimo";
                const current = participantMap.get(name) || { count: 0, acatadas: 0, email: c.authorEmail || "" };
                current.count += 1;
                if (c.decision === "Acatada" || c.decision === "Acatada Parcialmente") {
                  current.acatadas += 1;
                }
                if (!current.email && c.authorEmail) {
                  current.email = c.authorEmail;
                }
                participantMap.set(name, current);
              });

              const participantRankingData = Array.from(participantMap.entries())
                .map(([name, data]) => ({
                  name,
                  email: data.email,
                  value: data.count,
                  acatadas: data.acatadas
                }))
                .sort((a, b) => b.value - a.value);

              return (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <MessageSquare size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider">Total Contribuições</span>
                      </div>
                      <span className="text-2xl font-black text-slate-800">{totalContribs}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <AlertTriangle size={16} className="text-amber-500" /> <span className="text-[10px] font-bold uppercase tracking-wider">Aguardando Parecer</span>
                      </div>
                      <span className="text-2xl font-black text-amber-600">{aguardando}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <CheckCircle2 size={16} className="text-emerald-500" /> <span className="text-[10px] font-bold uppercase tracking-wider">Acatadas / Parciais</span>
                      </div>
                      <span className="text-2xl font-black text-emerald-600">{acatadas}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <X size={16} className="text-rose-500" /> <span className="text-[10px] font-bold uppercase tracking-wider">Não Acatadas / Outras</span>
                      </div>
                      <span className="text-2xl font-black text-rose-600">{naoAcatadas}</span>
                    </div>
                  </div>

                  {/* Row 1 Charts: Pareceres e Top Dispositivos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                        <span>Distribuição de Pareceres</span>
                        <span className="text-[10px] font-normal text-slate-400">Decisões técnicas</span>
                      </h4>
                      {pieData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={78} stroke="none">
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum parecer emitido ainda</div>
                      )}
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                        <span>Top 10 Dispositivos c/ Contribuições</span>
                        <span className="text-[10px] font-normal text-slate-400">Volume por dispositivo</span>
                      </h4>
                      {barData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                              <Bar dataKey="value" name="Contribuições" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum dado disponível</div>
                      )}
                    </div>
                  </div>

                  {/* Row 2 Charts: Complexidade e Ranking por Participante */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gráfico 3: Complexidade */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                        <span>Complexidade das Contribuições</span>
                        <span className="text-[10px] font-normal text-slate-400">Impacto regulatório</span>
                      </h4>
                      {complexityPieData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={complexityPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={78} stroke="none">
                                {complexityPieData.map((entry, index) => (
                                  <Cell key={`comp-cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhuma complexidade classificada ainda</div>
                      )}
                    </div>

                    {/* Gráfico 4: Ranking de Participantes */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Ranking de Participação Social
                          </h4>
                          <span className="text-[10px] text-slate-400">{participantRankingData.length} participante(s) identificados</span>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() => setParticipantRankingViewMode("bento")}
                            className={cn(
                              "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                              participantRankingViewMode === "bento"
                                ? "bg-white text-indigo-700 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            Lista
                          </button>
                          <button
                            type="button"
                            onClick={() => setParticipantRankingViewMode("chart")}
                            className={cn(
                              "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                              participantRankingViewMode === "chart"
                                ? "bg-white text-indigo-700 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            Gráfico
                          </button>
                        </div>
                      </div>

                      {participantRankingData.length > 0 ? (
                        participantRankingViewMode === "chart" ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                layout="vertical"
                                data={participantRankingData.slice(0, 7)}
                                margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }}
                                  width={110}
                                  tickFormatter={(val) => val.length > 15 ? `${val.slice(0, 13)}...` : val}
                                />
                                <Tooltip
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                />
                                <Bar dataKey="value" name="Contribuições" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {participantRankingData.map((part, idx) => (
                              <div
                                key={part.name}
                                className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                                    idx === 0 ? "bg-amber-100 text-amber-700" :
                                    idx === 1 ? "bg-slate-200 text-slate-700" :
                                    idx === 2 ? "bg-amber-800/10 text-amber-900" : "bg-slate-100 text-slate-500"
                                  )}>
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate" title={part.name}>
                                      {part.name}
                                    </div>
                                    {part.email && (
                                      <div className="text-[10px] text-slate-400 truncate" title={part.email}>
                                        {part.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {part.acatadas > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700">
                                      {part.acatadas} acatada(s)
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {part.value} {part.value === 1 ? 'prop.' : 'prop.'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">Nenhum participante registrado ainda</div>
                      )}
                    </div>
                  </div>

                  {/* Consolidado Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                          <FileCode size={18} className="text-indigo-600" /> 
                          Quadro Consolidado da Redação Final
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Comparativo detalhado entre a minuta em consulta e o texto final aprovado.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportConsolidadoPDF}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-sm hover:shadow transition-all group shrink-0"
                          title="Imprimir ou Exportar para PDF"
                        >
                          <Printer size={15} className="group-hover:scale-110 transition-transform" />
                          <span>Exportar PDF</span>
                        </button>
                        <button
                          onClick={handleExportConsolidadoExcel}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm hover:shadow transition-all group shrink-0"
                          title="Exportar tabela consolidada e contribuições para Excel (.xlsx)"
                        >
                          <FileSpreadsheet size={15} className="group-hover:scale-110 transition-transform" />
                          <span>Exportar Excel</span>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-white border-b border-slate-200">
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Nº</th>
                            {selectedTomada?.tipoResolucao === "alteracao" && (
                              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-1/5">Texto Atual (Vigente)</th>
                            )}
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-1/4">Texto Proposto em Consulta (Minuta)</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-1/4">Texto Final do Dispositivo</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-1/4">Justificativa Técnica</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-32">Contribuições</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentArticles.map((art, idx) => {
                            const cArt = tomadaContributions.filter(c => String(c.articleId) === String(art.id));
                            const a = cArt.filter(c => c.decision === "Acatada" || c.decision === "Acatada Parcialmente").length;
                            const na = cArt.filter(c => c.decision === "Não Acatada" || c.decision === "Prejudicada" || c.decision === "Retida para Estudos Adicionais").length;
                            
                            const origText = art.proposedText || art.originalText || "";
                            const fText = art.finalText || origText;
                            const diffParts = getSmartDiff(origText, fText);

                            return (
                              <React.Fragment key={art.id}>
                                <tr className="hover:bg-slate-50/50 align-top transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black">
                                      {idx + 1}
                                    </div>
                                  </td>
                                  {selectedTomada?.tipoResolucao === "alteracao" && (
                                    <td className="px-4 py-4 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-normal">
                                      {art.originalText || <span className="text-slate-400 italic">Sem texto original cadastrado</span>}
                                    </td>
                                  )}
                                  <td className="px-4 py-4 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {selectedTomada?.tipoResolucao === "alteracao" && art.originalText
                                      ? renderDiffInline(art.originalText, art.proposedText)
                                      : origText}
                                  </td>
                                  <td className="px-4 py-4 text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed bg-indigo-50/30">
                                    {art.finalText ? (
                                      diffParts.map((part, pIdx) => {
                                        if (part.added) {
                                          return <span key={pIdx} className="bg-emerald-100 text-emerald-950 font-bold px-1 rounded mx-0.5 border border-emerald-300">{part.value}</span>;
                                        }
                                        if (part.removed) {
                                          return <span key={pIdx} className="bg-rose-100 text-rose-950 px-1 rounded mx-0.5 line-through decoration-rose-500 border border-rose-300">{part.value}</span>;
                                        }
                                        return <span key={pIdx}>{part.value}</span>;
                                      })
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px] font-normal">Aguardando revisão final</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4 text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                    {art.finalJustification ? (
                                      art.finalJustification
                                    ) : (
                                      <span className="text-slate-400 italic">Sem justificativa final</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        <MessageSquare size={12} /> {cArt.length} Total
                                      </div>
                                      {a > 0 && (
                                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                                          <CheckCircle2 size={12} /> {a} Acatadas
                                        </div>
                                      )}
                                      {na > 0 && (
                                        <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-100 text-[10px] font-black uppercase tracking-wider">
                                          <X size={12} /> {na} Rejeitadas
                                        </div>
                                      )}
                                      {cArt.length > 0 && (
                                        <button 
                                          onClick={() => setExpandedRowArtId(expandedRowArtId === art.id ? null : art.id)}
                                          className="mt-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-[10px] font-black uppercase tracking-wider transition-colors text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                                        >
                                          {expandedRowArtId === art.id ? <ChevronUp size={12} /> : <Eye size={12} />}
                                          {expandedRowArtId === art.id ? "Ocultar" : "Ver Contribuições"}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {expandedRowArtId === art.id && (
                                  <tr>
                                    <td colSpan={selectedTomada?.tipoResolucao === "alteracao" ? 6 : 5} className="p-0 border-b border-slate-200 bg-slate-50/50">
                                      <div className="p-6 border-t border-slate-200 shadow-inner">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Contribuições Recebidas ({cArt.length})</h4>
                                        <div className="space-y-4">
                                          {cArt.map(c => (
                                            <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                                                    {c.authorName.charAt(0).toUpperCase()}
                                                  </div>
                                                  <span className="text-sm font-bold text-slate-700">{c.authorName}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] font-bold">
                                                  <div className="flex items-center gap-2 text-slate-500 uppercase">
                                                    COMPLEXIDADE: <span className="text-slate-700">{c.complexity || "N/A"}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2 text-slate-500 uppercase">
                                                    PARECER TÉCNICO: <span className="text-slate-700">{c.decision || "N/A"}</span>
                                                  </div>
                                                  {c.decision === "Acatada" || c.decision === "Acatada Parcialmente" ? (
                                                    <Check className="text-emerald-500" size={14} />
                                                  ) : (c.decision ? <X className="text-rose-500" size={14} /> : null)}
                                                </div>
                                              </div>
                                              <div className="grid grid-cols-1 lg:grid-cols-2">
                                                <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
                                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Texto da Contribuição Sugerida (Com destaques)</span>
                                                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                    {(() => {
                                                      const cOrigText = art.proposedText || art.originalText || "";
                                                      const cDiffParts = getSmartDiff(cOrigText, c.proposedText || "");
                                                      return cDiffParts.map((part, i) => (
                                                        part.added ? <span key={i} className="bg-emerald-100 text-emerald-950 font-bold px-1 rounded mx-0.5 border border-emerald-300">{part.value}</span> :
                                                        part.removed ? <span key={i} className="bg-rose-100 text-rose-950 px-1 rounded mx-0.5 line-through decoration-rose-500 border border-rose-300">{part.value}</span> :
                                                        <span key={i}>{part.value}</span>
                                                      ));
                                                    })()}
                                                  </div>
                                                </div>
                                                <div className="p-4 bg-slate-50/50 flex flex-col gap-4">
                                                  <div>
                                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Justificativa do Participante</span>
                                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{c.justification}</p>
                                                  </div>
                                                  <div className="pt-4 border-t border-slate-200">
                                                    <span className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5">Justificativa Técnica (Resposta)</span>
                                                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm text-slate-700 min-h-[60px] whitespace-pre-wrap leading-relaxed">
                                                      {c.technicalJustification || <span className="text-slate-400 italic">Nenhuma justificativa técnica inserida.</span>}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                          
                          {currentArticles.length === 0 && (
                            <tr>
                              <td colSpan={selectedTomada?.tipoResolucao === "alteracao" ? 6 : 5} className="px-4 py-8 text-center text-sm font-medium text-slate-400">
                                Nenhum dispositivo encontrado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {analysisTab === "minuta" && (() => {
              // 1. Types for Granular Legal Subunits
              type SubunitType = "caput" | "artigo_inserido" | "paragrafo" | "inciso" | "alinea" | "item" | "outro";
              type SubunitStatus = "acrescido" | "alterado" | "inalterado";

              interface LegalSubunit {
                id: string; // e.g. "caput", "art_1a", "art_1_a", "par_1", "par_1-a", "par_unico", "inciso_VI", "alinea_a", "item_1.1"
                type: SubunitType;
                label: string; // e.g. "Caput", "Art. 1Aº", "Art. 1º-A", "§ 1º", "§ 1º-A", "Parágrafo único", "Inciso VI"
                text: string; // Full text of this subunit
                orderIndex: number;
              }

              interface AnalyzedSubunit extends LegalSubunit {
                status: SubunitStatus;
                originalTextSnippet?: string;
                isOverridden?: boolean;
              }

              interface AnalyzedArticle {
                article: Article;
                artLabel: string;
                isEntireArticleNew: boolean;
                subunits: AnalyzedSubunit[];
                deletedSubunits: LegalSubunit[];
                acrescidosCount: number;
                alteradosCount: number;
                inalteradosCount: number;
                hasAcrescido: boolean;
                hasAlterado: boolean;
                hasRevogado: boolean;
              }

              // 2. Parser function: breaks legal text into granular subunits (Caput, Novos Artigos Inseridos, Parágrafos, Incisos, Alíneas, Itens)
              const parseLegalSubunits = (rawText: string): LegalSubunit[] => {
                if (!rawText || !rawText.trim()) return [];

                // Safe line breaker: if an Art., §, Parágrafo único, or Inciso starts after punctuation/space, ensure it separates onto a new line
                let preparedText = rawText;
                preparedText = preparedText.replace(/([.;:])\s*(Art(?:igo)?\.?\s*[0-9]+(?:\s*[ºª])?(?:[\s\-_]*[A-Za-z0-9]+)*(?:\s*[ºª])?[\.:\s\-–—]+)/gi, "$1\n$2");
                preparedText = preparedText.replace(/(^|[\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\.?)\s+)?(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi, (match, p1, prep, subunit) => {
                  if (prep) return match;
                  return p1 + "\n" + subunit;
                });
                preparedText = preparedText.replace(/(^|[^a-zA-Z])([IVXLCDM]+\s*[-–—\.]\s*)/g, (match, p1, p2) => {
                  // Roman numerals can be tricky, but if they have a dash/dot and spaces, it's likely an inciso.
                  // E.g. " I - " or " I. "
                  // Avoid if preceded by "Título", "Capítulo", "Seção"
                  if (p1.match(/t[íi]tulo\s*$|cap[íi]tulo\s*$|se[çc][ãa]o\s*$/i)) return match;
                  return p1 + "\n" + p2;
                });

                const lines = preparedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const subunits: LegalSubunit[] = [];
                let currentSubunit: LegalSubunit | null = null;
                let counter = 0;

                for (const line of lines) {
                  const cleanLine = line.replace(/^["'“]+/, "").replace(/["'”]+$/, "").trim();
                  if (!cleanLine) continue;

                  // Regex patterns
                  // A. Parágrafo: § 1º, § 1º-A, § 2, Parágrafo único
                  const parMatch = cleanLine.match(/^(?:§\s*([0-9]+[ºª]?(?:-[A-Za-z0-9]+)?)|Par[aá]grafo\s+[uú]nico)[\.:\s\-–—]*/i);
                  // B. Inciso: Roman numerals I -, II -, VI -, VII -, etc.
                  const incisoMatch = cleanLine.match(/^([IVXLCDM]+)\s*[-–—\.]\s*(.*)$/i);
                  // C. Alínea: a), b), c), etc.
                  const alineaMatch = cleanLine.match(/^([a-z])\)\s*(.*)$/i);
                  // D. Item: 1.1., 8.1.1., etc.
                  const itemMatch = cleanLine.match(/^([0-9]+(?:\.[0-9]+)+)\.?\s*[-–—\.]?\s*(.*)$/);
                  // E. Art / Caput: Art. 1º, Artigo 2º, Art. 1Aº, Art. 1º-A, Art. 1-A, Art. 1A, Art. 5º-D, etc.
                  const artMatch = cleanLine.match(/^Art(?:igo)?\.?\s*([0-9]+(?:[ºª])?(?:[-_]?[A-Za-z]{1,3})?(?:[ºª])?)(?:[\.:\s\-–—]+|$)/i);

                  if (artMatch) {
                    const hasRealCaput = subunits.some(s => s.type === "caput" && s.label.startsWith("Art.")) || 
                                         (currentSubunit && currentSubunit.type === "caput" && currentSubunit.label.startsWith("Art."));
                                         
                    if (!hasRealCaput) {
                      // First article encountered in this text block -> Caput of the base article
                      if (currentSubunit) {
                        // If there was text before this (e.g., a Chapter heading), demote it from caput to "outro"
                        if (currentSubunit.type === "caput") {
                           currentSubunit.id = `texto_intro_${currentSubunit.orderIndex}`;
                           currentSubunit.type = "outro";
                           currentSubunit.label = "Introdução";
                        }
                        subunits.push(currentSubunit);
                      }
                      counter++;
                      const rawNum = artMatch[1].trim();
                      currentSubunit = {
                        id: "caput",
                        type: "caput",
                        label: `Art. ${rawNum}`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    } else {
                      // Encountered a NEW article header (e.g. Art. 1Aº, Art. 1º-A) inserted within the same entry!
                      if (currentSubunit) subunits.push(currentSubunit);
                      counter++;
                      const rawNum = artMatch[1].trim();
                      const cleanId = rawNum.toLowerCase().replace(/[^a-z0-9]/g, "_");
                      currentSubunit = {
                        id: `art_${cleanId}`,
                        type: "artigo_inserido",
                        label: `Art. ${rawNum}`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  } else if (parMatch) {
                    // If active subunit is an inserted article (e.g. Art. 1Aº), keep internal paragraphs inside that article
                    if (currentSubunit && currentSubunit.type === "artigo_inserido") {
                      currentSubunit.text += `\n${cleanLine}`;
                    } else {
                      if (currentSubunit) subunits.push(currentSubunit);
                      counter++;
                      const isUnico = /par[aá]grafo\s+[uú]nico/i.test(parMatch[0]);
                      const parNum = isUnico ? "unico" : (parMatch[1] || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
                      const label = isUnico ? "Parágrafo único" : `§ ${parMatch[1] || ""}`;
                      currentSubunit = {
                        id: `par_${parNum}`,
                        type: "paragrafo",
                        label,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  } else if (incisoMatch) {
                    // If active subunit is an inserted article, keep internal incisos inside that article
                    if (currentSubunit && currentSubunit.type === "artigo_inserido") {
                      currentSubunit.text += `\n${cleanLine}`;
                    } else {
                      if (currentSubunit) subunits.push(currentSubunit);
                      counter++;
                      const roman = incisoMatch[1].toUpperCase();
                      currentSubunit = {
                        id: `inciso_${roman}`,
                        type: "inciso",
                        label: `Inciso ${roman}`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  } else if (alineaMatch) {
                    if (currentSubunit && currentSubunit.type === "artigo_inserido") {
                      currentSubunit.text += `\n${cleanLine}`;
                    } else {
                      if (currentSubunit) subunits.push(currentSubunit);
                      counter++;
                      const letter = alineaMatch[1].toLowerCase();
                      currentSubunit = {
                        id: `alinea_${letter}`,
                        type: "alinea",
                        label: `Alínea ${letter})`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  } else if (itemMatch) {
                    if (currentSubunit && currentSubunit.type === "artigo_inserido") {
                      currentSubunit.text += `\n${cleanLine}`;
                    } else {
                      if (currentSubunit) subunits.push(currentSubunit);
                      counter++;
                      const itemNum = itemMatch[1];
                      currentSubunit = {
                        id: `item_${itemNum}`,
                        type: "item",
                        label: `Item ${itemNum}`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  } else {
                    // Line is continuation of the active subunit (e.g. multi-line paragraph or formula)
                    if (currentSubunit) {
                      currentSubunit.text += `\n${cleanLine}`;
                    } else {
                      counter++;
                      currentSubunit = {
                        id: counter === 1 ? "caput" : `item_lin_${counter}`,
                        type: counter === 1 ? "caput" : "outro",
                        label: counter === 1 ? "Caput" : `Dispositivo ${counter}`,
                        text: cleanLine,
                        orderIndex: counter
                      };
                    }
                  }
                }

                if (currentSubunit) {
                  subunits.push(currentSubunit);
                }

                // Ensure every subunit within this article has a strictly unique id
                const idCounts: Record<string, number> = {};
                const deduplicatedSubunits: LegalSubunit[] = subunits.map((sub, idx) => {
                  const baseId = sub.id || `unit_${idx + 1}`;
                  idCounts[baseId] = (idCounts[baseId] || 0) + 1;
                  const uniqueId = idCounts[baseId] === 1 ? baseId : `${baseId}_${idCounts[baseId]}`;
                  return {
                    ...sub,
                    id: uniqueId,
                    orderIndex: sub.orderIndex || (idx + 1)
                  };
                });

                return deduplicatedSubunits;
              };

              // 3. Normalizer helper for text comparison
              const normalizeLegalText = (str: string): string => {
                return (str || "")
                  .toLowerCase()
                  .replace(/[“”"'`]/g, "")
                  .replace(/[;\.,\s]+$/g, "")
                  .replace(/\s+/g, " ")
                  .trim();
              };

              // 4. Helper: Extract standard article label like "Art. 2º", "Art. 5º-C", "Art. 31"
              const extractArticleLabel = (text: string, defaultOrder: number): string => {
                if (!text) return `Art. ${defaultOrder}º`;
                const clean = text.replace(/^["'“\s]+/, "").trim();
                
                const artMatch = clean.match(/^Art(?:igo)?\.?\s*([0-9]+(?:[ºª])?(?:[-_]?[A-Za-z]{1,3})?(?:[ºª])?)(?:[\.:\s\-–—]+|$)/i);
                if (artMatch && artMatch[1]) {
                  return `Art. ${artMatch[1].trim()}`;
                }
                
                const clausulaMatch = clean.match(/^Cl[aá]usula\s+([A-Za-z0-9ºª]+)/i);
                if (clausulaMatch && clausulaMatch[1]) {
                  return `Cláusula ${clausulaMatch[1]}`;
                }
                
                const tabelaMatch = clean.match(/^Tabela\s+([A-Za-z0-9]+)/i);
                if (tabelaMatch && tabelaMatch[1]) {
                  return `Tabela ${tabelaMatch[1]}`;
                }
                
                return `Art. ${defaultOrder}º`;
              };

              // 5. Helper: Format Portuguese list of articles, e.g., "2º, 5º, 5º-C, 8º, 20 e 31"
              const formatArticleListInPortuguese = (labels: string[]): string => {
                const cleanedNumbers = labels.map(l => l.replace(/^Art(?:igo)?\.?\s*/i, "").trim()).filter(Boolean);
                const unique = Array.from(new Set(cleanedNumbers));
                if (unique.length === 0) return "artigos alterados";
                if (unique.length === 1) return `${unique[0]}`;
                if (unique.length === 2) return `${unique[0]} e ${unique[1]}`;
                return `${unique.slice(0, -1).join(", ")} e ${unique[unique.length - 1]}`;
              };

              // 6. Helper: Format quoted device string with standard Adasa quotation
              const formatQuotedDevice = (rawText: string): string => {
                const trimmed = (rawText || "").trim();
                if (!trimmed) return '""';
                const startsQuote = trimmed.startsWith('"') || trimmed.startsWith('“');
                const endsQuote = trimmed.endsWith('"') || trimmed.endsWith('”');
                return `${startsQuote ? '' : '"'}${trimmed}${endsQuote ? '' : '"'}`;
              };

              // 7. STRICT INCLUSION FILTER: Only include articles with saved Final Text (finalText)
              const articlesWithFinalText = currentArticles.filter(art => Boolean(art.finalText && art.finalText.trim().length > 0));

              // 8. Granular Decomposition & Analysis of each Article
              const analyzedArticles: AnalyzedArticle[] = articlesWithFinalText.map((art, idx) => {
                const baseLabelSource = (art.originalText && art.originalText.trim()) || (art.finalText && art.finalText.trim()) || "";
                const artLabel = extractArticleLabel(baseLabelSource, art.order || idx + 1);
                
                const origRaw = (art.originalText || "").trim();
                const isEntireArticleNew = !origRaw || 
                  origRaw === "-" || 
                  /^(\[novo\]|\(novo\)|novo\s+artigo|novo\s+dispositivo|acrescido|\(ac\)|\[acrescido\])/i.test(origRaw) ||
                  minutaClassificationOverrides[art.id] === "acrescido";

                const origSubunits = isEntireArticleNew ? [] : parseLegalSubunits(origRaw);
                const finSubunits = parseLegalSubunits(art.finalText || "");

                const analyzedSubunits: AnalyzedSubunit[] = finSubunits.map(finUnit => {
                  const overrideKey = `${art.id}_${finUnit.id}`;
                  const userOverride = minutaSubunitOverrides[overrideKey];

                  if (isEntireArticleNew) {
                    return {
                      ...finUnit,
                      status: (userOverride || "acrescido") as SubunitStatus,
                      isOverridden: Boolean(userOverride)
                    };
                  }

                  // If this is an inserted article (e.g. Art. 1Aº, Art. 1º-A)
                  if (finUnit.type === "artigo_inserido") {
                    const origMatch = origSubunits.find(o => o.id === finUnit.id);
                    let status: SubunitStatus = "acrescido";
                    if (userOverride) {
                      status = userOverride as SubunitStatus;
                    } else if (origMatch) {
                      const normFin = normalizeLegalText(finUnit.text);
                      const normOrig = normalizeLegalText(origMatch.text);
                      status = normFin !== normOrig ? "alterado" : "inalterado";
                    } else {
                      // Not present in original text -> ACRESCIDO
                      status = "acrescido";
                    }

                    return {
                      ...finUnit,
                      status,
                      originalTextSnippet: origMatch?.text,
                      isOverridden: Boolean(userOverride)
                    };
                  }

                  const origMatch = origSubunits.find(o => o.id === finUnit.id);
                  let status: SubunitStatus = "inalterado";

                  if (userOverride) {
                    status = userOverride as SubunitStatus;
                  } else if (!origMatch) {
                    // New paragraph, inciso, alínea inserted into existing article -> ACRESCIDO
                    status = "acrescido";
                  } else {
                    // Existed in original -> check if text changed
                    const normFin = normalizeLegalText(finUnit.text);
                    const normOrig = normalizeLegalText(origMatch.text);
                    if (normFin !== normOrig) {
                      status = "alterado";
                    } else {
                      status = "inalterado";
                    }
                  }

                  return {
                    ...finUnit,
                    status,
                    originalTextSnippet: origMatch?.text,
                    isOverridden: Boolean(userOverride)
                  };
                });

                const deletedSubunits: LegalSubunit[] = isEntireArticleNew ? [] : origSubunits.filter(o => {
                  return !finSubunits.some(f => f.id === o.id);
                });

                const acrescidosCount = analyzedSubunits.filter(s => s.status === "acrescido").length;
                const alteradosCount = analyzedSubunits.filter(s => s.status === "alterado" && s.type !== "artigo_inserido").length;
                const inalteradosCount = analyzedSubunits.filter(s => s.status === "inalterado").length;
                const hasRevogado = deletedSubunits.length > 0;

                return {
                  article: art,
                  artLabel,
                  isEntireArticleNew,
                  subunits: analyzedSubunits,
                  deletedSubunits,
                  acrescidosCount,
                  alteradosCount,
                  inalteradosCount,
                  hasAcrescido: isEntireArticleNew || acrescidosCount > 0 || analyzedSubunits.some(s => s.type === "artigo_inserido"),
                  hasAlterado: !isEntireArticleNew && alteradosCount > 0,
                  hasRevogado
                };
              });

              // Articles that contain at least one Acrescido (go to Art. 1º)
              const articlesWithAcrescidos = analyzedArticles.filter(a => a.hasAcrescido);
              // Articles that contain at least one Alterado (go to Art. 2º)
              const articlesWithAlterados = analyzedArticles.filter(a => a.hasAlterado);

              // Extract altered labels for Art. 2º preamble
              const labelsAlterados = articlesWithAlterados.map(a => a.artLabel);
              const formattedAlteradosLabels = formatArticleListInPortuguese(labelsAlterados);

              // Pre-calculate ementa default if not set
              const defaultEmenta = minutaModel === "nova" 
                ? (selectedTomada.objeto || "Dispõe sobre os procedimentos e diretrizes regulatórias e dá outras providências.")
                : `Altera a ${minutaResolucoesAlteradas}, e dá outras providências.`;

              const effectiveEmenta = minutaEmenta.trim() ? minutaEmenta : defaultEmenta;
              const consultNumber = selectedTomada.numero || "001/2026";
              const meiodePart = selectedTomada.meioParticipacao || "Consulta Pública";

              // 9. Format Article Block for Art. 1º (Acréscimos)
              const buildAcrescidoArticleText = (ana: AnalyzedArticle): string => {
                if (ana.isEntireArticleNew) {
                  return formatQuotedDevice(ana.article.finalText || "");
                }

                // Subunits added to an existing article
                const insertedArticles = ana.subunits.filter(s => s.type === "artigo_inserido");
                const addedSubunits = ana.subunits.filter(s => s.status === "acrescido" && s.type !== "artigo_inserido");

                if (insertedArticles.length === 0 && addedSubunits.length === 0) return "";

                const blocks: string[] = [];

                // A. Independent inserted full articles (e.g. Art. 1Aº, Art. 1º-A)
                for (const ins of insertedArticles) {
                  blocks.push(formatQuotedDevice(ins.text));
                }

                // B. Added paragraphs/incisos to the base article
                if (addedSubunits.length > 0) {
                  let baseBlock = `${ana.artLabel}. ..............................................................................................\n`;
                  baseBlock += `............................................................................................................\n`;
                  baseBlock += addedSubunits.map(u => u.text).join("\n\n");
                  blocks.push(formatQuotedDevice(baseBlock));
                }

                return blocks.join("\n\n");
              };

              // 10. Format Article Block for Art. 2º (Novas Redações)
              const buildAlteradoArticleText = (ana: AnalyzedArticle): string => {
                if (ana.isEntireArticleNew) return "";

                const alteredUnits = ana.subunits.filter(s => s.status === "alterado" && s.type !== "artigo_inserido");
                if (alteredUnits.length === 0) return "";

                const caputAltered = alteredUnits.find(s => s.type === "caput");
                const otherAltered = alteredUnits.filter(s => s.type !== "caput");

                let block = "";
                if (caputAltered) {
                  block += caputAltered.text;
                  if (otherAltered.length > 0) {
                    block += "\n\n" + otherAltered.map(u => u.text).join("\n\n");
                  }
                  if (ana.inalteradosCount > 0) {
                    block += "\n.................................................................................................";
                  }
                } else {
                  // Caput unchanged, specific incisos or parágrafos changed
                  block += `${ana.artLabel}. ..............................................................................................\n`;
                  block += `............................................................................................................\n`;
                  block += otherAltered.map(u => u.text).join("\n\n");
                  if (ana.inalteradosCount > 0) {
                    block += "\n.................................................................................................";
                  }
                }

                return formatQuotedDevice(block);
              };

              // 10.5. Format Article Block for Art. 3º (Revogados)
              const articlesWithRevogados = analyzedArticles.filter(a => a.hasRevogado);
              const buildRevogadosText = (articles: AnalyzedArticle[], base: string): string => {
                const items: string[] = [];
                for (const ana of articles) {
                  const art = ana.artLabel.toLowerCase();
                  const isFullArticle = ana.deletedSubunits.some(s => s.type === "caput") && ana.subunits.length === 0; 
                  
                  if (isFullArticle) {
                     items.push(`o ${art}`);
                  } else {
                     const labels = ana.deletedSubunits.map(s => s.label.toLowerCase()); 
                     const formattedLabels = labels.map(l => {
                       if (l.startsWith("alínea") || l.startsWith("alinea")) return `a ${l}`;
                       if (l.startsWith("§") || l.startsWith("parágrafo") || l.startsWith("paragrafo")) return `o ${l}`;
                       if (l.startsWith("inciso")) return `o ${l}`;
                       return `o ${l}`;
                     });

                     let labelStr = "";
                     if (formattedLabels.length === 1) {
                       labelStr = formattedLabels[0];
                     } else if (formattedLabels.length === 2) {
                       labelStr = `${formattedLabels[0]} e ${formattedLabels[1]}`;
                     } else {
                       const last = formattedLabels.pop();
                       labelStr = `${formattedLabels.join(", ")} e ${last}`;
                     }
                     
                     items.push(`${labelStr}, do ${art}`);
                  }
                }

                if (items.length === 0) return "";
                
                let combined = "";
                let isPlural = false;
                
                if (items.length === 1) {
                  combined = items[0];
                  if (combined.includes(" e ")) isPlural = true;
                } else if (items.length === 2) {
                  combined = `${items[0]} e ${items[1]}`;
                  isPlural = true;
                } else {
                  const last = items.pop();
                  combined = `${items.join(", ")} e ${last}`;
                  isPlural = true;
                }

                if (isPlural) {
                  return `Ficam revogados ${combined}, da ${base}.`;
                }
                return `Fica revogado ${combined}, da ${base}.`;
              };

              // 11. Build plain text for copy/export
              const generatePlainTextMinuta = () => {
                let text = `Governo do Distrito Federal\nAgência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal\nSecretaria Geral\n\n`;
                text += `${(minutaTipoAto || "RESOLUÇÃO").toUpperCase()} Nº ${minutaNumero}, DE ${minutaData}.\n\n`;
                text += `${effectiveEmenta}\n\n`;
                text += `O DIRETOR-PRESIDENTE DA AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL – Adasa, Ad Referendum da Diretoria Colegiada, no uso das atribuições que lhe confere o art. 7º, inciso III, do Regimento Interno desta Agência, aprovado pela Resolução nº 16, de 17 de setembro de 2014, tendo em vista o que dispõe o art. 23, inciso II e VII, da Lei n.º 4.285, 26 de dezembro de 2008, o constante no processo SEI nº ${minutaProcessoSEI}, as contribuições da ${meiodePart} nº ${consultNumber}, e\n\n`;
                
                if (minutaConsiderandos.trim()) {
                  const considerandosList = minutaConsiderandos.split("\n").filter(c => c.trim());
                  considerandosList.forEach(c => {
                    const cleanC = c.trim().replace(/;$/, "");
                    text += `${cleanC};\n\n`;
                  });
                }
                
                text += `RESOLVE:\n\n`;

                if (minutaModel === "nova") {
                  if (articlesWithFinalText.length === 0) {
                    text += `[Nenhum dispositivo com texto final cadastrado. Salve a revisão e texto final dos dispositivos na aba de Análise Técnica.]\n\n`;
                  } else {
                    articlesWithFinalText.forEach((art) => {
                      const body = (art.finalText && art.finalText.trim()) || "";
                      text += `${body.trim()}\n\n`;
                    });
                  }
                } else {
                  // Alteração de Norma Existente
                  if (articlesWithFinalText.length === 0) {
                    text += `[Nenhum dispositivo com texto final cadastrado. Apenas artigos com texto final salvo na aba 'Análise das Contribuições' são incluídos na minuta.]\n\n`;
                  } else {
                    let artigoAtoIndex = 1;

                    // 1. Dispositivos Acrescidos (Novos Artigos / Novos Parágrafos / Novos Incisos)
                    if (articlesWithAcrescidos.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. A ${minutaResolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:\n\n`;
                      artigoAtoIndex++;

                      articlesWithAcrescidos.forEach((ana) => {
                        const block = buildAcrescidoArticleText(ana);
                        if (block) text += `${block}\n\n`;
                      });
                    }

                    // 2. Dispositivos com Nova Redação
                    if (articlesWithAlterados.length > 0) {
                      const isSingular = articlesWithAlterados.length === 1 && !formattedAlteradosLabels.startsWith("Cláusula") && !formattedAlteradosLabels.startsWith("Tabela");
                      if (isSingular) {
                        text += `Art. ${artigoAtoIndex}º. O art. ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passa a vigorar com a seguinte redação:\n\n`;
                      } else {
                        text += `Art. ${artigoAtoIndex}º. Os artigos ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passam a vigorar com as seguintes redações:\n\n`;
                      }
                      artigoAtoIndex++;

                      articlesWithAlterados.forEach((ana) => {
                        const block = buildAlteradoArticleText(ana);
                        if (block) text += `${block}\n\n`;
                      });
                    }

                    // 3. Dispositivos Revogados
                    if (articlesWithRevogados.length > 0) {
                      const block = buildRevogadosText(articlesWithRevogados, minutaResolucoesAlteradas);
                      if (block) {
                        text += `Art. ${artigoAtoIndex}º. ${block}\n\n`;
                        artigoAtoIndex++;
                      }
                    }

                    // 4. Disposição de Vigência
                    text += `Art. ${artigoAtoIndex}º. ${minutaVigencia.trim()}\n\n`;
                  }
                }

                text += `\n${minutaAssinante}\n`;
                text += `Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal - Adasa\n`;
                return text;
              };

              const handleCopyMinuta = () => {
                const text = generatePlainTextMinuta();
                navigator.clipboard.writeText(text);
                setMinutaCopied(true);
                showToast("Copiado com Sucesso", "A minuta da norma foi copiada para a área de transferência.", "success");
                setTimeout(() => setMinutaCopied(false), 2500);
              };

              const handlePrintMinuta = () => {
                const printContent = document.getElementById("minuta-resolucao-print")?.innerHTML;
                if (!printContent) return;

                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  showToast("Erro", "O bloqueador de pop-ups impediu a impressão.", "error");
                  return;
                }

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>Minuta de Norma - Adasa</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                      @media print {
                        body { margin: 0; padding: 15mm; }
                        .print\\:hidden { display: none !important; }
                        .print\\:bg-transparent { background-color: transparent !important; }
                        .print\\:border-none { border: none !important; }
                        .print\\:p-0 { padding: 0 !important; }
                        .print\\:m-0 { margin: 0 !important; }
                        .print\\:shadow-none { box-shadow: none !important; }
                      }
                    </style>
                  </head>
                  <body class="bg-white text-black font-serif">
                    <div class="max-w-4xl mx-auto leading-relaxed">
                      ${printContent}
                    </div>
                    <script>
                      setTimeout(() => {
                        window.print();
                      }, 800);
                    </script>
                  </body>
                  </html>
                `);
                printWindow.document.close();
              };

              const handleExportMinutaDoc = () => {
                const text = generatePlainTextMinuta();
                const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Minuta_${(minutaTipoAto || "Resolucao").replace(/[^a-zA-Z0-9_-]/g, "_")}_${minutaNumero}_${(selectedTomada.numero || "participacao").replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast("Download Concluído", "Minuta exportada em formato texto (.txt) com sucesso.", "success");
              };

              // Quick helper: Populate empty final texts with proposed text if available
              const handleFillFinalTextFromProposed = () => {
                setArticles(prev => prev.map(art => {
                  if (String(art.tomadaId) === String(selectedTomada.id) && (!art.finalText || !art.finalText.trim())) {
                    return { ...art, finalText: art.proposedText || art.originalText || "" };
                  }
                  return art;
                }));
                showToast("Textos Finais Atualizados", "Os textos propostos foram copiados para os textos finais dos artigos.", "success");
              };

              // Toggle subunit status
              const toggleSubunitStatus = (overrideKey: string, currentStatus: SubunitStatus) => {
                const nextStatus: SubunitStatus = currentStatus === "acrescido" ? "alterado" : currentStatus === "alterado" ? "inalterado" : "acrescido";
                setMinutaSubunitOverrides(prev => ({
                  ...prev,
                  [overrideKey]: nextStatus
                }));
                showToast("Classificação Atualizada", `Dispositivo reclassificado para "${nextStatus === 'acrescido' ? 'Acrescido' : nextStatus === 'alterado' ? 'Nova Redação' : 'Inalterado'}".`, "info");
              };

              return (
                <div className="space-y-6">
                  {/* Controls & Configuration Bar */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-indigo-600">GERADOR DE MINUTA REGULATÓRIA</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Filtro Estrito: Apenas com Texto Final
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
                          <ScrollText size={22} className="text-indigo-600" />
                          Proposição do Texto Final da Norma
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {minutaModel === "alteracao" 
                            ? "Analisa minuciosamente o caput, parágrafos, incisos e alíneas de cada artigo com texto final salvo, separando automaticamente os acréscimos, as alterações de redação e as revogações."
                            : "Gera a minuta integral da nova norma regulatória consolidando apenas os dispositivos com texto final cadastrado."}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {currentArticles.some(art => (!art.finalText || !art.finalText.trim()) && art.proposedText) && (
                          <button
                            onClick={handleFillFinalTextFromProposed}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all border border-amber-200 shadow-sm active:scale-95"
                            title="Preencher textos finais vazios com a proposta inicial"
                          >
                            <Sparkles size={15} className="text-amber-600" />
                            <span>Copiar Propostas para Texto Final</span>
                          </button>
                        )}
                        <button
                          onClick={handleCopyMinuta}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95"
                          title="Copiar texto integral para o SEI / Word"
                        >
                          {minutaCopied ? <CheckCheck size={16} className="text-emerald-600" /> : <Copy size={16} />}
                          <span>{minutaCopied ? "Copiado!" : "Copiar Texto"}</span>
                        </button>
                        <button
                          onClick={handleExportMinutaDoc}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95"
                          title="Baixar arquivo de texto (.txt)"
                        >
                          <Download size={16} />
                          <span>Baixar (.txt)</span>
                        </button>
                        <button
                          onClick={handlePrintMinuta}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                          title="Imprimir ou Salvar em PDF"
                        >
                          <Printer size={16} />
                          <span>Imprimir / PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats & Structure Summary in Alteration Mode */}
                    {minutaModel === "alteracao" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                              {articlesWithAcrescidos.length}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">Artigos com Acréscimos</div>
                              <div className="text-[10px] text-slate-500">Integrarão o Art. 1º da Minuta</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                              {articlesWithAlterados.length}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">Artigos com Nova Redação</div>
                              <div className="text-[10px] text-slate-500">
                                {articlesWithAlterados.length > 0 ? `Art. 2º: ${formattedAlteradosLabels}` : "Nenhum alterado"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm">
                              {articlesWithRevogados.length}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">Artigos com Revogações</div>
                              <div className="text-[10px] text-slate-500">
                                {articlesWithRevogados.length > 0 ? "Integrarão o Art. 3º" : "Nenhuma exclusão"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                              {articlesWithFinalText.length}
                            </div>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">Artigos com Texto Final</div>
                              <div className="text-[10px] text-slate-500">De {currentArticles.length} artigos no total</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div>
                              <div className="text-[11px] font-bold text-slate-800">Análise Granular</div>
                              <div className="text-[10px] text-slate-500">Caput, §§, incisos e alíneas</div>
                            </div>
                            <button
                              onClick={() => setShowGranularBreakdown(!showGranularBreakdown)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <span>{showGranularBreakdown ? "Ocultar" : "Detalhar"}</span>
                              {showGranularBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Granular Breakdown Accordion */}
                        {showGranularBreakdown && (
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <CheckCircle2 size={15} className="text-indigo-600" />
                                Detalhamento Granular por Dispositivo (Caput, §§, Incisos e Alíneas)
                              </h5>
                              <span className="text-[11px] text-slate-500 italic">
                                Clique no status de qualquer dispositivo para reclassificar manualmente
                              </span>
                            </div>

                            {analyzedArticles.length === 0 ? (
                              <div className="p-4 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200 text-center">
                                Nenhum artigo possui texto final salvo ainda. Preencha o Parecer/Texto Final na aba "Análise das Contribuições".
                              </div>
                            ) : (
                              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                                {analyzedArticles.map((ana) => (
                                  <div key={ana.article.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                          Dispositivo #{currentArticles.findIndex(a => a.id === ana.article.id) + 1}
                                        </span>
                                        {ana.isEntireArticleNew ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                            Artigo Integralmente Novo (Acrescido)
                                          </span>
                                        ) : (
                                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            {ana.acrescidosCount > 0 && (
                                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                +{ana.acrescidosCount} Acréscimo(s)
                                              </span>
                                            )}
                                            {ana.alteradosCount > 0 && (
                                              <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                ~{ana.alteradosCount} Nova Redação
                                              </span>
                                            )}
                                            {ana.hasRevogado && (
                                              <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                -{ana.deletedSubunits?.length || 0} Revogado(s)
                                              </span>
                                            )}
                                            {ana.inalteradosCount > 0 && (
                                              <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                ={ana.inalteradosCount} Inalterado
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* List of subunits */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {ana.subunits.map((unit, uIdx) => {
                                        const overrideKey = `${ana.article.id}_${unit.id}`;
                                        return (
                                          <div 
                                            key={`${ana.article.id}_${unit.id}_${uIdx}`}
                                            className={cn(
                                              "p-2 rounded-lg border text-xs flex flex-col justify-between gap-1 transition-all",
                                              unit.status === "acrescido" && "bg-emerald-50/50 border-emerald-200",
                                              unit.status === "alterado" && "bg-blue-50/50 border-blue-200",
                                              unit.status === "inalterado" && "bg-slate-50 border-slate-200 text-slate-500"
                                            )}
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="font-bold text-[11px] text-slate-800 shrink-0">{unit.label}</span>
                                                {unit.type === "artigo_inserido" && (
                                                  <span className="text-[9px] font-black uppercase tracking-wider px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                                    Novo Artigo
                                                  </span>
                                                )}
                                              </div>
                                              <button
                                                onClick={() => toggleSubunitStatus(overrideKey, unit.status)}
                                                className={cn(
                                                  "px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95 shrink-0",
                                                  unit.status === "acrescido" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                                                  unit.status === "alterado" && "bg-blue-100 text-blue-800 hover:bg-blue-200",
                                                  unit.status === "inalterado" && "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                )}
                                                title="Clique para alternar classificação"
                                              >
                                                {unit.status === "acrescido" ? "+ Acrescido" : unit.status === "alterado" ? "~ Nova Redação" : "= Inalterado"}
                                              </button>
                                            </div>
                                            <p className="text-[11px] line-clamp-2 italic text-slate-600">
                                              "{unit.text}"
                                            </p>
                                          </div>
                                        );
                                      })}
                                      {ana.deletedSubunits?.map((delUnit, dIdx) => (
                                          <div
                                            key={`${ana.article.id}_del_${delUnit.id}_${dIdx}`}
                                            className="p-2 rounded-lg border text-xs flex flex-col justify-between gap-1 transition-all bg-rose-50/50 border-rose-200"
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <div className="flex items-center gap-1.5 overflow-hidden">
                                                <span className="font-bold text-[11px] text-slate-800 shrink-0">{delUnit.label}</span>
                                              </div>
                                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 bg-rose-100 text-rose-800">
                                                - Revogado
                                              </span>
                                            </div>
                                            <p className="text-[11px] line-clamp-2 italic text-slate-600 line-through">
                                              "{delUnit.text}"
                                            </p>
                                          </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                      {/* Model Selector */}
                      <div className="lg:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Modelo Normativo
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <div className="w-full py-2 px-3 rounded-lg text-xs font-black bg-white text-indigo-700 shadow-sm border border-slate-200 flex items-center justify-center gap-2">
                            <span>{minutaModel === "nova" ? "Nova Norma (Integral)" : "Alteração de Norma Existente (Resolução / Portaria)"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Tipo de Ato / Norma */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Tipo de Ato Normativo
                        </label>
                        <input
                          type="text"
                          value={minutaTipoAto}
                          onChange={(e) => setMinutaTipoAto(e.target.value)}
                          placeholder="Ex: RESOLUÇÃO, PORTARIA, NORMA"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all uppercase"
                        />
                      </div>

                      {/* Nº da Norma */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Nº da Norma
                        </label>
                        <input
                          type="text"
                          value={minutaNumero}
                          onChange={(e) => setMinutaNumero(e.target.value)}
                          placeholder="Ex: 65 ou 03"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Data da Norma */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Data por Extenso
                        </label>
                        <input
                          type="text"
                          value={minutaData}
                          onChange={(e) => setMinutaData(e.target.value)}
                          placeholder="Ex: 05 DE NOVEMBRO DE 2025"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Processo SEI */}
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Processo SEI-GDF
                        </label>
                        <input
                          type="text"
                          value={minutaProcessoSEI}
                          onChange={(e) => setMinutaProcessoSEI(e.target.value)}
                          placeholder="00197-00000724/2025-51"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Normas Alteradas (apenas para modelo de alteração) */}
                      {minutaModel === "alteracao" && (
                        <div className="lg:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Norma Originária Alterada (Identificação Completa)
                          </label>
                          <input
                            type="text"
                            value={minutaResolucoesAlteradas}
                            onChange={(e) => setMinutaResolucoesAlteradas(e.target.value)}
                            placeholder="Ex: Resolução nº 03, de 13 de abril de 2012"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>
                      )}

                      {/* Assinante / Cargo */}
                      <div className={minutaModel === "alteracao" ? "" : "lg:col-span-2"}>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Autoridade Signatária
                        </label>
                        <input
                          type="text"
                          value={minutaAssinante}
                          onChange={(e) => setMinutaAssinante(e.target.value)}
                          placeholder="Ex: RAIMUNDO RIBEIRO"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3.5 py-2 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Ementa customizável */}
                      <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Ementa (Resumo do Ato Normativo)
                        </label>
                        <textarea
                          rows={2}
                          value={minutaEmenta}
                          onChange={(e) => setMinutaEmenta(e.target.value)}
                          placeholder={defaultEmenta}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                        />
                      </div>

                      {/* Considerandos */}
                      <div className="md:col-span-2 lg:col-span-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Considerandos (Motivação e Base Legal - 1 por linha)
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          value={minutaConsiderandos}
                          onChange={(e) => setMinutaConsiderandos(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed"
                        />
                      </div>

                      {/* Disposição de Vigência */}
                      {minutaModel === "alteracao" && (
                        <div className="md:col-span-2 lg:col-span-4">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Disposição de Vigência e Aplicação (Artigo Final)
                          </label>
                          <input
                            type="text"
                            value={minutaVigencia}
                            onChange={(e) => setMinutaVigencia(e.target.value)}
                            placeholder="Esta Resolução entra em vigor na data de sua publicação..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Preview (A4 Paper Aesthetic) */}
                  <div className="bg-slate-200/70 p-4 sm:p-8 rounded-3xl border border-slate-300/80 shadow-inner flex justify-center">
                    <div 
                      id="minuta-resolucao-print"
                      className="bg-white text-slate-900 shadow-2xl rounded-lg p-8 sm:p-14 max-w-4xl w-full font-serif leading-relaxed border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full"
                      style={{ minHeight: '1100px' }}
                    >
                      {/* Header GDF / Adasa */}
                      <div className="text-center mb-8 space-y-1">
                        <div className="font-sans text-xs font-bold tracking-wider uppercase text-slate-700">Governo do Distrito Federal</div>
                        <div className="font-sans text-sm font-black text-slate-900">Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal</div>
                        <div className="font-sans text-xs font-semibold text-slate-600">Secretaria Geral</div>
                      </div>

                      {/* Norma Title */}
                      <div className="text-center mb-8">
                        <h2 className="font-sans text-base sm:text-lg font-black tracking-wide uppercase text-slate-900">
                          {(minutaTipoAto || "RESOLUÇÃO").toUpperCase()} Nº {minutaNumero}, DE {minutaData}.
                        </h2>
                      </div>

                      {/* Ementa (Right Aligned Column) */}
                      <div className="flex justify-end mb-8">
                        <div className="w-full sm:w-7/12 text-justify text-xs sm:text-sm italic leading-relaxed text-slate-800 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 print:bg-transparent print:border-none print:p-0">
                          {effectiveEmenta}
                        </div>
                      </div>

                      {/* Preâmbulo */}
                      <div className="text-justify text-xs sm:text-sm leading-relaxed mb-6 space-y-4">
                        <p className="indent-8">
                          <strong>O DIRETOR-PRESIDENTE DA AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL – Adasa</strong>, Ad Referendum da Diretoria Colegiada, no uso das atribuições que lhe confere o art. 7º, inciso III, do Regimento Interno desta Agência, aprovado pela Resolução nº 16, de 17 de setembro de 2014, tendo em vista o que dispõe o art. 23, inciso II e VII, da Lei n.º 4.285, 26 de dezembro de 2008, o constante no processo SEI nº {minutaProcessoSEI}, as contribuições da {meiodePart} nº {consultNumber}, e
                        </p>

                        {/* Considerandos */}
                        {minutaConsiderandos.split("\n").filter(c => c.trim()).map((c, cIdx, arr) => {
                          const cleanC = c.trim().replace(/^considerando\s+/i, "").replace(/;$/, "");
                          return (
                            <p key={cIdx} className="indent-8">
                              <strong>Considerando</strong> {cleanC}{cIdx === arr.length - 1 ? ";" : ";"}
                            </p>
                          );
                        })}

                        <p className="font-bold pt-2">
                          RESOLVE:
                        </p>
                      </div>

                      {/* Dispositivos / Corpo da Norma */}
                      <div className="text-justify text-xs sm:text-sm leading-relaxed space-y-6 pt-2">
                        {minutaModel === "nova" ? (
                          <>
                            {(() => {
                              if (articlesWithFinalText.length === 0) {
                                return (
                                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-800 text-xs italic text-center font-sans">
                                    Nenhum dispositivo possui texto final cadastrado ainda. Salve o parecer/texto final nos artigos na aba "Análise das Contribuições" para que constem nesta minuta.
                                  </div>
                                );
                              }
                              return articlesWithFinalText.map((art) => {
                                const body = (art.finalText && art.finalText.trim()) || "";
                                return (
                                  <div key={art.id} className="relative group">
                                    <div className="p-2 rounded transition-colors whitespace-pre-wrap leading-relaxed">
                                      {body.trim()}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </>
                        ) : (
                          <>
                            {(() => {
                              if (articlesWithFinalText.length === 0) {
                                return (
                                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-800 text-xs italic text-center font-sans my-4">
                                    Nenhum dispositivo possui texto final cadastrado ainda. Salve o parecer/texto final nos artigos na aba "Análise das Contribuições" para que constem nesta minuta.
                                  </div>
                                );
                              }

                              let articleCounter = 1;
                              const art1Index = articlesWithAcrescidos.length > 0 ? articleCounter++ : null;
                              const art2Index = articlesWithAlterados.length > 0 ? articleCounter++ : null;
                              const art3Index = articlesWithRevogados.length > 0 ? articleCounter++ : null;
                              const artVigenciaIndex = articleCounter;

                              return (
                                <div className="space-y-6">
                                  {/* SEÇÃO 1: ARTIGO DE DISPOSITIVOS ACRESCIDOS */}
                                  {articlesWithAcrescidos.length > 0 && (
                                    <div className="space-y-3">
                                      <p className="indent-8">
                                        <strong>Art. {art1Index}º.</strong> A {minutaResolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:
                                      </p>

                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-emerald-400">
                                        {articlesWithAcrescidos.map((ana) => {
                                          const blockText = buildAcrescidoArticleText(ana);
                                          if (!blockText) return null;

                                          return (
                                            <div key={ana.article.id} className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-200/60 print:bg-transparent print:border-none print:p-0">
                                              <div className="flex items-center justify-between gap-2 mb-1.5 print:hidden">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                                                  <PlusCircle size={11} /> {ana.isEntireArticleNew ? "Artigo Integralmente Novo" : "Dispositivo(s) Acrescido(s)"}
                                                </span>
                                              </div>
                                              <div className="whitespace-pre-wrap leading-relaxed not-italic text-slate-900">
                                                {blockText}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 2: ARTIGO DE DISPOSITIVOS COM NOVA REDAÇÃO */}
                                  {articlesWithAlterados.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {art2Index || 1}º.</strong> {articlesWithAlterados.length === 1 && !formattedAlteradosLabels.startsWith("Cláusula") && !formattedAlteradosLabels.startsWith("Tabela")
                                          ? `O art. ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passa a vigorar com a seguinte redação:`
                                          : `Os artigos ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passam a vigorar com as seguintes redações:`}
                                      </p>

                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-blue-400">
                                        {articlesWithAlterados.map((ana) => {
                                          const blockText = buildAlteradoArticleText(ana);
                                          if (!blockText) return null;

                                          return (
                                            <div key={ana.article.id} className="p-3 rounded-lg bg-blue-50/40 border border-blue-200/60 print:bg-transparent print:border-none print:p-0">
                                              <div className="flex items-center justify-between gap-2 mb-1.5 print:hidden">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-sans">
                                                  <Edit3 size={11} /> Nova Redação ({ana.artLabel})
                                                </span>
                                              </div>
                                              <div className="whitespace-pre-wrap leading-relaxed not-italic text-slate-900">
                                                {blockText}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 3: ARTIGO DE DISPOSITIVOS REVOGADOS */}
                                  {articlesWithRevogados.length > 0 && (
                                    <div className="pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {art3Index}º.</strong> {buildRevogadosText(articlesWithRevogados, minutaResolucoesAlteradas)}
                                      </p>
                                    </div>
                                  )}

                                  {/* SEÇÃO 4: ARTIGO DE VIGÊNCIA */}
                                  <div className="pt-2">
                                    <p className="indent-8">
                                      <strong>Art. {artVigenciaIndex}º.</strong> {minutaVigencia.trim()}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>

                      {/* Signatário / Fecho */}
                      <div className="mt-16 text-center space-y-1 font-sans">
                        <div className="font-bold text-sm text-slate-900 uppercase">{minutaAssinante}</div>
                        <div className="text-xs text-slate-600">Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal - Adasa</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative min-h-[80vh]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="text-indigo-600" size={28} />
            Participação Social
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Módulo de consultas públicas e tomadas de subsídios na elaboração de resoluções.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateSubsidios && (
            <button
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus size={16} /> Nova Participação
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pesquisar</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nº, Título ou Objeto..."
              className="w-full bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-semibold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          </div>
        </div>

        {/* Meio de Participação Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Meio de Participação</label>
          <select
            value={filterMeio}
            onChange={(e) => setFilterMeio(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="TODOS">Todos os meios</option>
            <option value="Consulta Pública">Consulta Pública</option>
            <option value="Tomada de Subsídios">Tomada de Subsídios</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="TODOS">Todos os status</option>
            <option value="Aberta (Contribuir)">Aberta (Contribuir)</option>
            <option value="Fechada">Fechada</option>
          </select>
        </div>
      </div>

      {tomadas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-700">Nenhum registro de Participação Social</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Ainda não há nenhuma consulta pública ou tomada de subsídios aberta para recebimento de contribuições em resoluções.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="px-5 py-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("numero")}>
                    <div className="flex items-center">Número {getSortIcon("numero")}</div>
                  </th>
                  <th className="px-5 py-4 w-48 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("meioParticipacao")}>
                    <div className="flex items-center">Meio de Participação {getSortIcon("meioParticipacao")}</div>
                  </th>
                  <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("title")}>
                    <div className="flex items-center">Objeto {getSortIcon("title")}</div>
                  </th>
                  <th className="px-5 py-4 w-44 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("tipoResolucao")}>
                    <div className="flex items-center">Tipo de Norma {getSortIcon("tipoResolucao")}</div>
                  </th>
                  <th className="px-5 py-4 w-48 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("dataInicio")}>
                    <div className="flex items-center">Período de Contribuição {getSortIcon("dataInicio")}</div>
                  </th>
                  <th className="px-5 py-4 w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("status")}>
                    <div className="flex items-center justify-center">Status {getSortIcon("status")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedFilteredTomadas.map(tomada => {
                  const status = getStatus(tomada.dataInicio, tomada.dataFim);
                  const isAberta = status.startsWith("Aberta");

                  return (
                    <tr key={tomada.id} className="hover:bg-slate-50/40 transition-colors cursor-pointer align-top" onClick={() => handleOpenPublicView(tomada)}>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        <span className="text-sm font-bold text-slate-800">{tomada.numero}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border",
                          tomada.meioParticipacao === "Consulta Pública"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        )}>
                          {tomada.meioParticipacao || "Tomada de Subsídios"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-slate-800 mb-0.5">{tomada.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-2">{tomada.objeto}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider border",
                          tomada.tipoResolucao === "alteracao"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                          {tomada.tipoResolucao === "alteracao" ? "Alteração de Norma" : "Nova Norma"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {formatDateBr(tomada.dataInicio)} até {formatDateBr(tomada.dataFim)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                          isAberta ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center space-x-1.5">
                        {canViewAnalise && (
                          <button 
                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-emerald-50"
                            onClick={(e) => { e.stopPropagation(); setSelectedTomada(tomada); setActiveView("technical_analysis"); }}
                            title="Análise Técnica das Contribuições"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {canEditSubsidios && (
                          <button 
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
                            onClick={(e) => handleOpenEdit(tomada, e, "geral")}
                            title="Editar Participação Social (Dados, Minuta e Anexos)"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                        {canDeleteSubsidios && (
                          <button 
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
                            onClick={(e) => handleOpenDeleteConfirm(tomada, e)}
                            title="Excluir Participação Social"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      {renderMainContent()}

      {/* Modal de Edição Geral, Minuta e Anexos */}
      {editingTomada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[9999] animate-fadeIn" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-7xl w-full p-6 space-y-5 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Edit3 size={18} className="text-indigo-600" />
                  Editar Participação Social
                </h3>
                <p className="text-xs text-slate-500">
                  {editFormData.numero ? `${editFormData.numero} - ` : ""}{editFormData.title || "Atualização de registro"}
                </p>
              </div>
              <button
                onClick={() => setEditingTomada(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Abas do Modal */}
            <div className="flex border-b border-slate-200 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditModalTab("geral")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
                  editModalTab === "geral"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <FileText size={15} /> Dados Gerais
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab("minuta")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
                  editModalTab === "minuta"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <FileCode size={15} /> Minuta & Artigos Propostos ({editArticles.length})
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab("anexos")}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
                  editModalTab === "anexos"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Paperclip size={15} /> Material de Apoio (Anexos) ({editAnexos.length})
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-1 flex-1 pr-2">
              {editModalTab === "geral" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Tipo de Norma
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all font-medium text-slate-700 cursor-pointer"
                        value={editFormData.tipoResolucao || "nova"}
                        onChange={(e) => setEditFormData({ ...editFormData, tipoResolucao: e.target.value as "nova" | "alteracao" })}
                      >
                        <option value="nova">Nova Norma</option>
                        <option value="alteracao">Alteração de Norma Existente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Meio de Participação
                      </label>
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all font-medium text-slate-700 cursor-pointer"
                        value={editFormData.meioParticipacao}
                        onChange={(e) => setEditFormData({ ...editFormData, meioParticipacao: e.target.value })}
                      >
                        <option value="Consulta Pública">Consulta Pública (CP)</option>
                        <option value="Tomada de Subsídios">Tomada de Subsídios (TS)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Número</span>
                        <span className="text-[10px] text-slate-400 font-normal lowercase">(identificador fixo)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          disabled
                          readOnly
                          className="w-full pl-4 pr-10 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed select-none transition-all shadow-none"
                          value={editFormData.numero}
                          title="O número da participação social é um identificador fixo e não pode ser editado."
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                          <Lock size={15} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all font-medium text-slate-800"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Objeto
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-sm text-slate-700"
                      value={editFormData.objeto}
                      onChange={(e) => setEditFormData({ ...editFormData, objeto: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-slate-700"
                        value={editFormData.dataInicio}
                        onChange={(e) => setEditFormData({ ...editFormData, dataInicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-slate-700"
                        value={editFormData.dataFim}
                        onChange={(e) => setEditFormData({ ...editFormData, dataFim: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editModalTab === "minuta" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100">
                    <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                      Edite os textos propostos pela área técnica e vigentes para cada dispositivo da minuta da norma.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOrder = editArticles.length + 1;
                        setEditArticles([
                          ...editArticles,
                          {
                            id: `new_${Date.now()}`,
                            tomadaId: editFormData.id,
                            order: nextOrder,
                            originalText: "",
                            proposedText: `Art. ${nextOrder}º `
                          }
                        ]);
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <PlusCircle size={15} /> Adicionar Artigo
                    </button>
                  </div>

                  {editArticles.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                      Nenhum artigo cadastrado para esta minuta. Clique em <strong>Adicionar Artigo</strong> acima.
                    </div>
                  ) : (
                    editArticles.map((art, idx) => (
                      <div key={art.id || idx} className="bg-slate-50/90 rounded-2xl border border-slate-200 p-5 space-y-3.5 relative group shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-black uppercase text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-xs">
                            Dispositivo #{idx + 1}
                          </span>
                          
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (idx > 0) {
                                  const newArts = [...editArticles];
                                  [newArts[idx - 1], newArts[idx]] = [newArts[idx], newArts[idx - 1]];
                                  setEditArticles(newArts);
                                }
                              }}
                              disabled={idx === 0}
                              className="text-xs font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 px-1.5 py-1 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                              title="Mover para Cima"
                            >
                              <ArrowUp size={14} /> <span className="hidden sm:inline">Mover</span> Cima
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (idx < editArticles.length - 1) {
                                  const newArts = [...editArticles];
                                  [newArts[idx + 1], newArts[idx]] = [newArts[idx], newArts[idx + 1]];
                                  setEditArticles(newArts);
                                }
                              }}
                              disabled={idx === editArticles.length - 1}
                              className="text-xs font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-30 px-1.5 py-1 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                              title="Mover para Baixo"
                            >
                              <ArrowDown size={14} /> <span className="hidden sm:inline">Mover</span> Baixo
                            </button>

                            <div className="w-px h-4 bg-slate-300 mx-1"></div>

                            <button
                              type="button"
                              onClick={() => {
                                const newArticle = {
                                  id: 'new_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                  tomadaId: editFormData.id,
                                  originalText: "",
                                  proposedText: "",
                                  order: idx
                                };
                                const newArts = [...editArticles];
                                newArts.splice(idx, 0, newArticle as any);
                                setEditArticles(newArts);
                              }}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-1.5 py-1 hover:bg-emerald-50 rounded transition-colors flex items-center gap-1"
                              title="Adicionar Dispositivo Acima"
                            >
                              <Plus size={14} /><ArrowUp size={10} className="-ml-1 hidden sm:block" /> <span className="hidden sm:inline">Acima</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newArticle = {
                                  id: 'new_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                  tomadaId: editFormData.id,
                                  originalText: "",
                                  proposedText: "",
                                  order: idx + 1
                                };
                                const newArts = [...editArticles];
                                newArts.splice(idx + 1, 0, newArticle as any);
                                setEditArticles(newArts);
                              }}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-1.5 py-1 hover:bg-emerald-50 rounded transition-colors flex items-center gap-1"
                              title="Adicionar Dispositivo Abaixo"
                            >
                              <Plus size={14} /><ArrowDown size={10} className="-ml-1 hidden sm:block" /> <span className="hidden sm:inline">Abaixo</span>
                            </button>

                            <div className="w-px h-4 bg-slate-300 mx-1"></div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditArticles(editArticles.filter((_, i) => i !== idx));
                              }}
                              className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 hover:bg-rose-50 rounded transition-colors flex items-center gap-1.5"
                              title="Remover este dispositivo"
                            >
                              <Trash2 size={14} /> <span className="hidden sm:inline">Remover</span>
                            </button>
                          </div>
                        </div>

                        <div className={cn("grid gap-4", editFormData.tipoResolucao === "alteracao" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
                          {editFormData.tipoResolucao === "alteracao" && (
                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                Texto Vigente / Anterior (Opcional)
                              </label>
                              <textarea
                                rows={14}
                                className="w-full bg-white px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all font-mono leading-relaxed resize-y"
                                placeholder="Texto anterior ou vigente da norma (se houver alteração)..."
                                value={art.originalText || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditArticles(prev => prev.map((a, i) => i === idx ? { ...a, originalText: val } : a));
                                }}
                              />
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center justify-between">
                              <span>Texto Proposto pela Área Técnica (Oficial)</span>
                              <span className="text-[10px] text-indigo-400 font-normal lowercase">redação proposta</span>
                            </label>
                            <textarea
                              rows={14}
                              className="w-full bg-white px-3.5 py-2.5 border border-indigo-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all font-mono leading-relaxed resize-y shadow-xs"
                              placeholder="Redação proposta oficial pela agência reguladora..."
                              value={art.proposedText !== undefined ? art.proposedText : (art.originalText || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditArticles(prev => prev.map((a, i) => i === idx ? { ...a, proposedText: val } : a));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {editModalTab === "anexos" && (
                <div className="space-y-5">
                  <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
                    <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-indigo-600" />
                      Gerenciar Material de Apoio e Anexos
                    </h4>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Adicione novos arquivos (Nota Técnica, Minuta em PDF, Estudos) ou exclua arquivos existentes desta consulta/tomada.
                    </p>
                  </div>

                  {/* Upload de novos arquivos */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Incluir Novo Arquivo / Documento
                    </label>
                    <input 
                      type="file" 
                      multiple
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          const filesList = Array.from(e.target.files) as File[];
                          const newFiles = filesList.map(file => ({
                            id: `anexo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                            name: file.name,
                            url: URL.createObjectURL(file)
                          }));
                          setEditAnexos(prev => [...prev, ...newFiles]);
                          e.target.value = "";
                        }
                      }}
                    />
                  </div>

                  {/* Lista de anexos existentes */}
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Arquivos Cadastrados ({editAnexos.length})
                    </span>

                    {editAnexos.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        Nenhum anexo ou material de apoio vinculado a esta participação social.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editAnexos.map((anexo, idx) => (
                          <div 
                            key={anexo.id || idx}
                            className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={anexo.name}>
                                  {anexo.name}
                                </p>
                                {anexo.url && (
                                  <a 
                                    href={anexo.url} 
                                    download={anexo.name}
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[10px] text-indigo-600 hover:underline font-medium inline-block mt-0.5"
                                  >
                                    Visualizar / Download
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditAnexos(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              title="Remover anexo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                {editArticles.length} dispositivo(s) na minuta &bull; {editAnexos.length} anexo(s)
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTomada(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingEdit}
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Save size={15} />
                  {isSubmittingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (100% compatível com iFrames) */}
      {deletingTomada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-fadeIn" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Excluir Participação Social?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esta ação é irreversível. Deseja realmente excluir permanentemente a participação:
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                  <div className="text-xs font-bold text-slate-800">{deletingTomada.numero}</div>
                  <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{deletingTomada.title}</div>
                </div>
                <p className="text-[11px] text-rose-600 font-medium pt-1">
                  Todos os anexos, a minuta da norma e as contribuições recebidas serão excluídos do banco de dados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTomada(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {isDeleting ? "Excluindo..." : "Sim, Excluir Registro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Dispositivo */}
      {deletingArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-fadeIn" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Excluir Dispositivo?
                </h3>
                {deletingArticle.hasContributions ? (
                  <p className="text-xs text-rose-600 font-bold leading-relaxed pt-1">
                    Atenção: Este dispositivo possui contribuições associadas. <br/><br/>
                    Excluir este dispositivo removerá TODAS as contribuições ligadas a ele permanentemente. Essa ação não pode ser desfeita.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Deseja realmente excluir este dispositivo? Essa ação não pode ser desfeita.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingArticle(null)}
                className="text-slate-500 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteArticle}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Contribuição */}
      {deletingContribution && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Excluir Proposta?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deseja realmente excluir sua proposta de contribuição para este dispositivo? Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingContribution(null)}
                className="text-slate-500 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteContribution}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Orientações */}
      {showOrientacoesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                Guia de Orientação: Como Propor Alterações
              </h3>
              <button 
                onClick={() => setShowOrientacoesModal(false)}
                className="p-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed font-medium">
              <div className="space-y-3">
                <h4 className="text-emerald-700 font-bold uppercase tracking-wider text-xs">📝 Edição Simples de Texto</h4>
                <p>
                  Para propor uma pequena alteração no texto de um dispositivo, clique no botão <strong className="text-indigo-600">Propor Alteração</strong> correspondente ao dispositivo desejado. 
                  Você visualizará o texto original. Edite-o conforme sua proposta e preencha a Justificativa Técnica para explicar a motivação. 
                  O sistema destacará suas inclusões (em verde) e exclusões (riscadas em vermelho) automaticamente para a área técnica.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-orange-600 font-bold uppercase tracking-wider text-xs">✂️ Supressão (Exclusão) Parcial</h4>
                <p>
                  Para propor exclusões parciais, como retirar apenas um parágrafo, inciso ou alínea sem remover o artigo inteiro, basta utilizar o botão <strong className="text-indigo-600">Propor Alteração</strong> e, no campo de texto, excluir a parte indesejada. O sistema irá riscar o texto removido automaticamente.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-rose-700 font-bold uppercase tracking-wider text-xs">🗑️ Supressão (Exclusão) Total de Dispositivo</h4>
                <p>
                  Para sugerir que um dispositivo inteiro seja removido da norma:
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Clique em "Propor Alteração" no dispositivo que deseja suprimir.</li>
                  <li>Marque a opção <strong className="text-rose-600">"Propor supressão (exclusão) integral deste dispositivo"</strong> localizada acima da caixa de texto.</li>
                  <li>A caixa de texto será desativada, não sendo necessário apagar o texto manualmente.</li>
                  <li>Insira a Justificativa Técnica com os motivos da exclusão e salve.</li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="text-amber-600 font-bold uppercase tracking-wider text-xs">➕ Inclusão de Novo Artigo / Dispositivo</h4>
                <p>
                  Caso deseje incluir um novo artigo ou dispositivo no meio do texto normativo:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li><strong>Identificação:</strong> Ao invés de renumerar todos os artigos subsequentes, utilize a numeração do artigo anterior seguida de uma letra maiúscula. <br />
                    <em>Exemplo:</em> Para sugerir um novo artigo após o <strong className="font-mono bg-slate-100 px-1 rounded">Art. 1º</strong>, denomine-o como <strong className="font-mono bg-slate-100 px-1 rounded text-indigo-700">Art. 1Aº</strong>, <strong className="font-mono bg-slate-100 px-1 rounded text-indigo-700">Art. 1Bº</strong>, etc.
                  </li>
                  <li><strong>Como fazer:</strong> Se o novo dispositivo for substituir totalmente o anterior, você pode usar a opção de edição normal no próprio artigo anterior, apagando todo o texto e escrevendo o seu novo texto. Se for uma adição além do que já existe, utilize o artigo mais próximo ao local desejado e adicione a sua proposta junto ao texto, ou adicione no final do capítulo/seção.</li>
                </ul>
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-indigo-900">
                <h4 className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> Dicas Importantes
                </h4>
                <ul className="list-disc list-inside text-xs space-y-1 ml-1">
                  <li>Cada usuário pode enviar <strong>apenas uma proposta por dispositivo</strong>. Porém, enquanto a participação estiver aberta, você pode editar sua proposta livremente.</li>
                  <li>O preenchimento da <strong>Justificativa Técnica</strong> é obrigatório em todas as contribuições, pois fundamenta a análise pela área técnica da ADASA.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowOrientacoesModal(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

