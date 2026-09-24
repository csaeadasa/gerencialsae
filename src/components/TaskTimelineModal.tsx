import React, { useState, useMemo } from "react";
import {
  X,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  CalendarRange,
  SlidersHorizontal,
  Flag,
  Circle,
  GitCommit,
  Tag,
  Copy,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  TrendingUp,
  User,
  ExternalLink,
  Gauge,
  Target,
  Zap,
  BarChart3,
  Sparkles,
  Info,
  Check,
  ShieldAlert,
  HelpCircle,
  Scale
} from "lucide-react";
import { Task, Area, Category, Responsible } from "../types";
import { cn } from "../lib/utils";
import { calculateTaskProbability, TaskProbabilityResult, SubtaskAnalysis } from "../utils/taskProbability";

interface TaskTimelineModalProps {
  taskId: number | null;
  onClose: () => void;
  onEditTask: (task: Task) => void;
  tasks: Task[];
  taskById: Record<number, Task>;
  childrenMap: Record<number, Task[]>;
  areas: Area[];
  categories: Category[];
  responsibles: Responsible[];
  formatDate: (d: string | null | undefined) => string;
  formatDateTime?: (d: string | null | undefined) => string;
  showToast: (title: string, message: string, type: "success" | "error" | "info" | "warning") => void;
  renderProgressCalc?: (targetTaskId: number | null, fallbackProgress: number) => React.ReactNode;
}

export const TaskTimelineModal: React.FC<TaskTimelineModalProps> = ({
  taskId,
  onClose,
  onEditTask,
  tasks,
  taskById,
  childrenMap,
  areas,
  categories,
  responsibles,
  formatDate,
  showToast,
  renderProgressCalc,
}) => {
  const [modalTab, setModalTab] = useState<"timeline" | "probability" | "calc">("timeline");
  const [timelineView, setTimelineView] = useState<"horizonte" | "gantt">("horizonte");
  const [ganttScale, setGanttScale] = useState<"mes" | "trimestre" | "semestre">("mes");
  const [copiedSeiId, setCopiedSeiId] = useState<number | null>(null);

  if (taskId === null || !taskById[taskId]) return null;

  const currentTargetTask = taskById[taskId];

  // Algorithmic Probability & Predictive Analysis
  const probAnalysis = useMemo(() => {
    return calculateTaskProbability(currentTargetTask, taskById, childrenMap);
  }, [currentTargetTask, taskById, childrenMap]);

  // Helper functions
  const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
    if (!status) return "Não iniciada";
    const s = status.toLowerCase().trim();
    if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
    if (s === "em andamento" || s === "in_progress" || s === "em_andamento") return "Em andamento";
    return "Não iniciada";
  };

  const getDeadlineStatus = (endDate: string | null | undefined, status: string | undefined): "Atrasada" | "Crítica" | "No Prazo" => {
    const normStatus = normalizeStatus(status);
    if (normStatus === "Concluída") return "No Prazo";
    if (!endDate) return "No Prazo";

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let dEnd: Date;
      if (endDate.includes("-")) {
        const parts = endDate.split("T")[0].split("-");
        dEnd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        dEnd = new Date(endDate);
      }

      if (isNaN(dEnd.getTime())) return "No Prazo";
      dEnd.setHours(0, 0, 0, 0);

      const diffTime = dEnd.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return "Atrasada";
      if (diffDays <= 7) return "Crítica";
      return "No Prazo";
    } catch {
      return "No Prazo";
    }
  };

  const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    try {
      if (dateStr.includes("-")) {
        const parts = dateStr.split("T")[0].split("-");
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const getPriorityBadgeClass = (priority: string | undefined) => {
    switch (priority) {
      case "Alta":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Média":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Baixa":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTaskDisplayName = (t: Task | undefined) => {
    if (!t) return "";
    let prefix = "";
    if (t.areaIds && t.areaIds.length > 0) {
      const abbrevs = t.areaIds.map(id => areas.find(a => a.id === id)?.abbreviation).filter(Boolean);
      if (abbrevs.length > 0) {
        prefix = `[${abbrevs.join("/")}:${t.id}] `;
      }
    }
    if (!prefix) prefix = `[ID: ${t.id}] `;
    return `${prefix}${t.title || "Sem título"}`;
  };

  // Collect hierarchy (root, target, ancestors and all descendants)
  const timelineTasks = useMemo(() => {
    if (!taskId) return [];

    const pathIds = new Set<number>();
    let currId: number | null | undefined = taskId;
    let rootId = taskId;

    while (currId && taskById[currId]) {
      pathIds.add(currId);
      rootId = currId;
      currId = taskById[currId].parentId;
    }

    const result: { task: Task; depth: number; isTarget: boolean; isAncestor: boolean }[] = [];

    const collect = (id: number, currentDepth: number) => {
      const t = taskById[id];
      if (t) {
        const isTarget = id === taskId;
        const isAncestor = pathIds.has(id) && !isTarget;
        result.push({ task: t, depth: currentDepth, isTarget, isAncestor });
      }
      const children = childrenMap[id] || [];
      const sortedChildren = [...children].sort(
        (a, b) => new Date(a.endDate || "2099-01-01").getTime() - new Date(b.endDate || "2099-01-01").getTime()
      );
      sortedChildren.forEach(c => collect(c.id, currentDepth + 1));
    };

    collect(rootId, 0);
    return result;
  }, [taskId, taskById, childrenMap]);

  // Statistics
  const stats = useMemo(() => {
    const getDescendantsAndSelf = (id: number): number[] => {
      const res = [id];
      const children = childrenMap[id] || [];
      children.forEach(c => res.push(...getDescendantsAndSelf(c.id)));
      return res;
    };
    const descendantsIds = new Set(getDescendantsAndSelf(taskId));
    const targetGroup = timelineTasks.filter(t => descendantsIds.has(t.task.id));
    const total = targetGroup.length;
    const completed = targetGroup.filter(t => normalizeStatus(t.task.status) === "Concluída").length;
    const inProgress = targetGroup.filter(t => normalizeStatus(t.task.status) === "Em andamento").length;
    const pending = Math.max(0, total - completed - inProgress);

    return { total, completed, inProgress, pending };
  }, [taskId, timelineTasks, childrenMap]);

  // Global time window across all tasks
  const globalTimelineSpan = useMemo(() => {
    const validDates: { start: Date; end: Date }[] = [];

    timelineTasks.forEach(({ task }) => {
      const s = parseSafeDate(task.startDate);
      const e = parseSafeDate(task.endDate);
      if (s && e) {
        validDates.push({ start: s, end: e });
      } else if (s) {
        validDates.push({ start: s, end: new Date(s.getTime() + 30 * 24 * 60 * 60 * 1000) });
      } else if (e) {
        validDates.push({ start: new Date(e.getTime() - 30 * 24 * 60 * 60 * 1000), end: e });
      }
    });

    let minDate: Date;
    let maxDate: Date;

    if (validDates.length > 0) {
      minDate = new Date(Math.min(...validDates.map(d => d.start.getTime())));
      maxDate = new Date(Math.max(...validDates.map(d => d.end.getTime())));
    } else {
      minDate = new Date();
      minDate.setMonth(minDate.getMonth() - 1);
      maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
    }

    // Set boundaries to beginning of first month and end of last month
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1, 0, 0, 0, 0);
    maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0, 23, 59, 59, 999);

    if (maxDate.getTime() - minDate.getTime() < 30 * 24 * 60 * 60 * 1000) {
      maxDate.setMonth(maxDate.getMonth() + 2);
    }

    const totalMs = Math.max(1, maxDate.getTime() - minDate.getTime());
    const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

    // Generate month segments
    const months: { key: string; year: number; month: number; label: string; shortLabel: string; widthPct: number; start: Date; end: Date }[] = [];
    const current = new Date(minDate);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthAbbrs = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    while (current <= maxDate) {
      const y = current.getFullYear();
      const m = current.getMonth();
      const mStart = new Date(y, m, 1, 0, 0, 0, 0);
      const mEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

      const clampStart = mStart < minDate ? minDate : mStart;
      const clampEnd = mEnd > maxDate ? maxDate : mEnd;
      const spanMs = Math.max(0, clampEnd.getTime() - clampStart.getTime());
      const widthPct = (spanMs / totalMs) * 100;

      if (widthPct > 0) {
        months.push({
          key: `month-${y}-${m}`,
          year: y,
          month: m,
          label: `${monthNames[m]} ${y}`,
          shortLabel: `${monthAbbrs[m]}/${String(y).slice(2)}`,
          widthPct,
          start: clampStart,
          end: clampEnd,
        });
      }
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    // Today marker
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayPct = ((today.getTime() - minDate.getTime()) / totalMs) * 100;
    const isTodayInHorizon = todayPct >= 0 && todayPct <= 100;

    return {
      minDate,
      maxDate,
      totalMs,
      totalDays,
      months,
      today,
      todayPct,
      isTodayInHorizon,
    };
  }, [timelineTasks]);

  const handleCopySei = (seiProcess: string, taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(seiProcess);
    setCopiedSeiId(taskId);
    showToast("Copiado!", "Número do processo SEI copiado para a área de transferência.", "success");
    setTimeout(() => setCopiedSeiId(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col p-4 sm:p-6 md:p-8 animate-fadeIn items-center justify-center">
      <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full max-h-[92vh] shadow-2xl relative flex flex-col overflow-hidden border border-slate-100">
        
        {/* Top Header */}
        <div className="flex z-20 justify-between items-center p-5 sm:p-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Activity size={22} className="text-adasa-mid" />
              Evolução do Item
            </h3>

            {/* Modal Tabs */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setModalTab("timeline")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  modalTab === "timeline"
                    ? "bg-white text-adasa-mid shadow-xs font-black border border-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                )}
              >
                <Activity size={14} />
                Linha do Tempo
              </button>
              <button
                type="button"
                onClick={() => setModalTab("probability")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  modalTab === "probability"
                    ? "bg-white text-adasa-mid shadow-xs font-black border border-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                )}
              >
                <Gauge size={14} />
                Probabilidade de Prazo
                {probAnalysis.hasDates && (
                  <span
                    className={cn(
                      "text-[10px] font-black px-1.5 py-0.2 rounded-full",
                      probAnalysis.riskColor === "emerald"
                        ? "bg-emerald-100 text-emerald-800"
                        : probAnalysis.riskColor === "blue"
                        ? "bg-blue-100 text-blue-800"
                        : probAnalysis.riskColor === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    )}
                  >
                    {probAnalysis.probability}%
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalTab("calc")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                  modalTab === "calc"
                    ? "bg-white text-adasa-mid shadow-xs font-black border border-slate-200/50"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                )}
              >
                <TrendingUp size={14} />
                Cálculo do Progresso
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-full transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative bg-slate-50/20">
          
          {/* TAB 1: LINHA DO TEMPO */}
          {modalTab === "timeline" && (
            <div className="space-y-6">
              
              {/* Header Info & Controls */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-adasa-mid shrink-0" />
                      Linha do Tempo: {getTaskDisplayName(currentTargetTask)}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Exibindo a hierarquia da tarefa com régua proporcional sincronizada à duração total. As estatísticas referem-se à tarefa selecionada e suas filhas.
                    </p>
                  </div>
                </div>

                {/* Summary Badges */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs border border-slate-200/60">
                    <span>TOTAIS <span className="border-l border-slate-300 ml-2 pl-2 text-sm font-extrabold">{stats.total}</span></span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs">
                    <CheckCircle2 size={15} /> CONCLUÍDAS <span className="border-l border-emerald-200 ml-1.5 pl-2 text-sm font-extrabold">{stats.completed}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs">
                    <Activity size={15} /> EM ANDAMENTO <span className="border-l border-blue-200 ml-1.5 pl-2 text-sm font-extrabold">{stats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs">
                    <Clock size={15} /> NÃO INICIADAS <span className="border-l border-slate-200 ml-1.5 pl-2 text-sm font-extrabold">{stats.pending}</span>
                  </div>
                </div>

                {/* Predictive Probability & Performance Overview Banner */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-adasa-dark text-white p-4 sm:p-5 rounded-2xl shadow-md border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-1 shadow-inner">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">Prazo</span>
                      <span
                        className={cn(
                          "text-xl font-black leading-none tracking-tight",
                          probAnalysis.riskColor === "emerald"
                            ? "text-emerald-400"
                            : probAnalysis.riskColor === "blue"
                            ? "text-blue-300"
                            : probAnalysis.riskColor === "amber"
                            ? "text-amber-400"
                            : "text-rose-400"
                        )}
                      >
                        {probAnalysis.hasDates ? `${probAnalysis.probability}%` : "-"}
                      </span>
                      <span className="text-[8px] font-bold text-blue-200/80">Previsão</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Gauge size={14} className="text-adasa-light" />
                          Probabilidade de Cumprimento do Prazo
                        </span>
                        {probAnalysis.hasDates ? (
                          <span
                            className={cn(
                              "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 border",
                              probAnalysis.riskColor === "emerald"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : probAnalysis.riskColor === "blue"
                                ? "bg-blue-400/20 text-blue-200 border-blue-400/40"
                                : probAnalysis.riskColor === "amber"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                probAnalysis.riskColor === "emerald"
                                  ? "bg-emerald-400"
                                  : probAnalysis.riskColor === "blue"
                                  ? "bg-blue-300"
                                  : probAnalysis.riskColor === "amber"
                                  ? "bg-amber-400"
                                  : "bg-rose-400"
                              )}
                            />
                            {probAnalysis.riskLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Requer datas de início e fim
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-100 font-medium">
                        {probAnalysis.hasDates ? (
                          <>
                            <span>
                              <strong className="text-white">Progresso Real:</strong> {probAnalysis.realProgress}%
                            </span>
                            <span className="text-blue-300/50">•</span>
                            <span>
                              <strong className="text-white">Ideal (Hoje):</strong> {probAnalysis.idealProgress}%
                            </span>
                            <span className="text-blue-300/50">•</span>
                            <span>
                              <strong className="text-white">Ritmo (IDP/SPI):</strong>{" "}
                              <span
                                className={cn(
                                  "font-bold",
                                  probAnalysis.spi >= 1.0 ? "text-emerald-400" : "text-amber-400"
                                )}
                              >
                                {probAnalysis.spi.toFixed(2)}x
                              </span>
                            </span>
                            {probAnalysis.projectedEndDate && (
                              <>
                                <span className="text-blue-300/50">•</span>
                                <span>
                                  <strong className="text-white">Término Estimado:</strong>{" "}
                                  {formatDate(probAnalysis.projectedEndDate.toISOString())}
                                  {probAnalysis.projectedDiffDays >= 0 ? (
                                    <span className="text-emerald-400 font-bold ml-1">
                                      (+{probAnalysis.projectedDiffDays}d folga)
                                    </span>
                                  ) : (
                                    <span className="text-rose-400 font-bold ml-1">
                                      ({Math.abs(probAnalysis.projectedDiffDays)}d atraso)
                                    </span>
                                  )}
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-blue-200/80 text-xs">
                            Informe as datas de início e prazo final no formulário da tarefa para habilitar a projeção e o cálculo do ritmo ideal.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalTab("probability")}
                    className="shrink-0 self-start lg:self-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm group"
                  >
                    <span>Ver Análise Detalhada & Metodologia</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Alternador de Visualização: Horizonte Temporal vs Gráfico de Gantt */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal size={13} className="text-adasa-mid" />
                      Visualização:
                    </span>
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 shadow-inner">
                      <button
                        type="button"
                        onClick={() => setTimelineView("horizonte")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          timelineView === "horizonte"
                            ? "bg-white text-adasa-dark shadow-xs font-black border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <CalendarRange size={14} />
                        Horizonte Temporal
                      </button>
                      <button
                        type="button"
                        onClick={() => setTimelineView("gantt")}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          timelineView === "gantt"
                            ? "bg-white text-adasa-dark shadow-xs font-black border border-slate-200/60"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <Activity size={14} />
                        Gráfico de Gantt
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-semibold">
                    {timelineView === "horizonte" ? (
                      <span>Régua proporcional com hierarquia de cartões e barras duplas</span>
                    ) : (
                      <span>Matriz cronológica de Gantt com barras duplas (Real vs Ideal)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* VISÃO 1: HORIZONTE TEMPORAL (Régua Temporal Proporcional) */}
              {timelineView === "horizonte" && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Global Timeline Ruler Header */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                        <CalendarRange size={16} className="text-adasa-mid" />
                        <span>Horizonte Temporal Geral</span>
                        <span className="text-slate-400 font-semibold lowercase">
                          ({formatDate(globalTimelineSpan.minDate.toISOString())} até {formatDate(globalTimelineSpan.maxDate.toISOString())} • {globalTimelineSpan.totalDays} dias)
                        </span>
                      </div>
                      {globalTimelineSpan.isTodayInHorizon && (
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Hoje: {globalTimelineSpan.today.toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>

                    {/* Master Time Track */}
                    <div className="relative">
                      <div className="h-8 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/90 flex relative">
                        {globalTimelineSpan.months.map(m => (
                          <div
                            key={`top-m-${m.year}-${m.month}`}
                            style={{ width: `${m.widthPct}%` }}
                            className="h-full border-r border-slate-200 last:border-r-0 flex items-center justify-center px-1 text-[10px] font-black uppercase text-slate-500 tracking-wider hover:bg-slate-200/40 transition-colors"
                            title={`${m.label}`}
                          >
                            <span className="truncate">{m.shortLabel}</span>
                          </div>
                        ))}

                        {/* Today vertical line */}
                        {globalTimelineSpan.isTodayInHorizon && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                            style={{ left: `${globalTimelineSpan.todayPct}%` }}
                          >
                            <span className="absolute -top-1 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full tracking-widest uppercase shadow-xs">
                              Hoje
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hierarchical Cards with Embedded Synchronized Track */}
                  <div className="relative border-l-2 border-slate-200/80 ml-4 lg:ml-6 pl-6 lg:pl-10 space-y-8">
                    {timelineTasks.map(({ task, depth, isTarget, isAncestor }, tIdx) => {
                      const startDateObj = parseSafeDate(task.startDate);
                      const endDateObj = parseSafeDate(task.endDate);
                      const hasDates = startDateObj && endDateObj;
                      
                      let taskLeftPct = 0;
                      let taskWidthPct = 0;

                      if (hasDates && startDateObj && endDateObj) {
                        const sTime = Math.max(globalTimelineSpan.minDate.getTime(), startDateObj.getTime());
                        const eTime = Math.min(globalTimelineSpan.maxDate.getTime(), endDateObj.getTime());
                        taskLeftPct = Math.max(0, ((sTime - globalTimelineSpan.minDate.getTime()) / globalTimelineSpan.totalMs) * 100);
                        const durationMs = Math.max(0, eTime - sTime);
                        taskWidthPct = Math.max(3, (durationMs / globalTimelineSpan.totalMs) * 100);
                      }

                      const normStatus = normalizeStatus(task.status);
                      const dlStatus = getDeadlineStatus(task.endDate, task.status);

                      return (
                        <div key={`timeline-card-${task.id}-${tIdx}`} className="relative group z-10">
                          {/* Branch indicator */}
                          {depth > 0 && (
                            <div
                              className="absolute top-4 border-t-2 border-slate-200/80 border-dashed -z-10"
                              style={{ left: "-20px", width: `calc(20px + ${Math.min(depth * 1.5, 6)}rem)` }}
                            />
                          )}

                          {/* Node Icon on Timeline spine */}
                          <div
                            className={cn(
                              "absolute -left-[37px] lg:-left-[55px] top-1.5 z-10 w-7 h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110",
                              normStatus === "Concluída"
                                ? "bg-emerald-500 text-white"
                                : normStatus === "Em andamento"
                                ? "bg-adasa-mid text-white"
                                : "bg-slate-400 text-white"
                            )}
                          >
                            {normStatus === "Concluída" ? (
                              <CheckCircle2 size={13} className="text-white" />
                            ) : normStatus === "Em andamento" ? (
                              <Activity size={13} className="text-white" />
                            ) : (
                              <Clock size={13} className="text-white" />
                            )}
                          </div>

                          {/* Task Card */}
                          <div
                            className={cn(
                              "border p-5 rounded-2xl hover:shadow-md transition-all cursor-pointer group-hover:-translate-y-0.5",
                              isTarget
                                ? "bg-indigo-50/40 border-indigo-300 shadow-md ring-2 ring-indigo-500/20"
                                : isAncestor
                                ? "bg-slate-50/60 border-slate-200 opacity-90 hover:opacity-100"
                                : "bg-white border-slate-200 hover:border-adasa-mid/60"
                            )}
                            onClick={() => {
                              onClose();
                              onEditTask(task);
                            }}
                            style={{ marginLeft: `${depth > 0 ? Math.min(depth * 1.5, 6) : 0}rem` }}
                          >
                            {/* Card Top: Badges & Dates */}
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-3">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isTarget && (
                                    <span className="text-[10px] font-black tracking-widest uppercase text-white bg-indigo-600 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                      <Activity size={10} /> Selecionada
                                    </span>
                                  )}
                                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                    ID: {task.id}
                                  </span>
                                  <span className={cn("text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border flex items-center gap-1", getPriorityBadgeClass(task.priority))}>
                                    <Flag size={10} /> {task.priority}
                                  </span>

                                  {/* Status badge */}
                                  <span
                                    className={cn(
                                      "text-[9px] font-black uppercase py-0.5 px-2 rounded-md border flex items-center gap-1",
                                      normStatus === "Concluída"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : normStatus === "Em andamento"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    {normStatus === "Concluída" ? <CheckCircle2 size={10} /> : normStatus === "Em andamento" ? <Activity size={10} /> : <Clock size={10} />}
                                    {normStatus}
                                  </span>

                                  {/* Deadline status */}
                                  {normStatus !== "Concluída" && (
                                    <span
                                      className={cn(
                                        "text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 font-bold",
                                        dlStatus === "Atrasada"
                                          ? "bg-rose-500 text-white border-rose-500 shadow-2xs"
                                          : dlStatus === "Crítica"
                                          ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      )}
                                    >
                                      {dlStatus === "Atrasada" ? <AlertCircle size={10} /> : dlStatus === "Crítica" ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                                      {dlStatus}
                                    </span>
                                  )}

                                  {task.parentId && (
                                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                      <GitCommit size={10} /> Subatividade
                                    </span>
                                  )}

                                  {task.categoryIds?.map((cid, cIdx) => {
                                    const cat = categories.find(c => c.id === cid);
                                    return cat ? (
                                      <span key={`task-${task.id}-cat-${cid}-${cIdx}`} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Tag size={10} /> {cat.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>

                                <h4 className="text-base font-black text-slate-800 leading-tight group-hover:text-adasa-mid transition-colors">
                                  {getTaskDisplayName(task)}
                                </h4>
                              </div>

                              {/* Dates block */}
                              <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 shadow-2xs flex-wrap justify-end">
                                <div className="flex flex-col items-start">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CalendarRange size={11} className="text-adasa-mid" /> Início
                                  </span>
                                  <span className="text-xs font-black text-slate-800">{formatDate(task.startDate) || "Não definido"}</span>
                                </div>
                                <div className="w-px h-7 bg-slate-200" />
                                <div className="flex flex-col items-start">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <CalendarRange size={11} className="text-adasa-mid" /> Prazo final
                                  </span>
                                  <span className="text-xs font-black text-slate-800">{formatDate(task.endDate) || "Não definido"}</span>
                                </div>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-xs font-semibold text-slate-600 mb-4 leading-relaxed line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            {/* Mini-Régua Temporal Proporcional da Atividade */}
                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-2 mb-3">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span className="uppercase text-[9px] font-black text-slate-400 tracking-wider flex items-center gap-1">
                                  <SlidersHorizontal size={11} className="text-adasa-mid" /> Janela Temporal e Progresso Real
                                </span>
                                <div className="flex items-center gap-3">
                                  {hasDates && (
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                      {formatDate(task.startDate)} <ArrowRight size={10} className="inline text-slate-400" /> {formatDate(task.endDate)}
                                    </span>
                                  )}
                                  <span className="font-black text-adasa-mid text-xs">
                                    {task.progress || 0}%
                                  </span>
                                </div>
                              </div>

                              {/* Synchronized Proportion Track */}
                              <div className="relative h-6 bg-slate-200/60 rounded-lg overflow-hidden border border-slate-200/80">
                                {/* Grid lines matching master months */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                  {globalTimelineSpan.months.map(m => (
                                    <div
                                      key={`card-m-${task.id}-${m.year}-${m.month}`}
                                      style={{ width: `${m.widthPct}%` }}
                                      className="h-full border-r border-slate-300/40 last:border-r-0"
                                    />
                                  ))}
                                </div>

                                {/* Today marker on this card */}
                                {globalTimelineSpan.isTodayInHorizon && (
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-20 pointer-events-none"
                                    style={{ left: `${globalTimelineSpan.todayPct}%` }}
                                  />
                                )}

                                {/* Proportional Task Block */}
                                {hasDates ? (
                                  <div
                                    style={{ left: `${taskLeftPct}%`, width: `${taskWidthPct}%` }}
                                    className={cn(
                                      "absolute top-0.5 bottom-0.5 rounded-md overflow-hidden shadow-2xs transition-all flex items-center border",
                                      normStatus === "Concluída"
                                        ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                                        : dlStatus === "Atrasada"
                                        ? "bg-rose-100 border-rose-300 text-rose-900"
                                        : "bg-blue-100 border-blue-300 text-blue-900"
                                    )}
                                    title={`${getTaskDisplayName(task)}: ${task.progress || 0}% (${formatDate(task.startDate)} - ${formatDate(task.endDate)})`}
                                  >
                                    {/* Filled progress inside task block */}
                                    <div
                                      style={{ width: `${task.progress || 0}%` }}
                                      className={cn(
                                        "h-full transition-all duration-500 opacity-90",
                                        normStatus === "Concluída"
                                          ? "bg-emerald-500"
                                          : dlStatus === "Atrasada"
                                          ? "bg-rose-500"
                                          : "bg-adasa-mid"
                                      )}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black drop-shadow-xs text-slate-800">
                                      {task.progress || 0}%
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold italic">
                                    Datas não definidas
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Barra Dupla: Progresso Real vs Progresso Ideal (esperado na data de hoje) */}
                            {(() => {
                              const cardAnalysis = isTarget
                                ? probAnalysis
                                : probAnalysis.subtasks.find(s => s.task.id === task.id) || calculateTaskProbability(task, taskById, childrenMap);
                              const cardRealProgress = isTarget ? probAnalysis.realProgress : (task.progress || 0);
                              const cardIdealProgress = cardAnalysis.idealProgress ?? 0;
                              const cardDiff = cardRealProgress - cardIdealProgress;
                              const cardWeight = task.weight !== undefined && task.weight !== ("" as any) ? Number(task.weight) : 1;
                              const cardSubInfo = probAnalysis.subtasks.find(s => s.task.id === task.id);
                              const cardImpact = cardSubInfo?.impactOnParent;
                              const cardExplanation = cardSubInfo?.impactExplanation;

                              return (
                                <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 space-y-3 mb-3">
                                  {/* Header row with weights and indicators */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                      <span className="uppercase text-[9px] font-black text-slate-500 tracking-wider flex items-center gap-1">
                                        <Target size={11} className="text-adasa-mid" /> Comparativo de Progresso & Ritmo
                                      </span>
                                      {isTarget && (
                                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                          <Sparkles size={10} /> Tarefa Pai Selecionada
                                        </span>
                                      )}
                                      {!isTarget && (
                                        <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                          <Scale size={10} className="text-slate-400" /> Peso: {cardWeight}
                                          {cardSubInfo ? ` (${cardSubInfo.weightPercent}% do pai)` : ""}
                                        </span>
                                      )}
                                    </div>

                                    {/* Difference / status badge */}
                                    {hasDates && (
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {cardRealProgress >= 100 ? (
                                          <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Concluída (100%)
                                          </span>
                                        ) : cardDiff >= 5 ? (
                                          <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <TrendingUp size={10} /> +{cardDiff}% Adiantado
                                          </span>
                                        ) : cardDiff >= -5 ? (
                                          <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <Activity size={10} /> No Ritmo Planejado (±5%)
                                          </span>
                                        ) : cardDiff >= -15 ? (
                                          <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <AlertTriangle size={10} /> Defasagem de {Math.abs(cardDiff)}% (Atenção)
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <AlertCircle size={10} /> Atraso Crítico (-{Math.abs(cardDiff)}%)
                                          </span>
                                        )}

                                        {/* Subtask impact tag on parent */}
                                        {!isTarget && cardImpact && (
                                          <span
                                            className={cn(
                                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1",
                                              cardImpact === "positivo"
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : cardImpact === "critico"
                                                ? "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs"
                                                : cardImpact === "moderado"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                            )}
                                            title={cardExplanation}
                                          >
                                            {cardImpact === "critico" ? (
                                              <>
                                                <AlertCircle size={10} /> Gargalo Crítico
                                              </>
                                            ) : cardImpact === "moderado" ? (
                                              <>
                                                <AlertTriangle size={10} /> Alerta de Prazo
                                              </>
                                            ) : cardImpact === "positivo" ? (
                                              <>
                                                <CheckCircle2 size={10} /> Meta Assegurada
                                              </>
                                            ) : (
                                              "Neutro"
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* BARRA 1: PROGRESSO REAL */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-700">
                                      <span className="flex items-center gap-1.5 text-slate-800">
                                        <span className="w-2 h-2 rounded-full bg-adasa-mid shrink-0" />
                                        Progresso Real {isTarget && childrenMap[task.id]?.length ? "(Ponderado pelos Pesos das Subtarefas)" : ""}
                                      </span>
                                      <span className="font-black text-slate-900 text-xs">{cardRealProgress}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-200/80 rounded-full overflow-hidden p-0.5 border border-slate-300/50 shadow-inner relative">
                                      <div
                                        style={{ width: `${Math.min(100, Math.max(0, cardRealProgress))}%` }}
                                        className={cn(
                                          "h-full rounded-full transition-all duration-500 shadow-xs",
                                          normStatus === "Concluída" || cardRealProgress >= 100
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                            : dlStatus === "Atrasada" || cardDiff < -15
                                            ? "bg-gradient-to-r from-rose-500 to-amber-500"
                                            : "bg-gradient-to-r from-adasa-mid to-cyan-600"
                                        )}
                                      />
                                    </div>
                                  </div>

                                  {/* BARRA 2: PROGRESSO IDEAL (ESPERADO NA DATA DE HOJE) - ABAIXO DA REAL */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600">
                                      <span className="flex items-center gap-1.5 text-indigo-950 font-bold">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                        Progresso Ideal (Esperado pelo Calendário Hoje)
                                      </span>
                                      <span className="font-black text-indigo-700 text-xs">
                                        {hasDates ? `${cardIdealProgress}%` : "Datas indefinidas"}
                                      </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden p-0.5 border border-slate-300/40 relative">
                                      {hasDates ? (
                                        <div
                                          style={{ width: `${Math.min(100, Math.max(0, cardIdealProgress))}%` }}
                                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500 opacity-90 shadow-2xs"
                                        />
                                      ) : (
                                        <div className="h-full flex items-center justify-center text-[9px] text-slate-400 italic">
                                          Defina início e fim para calcular
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Micro-insight / Explanation for this task */}
                                  {cardExplanation && !isTarget && (
                                    <p className="text-[10px] text-slate-500 font-medium italic pt-1 border-t border-slate-200/50 flex items-center gap-1">
                                      <Info size={11} className="text-slate-400 shrink-0" />
                                      {cardExplanation}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Card Footer: Responsibles & SEI */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                              {/* Responsibles */}
                              {task.responsibleIds && task.responsibleIds.length > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsáveis:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {task.responsibleIds.map((rid, rIdx) => {
                                      const resp = responsibles.find(r => r.id === rid);
                                      if (!resp) return null;
                                      const initials = resp.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
                                      return (
                                        <div
                                          key={`task-${task.id}-resp-${rid}-${rIdx}`}
                                          className="flex items-center justify-center w-6 h-6 text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200 shadow-2xs"
                                          title={resp.name}
                                        >
                                          {initials}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : <div />}

                              {/* SEI Process */}
                              {task.seiProcess && (
                                <div
                                  onClick={e => handleCopySei(task.seiProcess!, task.id, e)}
                                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                  title="Clique para copiar processo SEI"
                                >
                                  <Copy size={11} className={copiedSeiId === task.id ? "text-emerald-600" : "text-slate-400"} />
                                  <span className="font-mono text-[11px]">{task.seiProcess}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {timelineTasks.length === 0 && (
                      <div className="text-center py-12 text-slate-400 font-semibold italic text-sm">
                        Nenhuma tarefa encontrada na linha do tempo.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VISÃO 2: GRÁFICO DE GANTT */}
              {timelineView === "gantt" && (() => {
            const tasksWithDates = timelineTasks.map(t => t.task).filter(t => t.startDate && t.endDate);
            let startDateLimit = new Date();
            startDateLimit.setMonth(startDateLimit.getMonth() - 1);
            let endDateLimit = new Date();
            endDateLimit.setMonth(endDateLimit.getMonth() + 4);

            const parsedTasks = tasksWithDates
              .map(t => ({
                task: t,
                start: parseSafeDate(t.startDate)!,
                end: parseSafeDate(t.endDate)!,
              }))
              .filter(item => item.start !== null && item.end !== null && item.start <= item.end);

            const today = new Date();
            today.setHours(12, 0, 0, 0);
            const todayTime = today.getTime();

            if (parsedTasks.length > 0) {
              const minTaskTime = Math.min(...parsedTasks.map(t => t.start.getTime()));
              const maxTaskTime = Math.max(...parsedTasks.map(t => t.end.getTime()));
              let minT = new Date(minTaskTime);
              let maxT = new Date(maxTaskTime);

              if (todayTime >= minTaskTime - 60 * 24 * 3600 * 1000 && todayTime <= maxTaskTime + 60 * 24 * 3600 * 1000) {
                if (todayTime < minT.getTime()) minT = new Date(todayTime);
                if (todayTime > maxT.getTime()) maxT = new Date(todayTime);
              }

              minT.setDate(minT.getDate() - 7);
              maxT.setDate(maxT.getDate() + 15);
              startDateLimit = minT;
              endDateLimit = maxT;
            }

            startDateLimit.setHours(0, 0, 0, 0);
            endDateLimit.setHours(23, 59, 59, 999);

            const totalDays = Math.max(1, Math.round((endDateLimit.getTime() - startDateLimit.getTime()) / (1000 * 60 * 60 * 24)));
            const todayDiffDays = (todayTime - startDateLimit.getTime()) / (1000 * 60 * 60 * 24);
            const todayGanttPct = (todayDiffDays / totalDays) * 100;
            const isTodayInGantt = todayGanttPct >= 0 && todayGanttPct <= 100;
            const gridColumns: { label: string; widthPercent: number; key: string }[] = [];

            if (ganttScale === "mes") {
              const currentPointer = new Date(startDateLimit);
              currentPointer.setDate(1);
              const monthsList: { year: number; month: number }[] = [];
              const endPointer = new Date(endDateLimit);

              while (currentPointer <= endPointer) {
                monthsList.push({ year: currentPointer.getFullYear(), month: currentPointer.getMonth() });
                currentPointer.setMonth(currentPointer.getMonth() + 1);
              }

              monthsList.forEach(({ year, month }) => {
                const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
                const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
                const startClamp = monthStart < startDateLimit ? startDateLimit : monthStart;
                const endClamp = monthEnd > endDateLimit ? endDateLimit : monthEnd;
                const clampDays = Math.max(0, Math.round((endClamp.getTime() - startClamp.getTime()) / (1000 * 60 * 60 * 24)));
                if (clampDays > 0) {
                  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                  const pct = (clampDays / totalDays) * 100;
                  gridColumns.push({
                    label: `${monthNames[month]}/${year}`,
                    widthPercent: pct,
                    key: `${year}-${month}`,
                  });
                }
              });
            } else if (ganttScale === "trimestre") {
              const currentPointer = new Date(startDateLimit);
              const currentQ = Math.floor(currentPointer.getMonth() / 3);
              currentPointer.setMonth(currentQ * 3);
              currentPointer.setDate(1);

              const quartersList: { year: number; quarter: number }[] = [];
              const endPointer = new Date(endDateLimit);

              while (currentPointer <= endPointer) {
                const q = Math.floor(currentPointer.getMonth() / 3);
                quartersList.push({ year: currentPointer.getFullYear(), quarter: q });
                currentPointer.setMonth((q + 1) * 3);
              }

              const uniqueQuarters = quartersList.filter(
                (item, index, self) => self.findIndex(t => t.year === item.year && t.quarter === item.quarter) === index
              );

              uniqueQuarters.forEach(({ year, quarter }) => {
                const qStartMonth = quarter * 3;
                const qEndMonth = (quarter + 1) * 3 - 1;
                const qStart = new Date(year, qStartMonth, 1, 0, 0, 0, 0);
                const qEnd = new Date(year, qEndMonth + 1, 0, 23, 59, 59, 999);
                const startClamp = qStart < startDateLimit ? startDateLimit : qStart;
                const endClamp = qEnd > endDateLimit ? endDateLimit : qEnd;
                const clampDays = Math.max(0, Math.round((endClamp.getTime() - startClamp.getTime()) / (1000 * 60 * 60 * 24)));
                if (clampDays > 0) {
                  const pct = (clampDays / totalDays) * 100;
                  gridColumns.push({
                    label: `${quarter + 1}º Trim/${year}`,
                    widthPercent: pct,
                    key: `${year}-Q${quarter}`,
                  });
                }
              });
            } else {
              const currentPointer = new Date(startDateLimit);
              const currentS = Math.floor(currentPointer.getMonth() / 6);
              currentPointer.setMonth(currentS * 6);
              currentPointer.setDate(1);

              const semestersList: { year: number; semester: number }[] = [];
              const endPointer = new Date(endDateLimit);

              while (currentPointer <= endPointer) {
                const s = Math.floor(currentPointer.getMonth() / 6);
                semestersList.push({ year: currentPointer.getFullYear(), semester: s });
                currentPointer.setMonth((s + 1) * 6);
              }

              const uniqueSemesters = semestersList.filter(
                (item, index, self) => self.findIndex(t => t.year === item.year && t.semester === item.semester) === index
              );

              uniqueSemesters.forEach(({ year, semester }) => {
                const sStartMonth = semester * 6;
                const sEndMonth = (semester + 1) * 6 - 1;
                const sStart = new Date(year, sStartMonth, 1, 0, 0, 0, 0);
                const sEnd = new Date(year, sEndMonth + 1, 0, 23, 59, 59, 999);
                const startClamp = sStart < startDateLimit ? startDateLimit : sStart;
                const endClamp = sEnd > endDateLimit ? endDateLimit : sEnd;
                const clampDays = Math.max(0, Math.round((endClamp.getTime() - startClamp.getTime()) / (1000 * 60 * 60 * 24)));
                if (clampDays > 0) {
                  const pct = (clampDays / totalDays) * 100;
                  gridColumns.push({
                    label: `${semester + 1}º Sem/${year}`,
                    widthPercent: pct,
                    key: `${year}-S${semester}`,
                  });
                }
              });
            }

            return (
              <div className="space-y-6 text-left">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-adasa-mid" />
                    Cronograma do Item: {getTaskDisplayName(currentTargetTask)}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">
                    Acompanhe os prazos de início, término e o progresso (%) das subatividades ao longo do tempo.
                  </p>
                </div>

                {/* Scale Selector & Legend */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setGanttScale("mes")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer",
                        ganttScale === "mes" ? "bg-white text-adasa-mid shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => setGanttScale("trimestre")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer",
                        ganttScale === "trimestre" ? "bg-white text-adasa-mid shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Trimestre
                    </button>
                    <button
                      type="button"
                      onClick={() => setGanttScale("semestre")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all cursor-pointer",
                        ganttScale === "semestre" ? "bg-white text-adasa-mid shadow-xs font-black" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Semestre
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3.5 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-2.5 bg-gradient-to-r from-adasa-mid to-cyan-600 rounded-xs shadow-2xs" />
                      <span>Progresso Real</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-2 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xs shadow-2xs" />
                      <span className="text-indigo-950 font-bold">Progresso Ideal (Hoje)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      <span>Concluída (100%)</span>
                    </div>
                    {isTodayInGantt && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        Hoje: {today.toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Gantt Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white shadow-xs">
                  <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 select-none">
                    <div className="w-[300px] sm:w-[360px] p-3.5 border-r border-slate-200 shrink-0">Atividade / Subtarefa</div>
                    <div className="flex-1 flex overflow-hidden relative">
                      {gridColumns.map(gc => (
                        <div
                          key={gc.key}
                          style={{ width: `${gc.widthPercent}%` }}
                          className="p-3.5 text-center border-r border-slate-200 last:border-r-0 truncate text-[10px]"
                        >
                          {gc.label}
                        </div>
                      ))}

                      {/* Today indicator in header */}
                      {isTodayInGantt && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                          style={{ left: `${todayGanttPct}%` }}
                        >
                          <span className="absolute top-1 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-widest leading-none">
                            Hoje
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {timelineTasks.map(({ task, depth, isTarget }, tIdx) => {
                      const dateStart = parseSafeDate(task.startDate);
                      const dateEnd = parseSafeDate(task.endDate);
                      const hasDates = dateStart && dateEnd && dateStart <= dateEnd;

                      let leftPct = 0;
                      let widthPct = 0;

                      if (hasDates && dateStart && dateEnd) {
                        const sClamped = dateStart < startDateLimit ? startDateLimit : dateStart;
                        const eClamped = dateEnd > endDateLimit ? endDateLimit : dateEnd;
                        const startDiff = (sClamped.getTime() - startDateLimit.getTime()) / (1000 * 60 * 60 * 24);
                        const dur = Math.max(1, (eClamped.getTime() - sClamped.getTime()) / (1000 * 60 * 60 * 24));
                        leftPct = Math.max(0, (startDiff / totalDays) * 100);
                        widthPct = Math.max(2, (dur / totalDays) * 100);
                      }

                      const normStatus = normalizeStatus(task.status);

                      // Calculate Real and Ideal Progress for this Gantt item
                      const taskSub = probAnalysis.subtasks.find(s => s.task.id === task.id);
                      let realProg = task.progress || 0;
                      if (isTarget && probAnalysis.hasDates) {
                        realProg = probAnalysis.realProgress;
                      }

                      let idealProg = 0;
                      if (isTarget && probAnalysis.hasDates) {
                        idealProg = probAnalysis.idealProgress;
                      } else if (taskSub) {
                        idealProg = taskSub.idealProgress;
                      } else if (dateStart && dateEnd) {
                        const startMs = dateStart.getTime();
                        const endMs = dateEnd.getTime();
                        const totalD = Math.max(1, (endMs - startMs) / (1000 * 60 * 60 * 24));
                        if (today.getTime() <= startMs) {
                          idealProg = 0;
                        } else if (today.getTime() >= endMs) {
                          idealProg = 100;
                        } else {
                          const elapD = Math.max(0, (today.getTime() - startMs) / (1000 * 60 * 60 * 24));
                          idealProg = Math.min(100, Math.max(0, Math.round((elapD / totalD) * 100)));
                        }
                      }

                      return (
                        <div
                          key={`gantt-row-${task.id}-${tIdx}`}
                          className={cn(
                            "flex items-center hover:bg-slate-50/80 transition-colors group/row",
                            isTarget ? "bg-indigo-50/20" : ""
                          )}
                        >
                          <div className="w-[300px] sm:w-[360px] p-3 border-r border-slate-200/80 shrink-0 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5" style={{ paddingLeft: `${Math.min(depth * 1.2, 5)}rem` }}>
                              {depth > 0 && <span className="w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0" />}
                              <span
                                className={cn(
                                  "font-bold text-xs truncate group-hover/row:text-adasa-mid transition-colors cursor-pointer",
                                  isTarget ? "text-indigo-950 font-black" : "text-slate-800"
                                )}
                                onClick={() => {
                                  onClose();
                                  onEditTask(task);
                                }}
                                title={task.title}
                              >
                                {getTaskDisplayName(task)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400 font-semibold" style={{ paddingLeft: `${Math.min(depth * 1.2, 5)}rem` }}>
                              {task.startDate && <span>Início: {formatDate(task.startDate)}</span>}
                              {task.endDate && <span>Fim: {formatDate(task.endDate)}</span>}
                              {hasDates && (
                                <span className="text-slate-500 font-bold ml-auto pr-1">
                                  R: <strong className="text-slate-800">{realProg}%</strong> | I: <strong className="text-indigo-700">{idealProg}%</strong>
                                </span>
                              )}
                              {!hasDates && <span className="text-amber-500 font-bold">Período não definido</span>}
                            </div>
                          </div>

                          <div className="flex-1 relative flex items-center h-[68px] bg-white hover:bg-slate-50/40">
                            {/* Grid divisions */}
                            <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none">
                              {gridColumns.map((gc, gcIdx) => (
                                <div
                                  key={`bg-${task.id}-${gc.key || gcIdx}`}
                                  style={{ width: `${gc.widthPercent}%` }}
                                  className="h-full border-r border-slate-100 last:border-r-0"
                                />
                              ))}
                            </div>

                            {/* Today vertical red line */}
                            {isTodayInGantt && (
                              <div
                                className="absolute inset-y-0 w-0.5 bg-rose-500/85 z-20 pointer-events-none"
                                style={{ left: `${todayGanttPct}%` }}
                              />
                            )}

                            {/* Gantt Double Bars: Real on top, Ideal below */}
                            {hasDates && dateStart && dateEnd ? (
                              <div className="w-full h-full relative flex items-center px-1">
                                <div
                                  style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                                  onClick={() => {
                                    onClose();
                                    onEditTask(task);
                                  }}
                                  className="flex flex-col gap-1 justify-center py-1 group/bar cursor-pointer select-none"
                                  title={`${getTaskDisplayName(task)}\n• Progresso Real: ${realProg}%\n• Progresso Ideal (Hoje): ${idealProg}%\n• Período: ${formatDate(task.startDate)} a ${formatDate(task.endDate)}`}
                                >
                                  {/* 1. BARRA SUPERIOR: PROGRESSO REAL */}
                                  <div className="relative w-full h-4.5 bg-slate-100/90 rounded-md overflow-hidden border border-slate-300 shadow-2xs">
                                    <div
                                      style={{ width: `${Math.min(100, Math.max(0, realProg))}%` }}
                                      className={cn(
                                        "h-full rounded-xs transition-all duration-300 flex items-center px-1.5 text-white font-black text-[9px] drop-shadow-xs",
                                        normStatus === "Concluída" || realProg >= 100
                                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                          : normStatus === "Em andamento"
                                          ? "bg-gradient-to-r from-adasa-mid to-cyan-600"
                                          : "bg-slate-400"
                                      )}
                                    >
                                      {widthPct > 6 && (
                                        <span className="truncate whitespace-nowrap">
                                          {realProg}% {widthPct > 15 ? "Real" : ""}
                                        </span>
                                      )}
                                    </div>
                                    {widthPct <= 6 && (
                                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-700">
                                        {realProg}%
                                      </span>
                                    )}
                                  </div>

                                  {/* 2. BARRA INFERIOR: PROGRESSO IDEAL (HOJE) */}
                                  <div className="relative w-full h-3.5 bg-slate-100/90 rounded-md overflow-hidden border border-indigo-200 shadow-2xs">
                                    <div
                                      style={{ width: `${Math.min(100, Math.max(0, idealProg))}%` }}
                                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-90 rounded-xs transition-all duration-300 flex items-center px-1 text-white font-black text-[8px]"
                                    >
                                      {widthPct > 7 && (
                                        <span className="truncate whitespace-nowrap">
                                          {idealProg}% {widthPct > 16 ? "Ideal" : ""}
                                        </span>
                                      )}
                                    </div>
                                    {widthPct <= 7 && (
                                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-indigo-900">
                                        {idealProg}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full flex items-center justify-center p-3 text-[10px] text-slate-300 italic">
                                -
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
            </div>
          )}

          {/* TAB 3: ANÁLISE PREDITIVA & PROBABILIDADE DE PRAZO */}
          {modalTab === "probability" && (
            <div className="space-y-6 text-left animate-fadeIn">
              {/* Header Box */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <Gauge size={18} className="text-adasa-mid" />
                      Análise Preditiva & Probabilidade de Cumprimento do Prazo
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Avaliação algorítmica considerando o tempo decorrido, pesos relativos livres das subtarefas, taxa de velocidade de execução e caminho crítico (Padrão SPI / Earned Value Management).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-500">Tarefa em Análise:</span>
                    <span className="text-xs font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      [ID: {currentTargetTask.id}] {currentTargetTask.title}
                    </span>
                  </div>
                </div>

                {!probAnalysis.hasDates ? (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
                    <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                    <h5 className="text-sm font-black text-amber-900 uppercase tracking-wider">
                      Datas de Início e Prazo Final Necessárias
                    </h5>
                    <p className="text-xs text-amber-700 max-w-xl mx-auto font-medium">
                      Para calcular o progresso ideal esperado, o índice de ritmo (IDP) e a probabilidade estatística de cumprimento do prazo, é necessário definir a <strong>Data de Início</strong> e o <strong>Prazo Final</strong> na tarefa pai ou em suas subatividades.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditTask(currentTargetTask);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      Editar Datas no Formulário da Tarefa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Hero Probability Gauge & Key Metric Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Gauge Hero Box */}
                      <div className="lg:col-span-5 bg-adasa-dark text-white rounded-2xl p-6 shadow-md border border-white/10 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-adasa-light/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div>
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                              <Gauge size={14} className="text-adasa-light" />
                              Score de Cumprimento do Prazo
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                                probAnalysis.riskColor === "emerald"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : probAnalysis.riskColor === "blue"
                                  ? "bg-blue-400/20 text-blue-200 border-blue-400/40"
                                  : probAnalysis.riskColor === "amber"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full animate-pulse",
                                  probAnalysis.riskColor === "emerald"
                                    ? "bg-emerald-400"
                                    : probAnalysis.riskColor === "blue"
                                    ? "bg-blue-300"
                                    : probAnalysis.riskColor === "amber"
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                                )}
                              />
                              {probAnalysis.riskLevel === "baixo"
                                ? "Baixo Risco"
                                : probAnalysis.riskLevel === "medio"
                                ? "Risco Moderado"
                                : probAnalysis.riskLevel === "alto"
                                ? "Atenção"
                                : "Risco Crítico"}
                            </span>
                          </div>

                          {/* Large Score Display */}
                          <div className="flex items-baseline gap-3 my-3">
                            <span
                              className={cn(
                                "text-5xl sm:text-6xl font-black tracking-tight",
                                probAnalysis.riskColor === "emerald"
                                  ? "text-emerald-400 drop-shadow-sm"
                                  : probAnalysis.riskColor === "blue"
                                  ? "text-blue-300 drop-shadow-sm"
                                  : probAnalysis.riskColor === "amber"
                                  ? "text-amber-400 drop-shadow-sm"
                                  : "text-rose-400 drop-shadow-sm"
                              )}
                            >
                              {probAnalysis.probability}%
                            </span>
                            <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-wider text-white">
                                {probAnalysis.riskLabel}
                              </span>
                              <span className="text-[11px] text-blue-200/80 font-medium">
                                {probAnalysis.isCompleted
                                  ? "Meta já 100% atingida"
                                  : probAnalysis.isOverdue
                                  ? `Prazo estourado há ${probAnalysis.overdueDays} dia(s)`
                                  : `Horizonte de ${probAnalysis.remainingDays} dias restantes`}
                              </span>
                            </div>
                          </div>

                          {/* Gauge Scale Bar */}
                          <div className="space-y-1.5 my-4">
                            <div className="h-3 w-full bg-blue-950/80 rounded-full overflow-hidden p-0.5 border border-blue-900/60 relative">
                              <div
                                style={{ width: `${probAnalysis.probability}%` }}
                                className={cn(
                                  "h-full rounded-full transition-all duration-700",
                                  probAnalysis.riskColor === "emerald"
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/50 shadow-sm"
                                    : probAnalysis.riskColor === "blue"
                                    ? "bg-gradient-to-r from-blue-400 to-cyan-300 shadow-blue-400/50 shadow-sm"
                                    : probAnalysis.riskColor === "amber"
                                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-amber-500/50 shadow-sm"
                                    : "bg-gradient-to-r from-rose-500 to-red-400 shadow-rose-500/50 shadow-sm"
                                )}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] font-black uppercase text-blue-200/80 px-0.5">
                              <span>0% Crítico</span>
                              <span>40% Atenção</span>
                              <span>60% Moderado</span>
                              <span>80% Alto</span>
                              <span>100% Garantido</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Diagnostic Pill */}
                        <div className="pt-3 border-t border-white/15 text-[11px] text-blue-100 font-medium leading-relaxed">
                          {probAnalysis.isCompleted ? (
                            <span>A atividade e suas metas estão totalmente finalizadas.</span>
                          ) : probAnalysis.isOverdue ? (
                            <span className="text-rose-300 font-bold">
                              O prazo original expirou em {formatDate(probAnalysis.endDate?.toISOString())}. A entrega requer formalização ou aditivo de cronograma.
                            </span>
                          ) : probAnalysis.spi >= 1.0 ? (
                            <span>
                              Ritmo positivo: avanço real de <strong className="text-white">{probAnalysis.realProgress}%</strong> supera a meta ideal de hoje (<strong className="text-white">{probAnalysis.idealProgress}%</strong>).
                            </span>
                          ) : (
                            <span>
                              Atenção: existe uma defasagem de <strong className="text-amber-300">{Math.abs(probAnalysis.progressDiff)}%</strong> frente ao cronograma esperado para hoje (<strong className="text-white">{probAnalysis.idealProgress}%</strong>).
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4 Executive Metric Cards */}
                      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Metric 1: IDP / SPI */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                          <div>
                            <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Zap size={14} className="text-amber-500" />
                                Ritmo (IDP / SPI)
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-md",
                                  probAnalysis.spi >= 1.0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                )}
                              >
                                {probAnalysis.spi >= 1.0 ? "Adequado" : "Abaixo"}
                              </span>
                            </div>
                            <div className="text-2xl font-black text-slate-800">
                              {probAnalysis.spi.toFixed(2)}x
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">
                              {probAnalysis.spi >= 1.0
                                ? `Executando ${Math.round((probAnalysis.spi - 1) * 100)}% mais rápido do que o cronograma base planejado.`
                                : `Executando ${Math.round((1 - probAnalysis.spi) * 100)}% mais devagar que a velocidade esperada.`}
                            </p>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-bold uppercase">
                            SPI = Progresso Real / Progresso Ideal
                          </div>
                        </div>

                        {/* Metric 2: Real vs Ideal Progress */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                          <div>
                            <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <Target size={14} className="text-adasa-mid" />
                                Real vs Ideal
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-md",
                                  probAnalysis.progressDiff >= 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                )}
                              >
                                {probAnalysis.progressDiff >= 0
                                  ? `+${probAnalysis.progressDiff}%`
                                  : `${probAnalysis.progressDiff}%`}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-slate-800">
                                {probAnalysis.realProgress}%
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                (Ideal hoje: {probAnalysis.idealProgress}%)
                              </span>
                            </div>
                            <div className="space-y-1.5 mt-2">
                              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${probAnalysis.realProgress}%` }}
                                  className="h-full bg-adasa-mid rounded-full"
                                />
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${probAnalysis.idealProgress}%` }}
                                  className="h-full bg-indigo-500 rounded-full opacity-80"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-bold uppercase flex justify-between">
                            <span>Azul: Real</span>
                            <span>Roxo: Ideal Hoje</span>
                          </div>
                        </div>

                        {/* Metric 3: Projected Delivery Date */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                          <div>
                            <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <CalendarRange size={14} className="text-indigo-600" />
                                Projeção de Término
                              </span>
                            </div>
                            <div className="text-xl font-black text-slate-800">
                              {probAnalysis.projectedEndDate
                                ? formatDate(probAnalysis.projectedEndDate.toISOString())
                                : "Em cálculo"}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">
                              Prazo final pactuado:{" "}
                              <strong>{formatDate(probAnalysis.endDate?.toISOString())}</strong>
                            </p>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-200/60 text-[10px] font-bold">
                            {probAnalysis.projectedDiffDays >= 0 ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                                <TrendingUp size={10} /> Folga de +{probAnalysis.projectedDiffDays} dias
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                                <AlertTriangle size={10} /> Atraso de {Math.abs(probAnalysis.projectedDiffDays)} dias além do prazo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metric 4: Daily Velocity */}
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow">
                          <div>
                            <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-teal-600" />
                                Velocidade Diária
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-slate-800">
                                {probAnalysis.dailyVelocityReal}%
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">/dia (real)</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">
                              Demanda necessária para fechar no prazo:{" "}
                              <strong className="text-slate-800">
                                {probAnalysis.dailyVelocityNeeded}%/dia
                              </strong>
                            </p>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-200/60 text-[10px] font-bold">
                            {probAnalysis.dailyVelocityReal >= probAnalysis.dailyVelocityNeeded ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Ritmo diário suficiente
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Requer aceleração diária (+{Math.round((probAnalysis.dailyVelocityNeeded - probAnalysis.dailyVelocityReal) * 100) / 100}%/d)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mathematical Methodology & Step-by-Step Breakdown */}
                    <div className="bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-100 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                      <div className="border-b border-indigo-100 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HelpCircle size={18} className="text-indigo-600 shrink-0" />
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Memória de Cálculo & Metodologia Explicada
                          </h5>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full border border-indigo-200">
                          Padrão Metodológico Transparente
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                        {/* Step 1 */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                            Tempo Decorrido & Progresso Ideal
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Com base na janela temporal de <strong>{probAnalysis.totalDays} dias</strong> ({formatDate(probAnalysis.startDate?.toISOString())} até {formatDate(probAnalysis.endDate?.toISOString())}), transcorreram até a presente data <strong>{probAnalysis.elapsedDays} dias</strong> ({probAnalysis.idealProgress}% da duração).
                          </p>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[10px] text-slate-800">
                            P_ideal = (Dias Decorridos / Dias Totais) × 100%<br />
                            P_ideal = ({probAnalysis.elapsedDays} / {probAnalysis.totalDays}) × 100% = <strong>{probAnalysis.idealProgress}%</strong>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                            Ponderação de Pesos das Subtarefas
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            O progresso real da tarefa pai (<strong>{probAnalysis.realProgress}%</strong>) resulta da soma ponderada do progresso de cada subtarefa multiplicado pelo seu peso relativo livre, dividido pela soma total de pesos (<strong>{probAnalysis.totalWeight || 1}</strong>).
                          </p>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[10px] text-slate-800">
                            P_real = ∑ (Progresso_i × Peso_i) / ∑ (Peso_i)<br />
                            P_real = <strong>{probAnalysis.realProgress}%</strong> ({probAnalysis.subtasks.length} subtarefas ponderadas)
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                            Índice de Desempenho de Prazo (IDP / SPI)
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            Mede a velocidade histórica de entrega em relação ao tempo consumido. Valor 1.0 indica perfeita adesão ao cronograma; &gt; 1.0 indica antecipação; &lt; 1.0 indica atraso que consome margem.
                          </p>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[10px] text-slate-800">
                            IDP = Progresso Real / Progresso Ideal<br />
                            IDP = {probAnalysis.realProgress}% / {Math.max(1, probAnalysis.idealProgress)}% = <strong>{probAnalysis.spi.toFixed(2)}x</strong>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 font-black text-slate-800 text-xs">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">4</span>
                            Modelo Probabilístico & Penalidades
                          </div>
                          <p className="text-[11px] leading-relaxed">
                            A probabilidade final (<strong>{probAnalysis.probability}%</strong>) combina o IDP histórico, a aceleração diária requerida vs observada, a folga temporal restante e penaliza subtarefas de maior peso com atrasos graves.
                          </p>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-[10px] text-slate-800">
                            Score = Base(IDP) + Fator(Velocidade) + Buffer(Dias) - Penalidades<br />
                            Probabilidade Final = <strong>{probAnalysis.probability}%</strong> ({probAnalysis.riskLabel})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subtasks Sensitivity & Impact Matrix */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} className="text-adasa-mid" />
                            Matriz de Sensibilidade e Risco das Subtarefas
                          </h5>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Veja como o peso e o ritmo individual de cada subatividade influenciam o cumprimento da meta geral da tarefa pai.
                          </p>
                        </div>

                        <span className="text-[11px] font-bold text-slate-500 self-start sm:self-center">
                          Total: <strong>{probAnalysis.subtasks.length}</strong> subatividades
                        </span>
                      </div>

                      {probAnalysis.subtasks.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-semibold italic text-xs">
                          Esta atividade não possui subtarefas subordinadas. Seu cálculo probabilístico é baseado diretamente na sua própria velocidade de avanço.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-3">Subatividade</th>
                                <th className="p-3 text-center">Peso Relativo</th>
                                <th className="p-3">Período Planejado</th>
                                <th className="p-3">Real vs Ideal</th>
                                <th className="p-3 text-center">Situação</th>
                                <th className="p-3">Impacto no Prazo Final</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {probAnalysis.subtasks.map((sub, sIdx) => (
                                <tr
                                  key={`prob-sub-${sub.task.id}-${sIdx}`}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                      <span className="text-[10px] text-slate-400 font-mono">#{sub.task.id}</span>
                                      <span className="hover:text-adasa-mid transition-colors cursor-pointer" onClick={() => { onClose(); onEditTask(sub.task); }}>
                                        {sub.task.title}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="inline-flex items-center gap-1 font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                                      <Scale size={10} className="text-slate-400" />
                                      {sub.weight} ({sub.weightPercent}%)
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 text-[11px]">
                                    {sub.startDate && sub.endDate ? (
                                      <span>
                                        {formatDate(sub.startDate.toISOString())} → {formatDate(sub.endDate.toISOString())}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Período indefinido</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="space-y-1 w-36">
                                      <div className="flex justify-between text-[10px] font-bold">
                                        <span className="text-slate-700">Real: {sub.progress}%</span>
                                        <span className="text-indigo-600">Ideal: {sub.idealProgress}%</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                                        <div
                                          style={{ width: `${sub.progress}%` }}
                                          className="h-full bg-adasa-mid rounded-full"
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={cn(
                                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-md border",
                                        sub.status === "Concluída"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : sub.status === "Atrasada"
                                          ? "bg-rose-50 text-rose-700 border-rose-200"
                                          : sub.status === "Atenção"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : sub.status === "Não iniciada"
                                          ? "bg-slate-100 text-slate-600 border-slate-200"
                                          : "bg-blue-50 text-blue-700 border-blue-200"
                                      )}
                                    >
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="space-y-1">
                                      <span
                                        className={cn(
                                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border inline-flex items-center gap-1",
                                          sub.impactOnParent === "positivo"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : sub.impactOnParent === "critico"
                                            ? "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs font-bold"
                                            : sub.impactOnParent === "moderado"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                        )}
                                      >
                                        {sub.impactOnParent === "critico"
                                          ? "Gargalo Crítico"
                                          : sub.impactOnParent === "moderado"
                                          ? "Risco Moderado"
                                          : sub.impactOnParent === "positivo"
                                          ? "Contribuição Positiva"
                                          : "Neutro"}
                                      </span>
                                      <p className="text-[10px] text-slate-500 font-medium leading-tight">
                                        {sub.impactExplanation}
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Recommendations Box */}
                    <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-emerald-200 pb-2.5">
                        <Sparkles size={16} className="text-emerald-600 shrink-0" />
                        <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Diagnóstico & Recomendações Acionáveis
                        </h5>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-700 font-medium">
                        {probAnalysis.recommendations.map((rec, rIdx) => (
                          <li key={`rec-${rIdx}`} className="flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CÁLCULO DO PROGRESSO */}
          {modalTab === "calc" && (
            <div className="mt-2">
              {renderProgressCalc
                ? renderProgressCalc(taskId, currentTargetTask?.progress ?? 0)
                : (
                  <div className="p-8 text-center text-slate-400 font-semibold italic">
                    Cálculo do progresso disponível na tela de detalhes.
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
