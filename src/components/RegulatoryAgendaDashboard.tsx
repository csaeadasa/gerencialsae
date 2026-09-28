import React, { useState, useEffect, useMemo } from "react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from "recharts";
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Search, 
  Filter, 
  ExternalLink, 
  Share2, 
  Compass, 
  Sparkles,
  ChevronDown,
  ChevronRight,
  X,
  Flag,
  GitCommit,
  Tag,
  CalendarRange,
  Link2,
  FileDigit,
  Copy,
  Circle,
  AlertCircle,
  Calendar,
  CalendarDays,
  Layers,
  Activity,
  FolderKanban,
  Info
} from "lucide-react";
import { calculateDurationInDays } from "../utils/durationUtils";
import { Task, Area, Category, Responsible } from "../types";
import { TaskTimelineModal } from "./TaskTimelineModal";

interface RegulatoryAgenda {
  id: number;
  nome: string;
  tema: string;
  task_ids: number[];
  agenda_tasks?: {
    task_id: number;
    status: string;
    entrega: string;
    entrega_link?: string;
  }[];
}

interface RegulatoryAgendaDashboardProps {
  showToast: any;
}

export function RegulatoryAgendaDashboard({ showToast }: RegulatoryAgendaDashboardProps) {
  const [agendas, setAgendas] = useState<RegulatoryAgenda[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [filterTema, setFilterTema] = useState("TODOS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterAgenda, setFilterAgenda] = useState("TODOS");

  // State to track collapsed/expanded agendas in the table grouping
  const [collapsedAgendas, setCollapsedAgendas] = useState<Record<string, boolean>>({});

  // Timeline states matching PlanningTab
  const [timelineTaskId, setTimelineTaskId] = useState<number | null>(null);

  const toggleAgendaCollapse = (agendaNome: string) => {
    setCollapsedAgendas(prev => ({
      ...prev,
      [agendaNome]: !prev[agendaNome]
    }));
  };

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const agendasRes = await fetch("/api/agendas");
          if (agendasRes.ok) {
            const agendasJson = await agendasRes.json();
            if (agendasJson.success) {
              setAgendas(agendasJson.data || []);
            }
          }
        } catch (agErr) {
          console.warn("Aviso ao carregar agendas:", agErr);
        }
        
        try {
          const loadDataRes = await fetch("/api/load-data?scope=regulatory-agenda");
          if (loadDataRes.ok) {
            const loadDataJson = await loadDataRes.json();
            if (loadDataJson.success && loadDataJson.data) {
              const cloud = loadDataJson.data;
              setTasks(cloud.tasks || []);
              setResponsibles(cloud.responsibles || []);
              setCategories(cloud.categories || []);
              setPlans(cloud.plans || []);
              setAreas(cloud.areas || []);
            }
          }
        } catch (ldErr) {
          console.warn("Aviso ao carregar load-data:", ldErr);
        }
      } catch (error: any) {
        console.error("Erro no fetchData do RegulatoryAgendaDashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const themeList = [
    "TODOS",
    "QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS",
    "FORTALECIMENTO DA CAPACIDADE REGULATÓRIA"
  ];

  const statusList = [
    "TODOS",
    "Não iniciada",
    "Em andamento",
    "Concluída"
  ];

  // Map Task names for quick lookup
  const taskMap = useMemo(() => {
    const map: Record<number, Task> = {};
    tasks.forEach(t => {
      map[t.id] = t;
    });
    return map;
  }, [tasks]);

  const taskById = taskMap;

  const childrenMap = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach(t => {
      if (t.parentId) {
        if (!map[t.parentId]) map[t.parentId] = [];
        map[t.parentId].push(t);
      }
    });
    return map;
  }, [tasks]);

  // Simple custom class-merger utility
  const cn = (...classes: any[]) => {
    return classes.filter(Boolean).join(" ");
  };

  const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
    if (!status) return "Não iniciada";
    const s = status.toLowerCase().trim();
    if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
    if (s === "em andamento" || s === "in_progress" || s === "in progress") return "Em andamento";
    return "Não iniciada";
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
      return d.toLocaleDateString("pt-BR");
    } catch (e) {
      return dateStr;
    }
  };

  const getTaskDisplayName = (t: Task | undefined) => {
    if (!t) return "";
    return t.title;
  };

  function renderProgressCalc(targetTaskId: number | null, fallbackProgress: number) {
    if (!targetTaskId) return null;
    return (
      <div className="space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm shadow-sm">
                      <h4 className="font-bold flex items-center gap-2 mb-2"><Activity size={16} /> Cálculo por Pesos Relativos Livres</h4>
                      <p className="mb-2">O <strong>cálculo por pesos relativos livres</strong> permite que você defina a importância de cada subtarefa em relação às outras atribuindo-lhes um valor numérico ("peso"). Este peso não precisa somar 100.</p>
                      <ul className="list-disc pl-5 space-y-1 mt-2 text-xs">
                        <li>Uma subtarefa com peso <strong>2.0</strong> impacta o dobro no progresso da tarefa pai do que uma tarefa com peso <strong>1.0</strong>.</li>
                        <li>Se uma tarefa não possui subtarefas, seu progresso é inserido de forma manual.</li>
                        <li>Se possui subtarefas, o progresso da tarefa pai é a soma do progresso ponderado de cada componente, dividido pela soma de todos os pesos.</li>
                      </ul>
                    </div>
                    
                    {(() => {
                      if (!targetTaskId || !childrenMap[targetTaskId] || childrenMap[targetTaskId].length === 0) {
                        return (
                          <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                              <p className="text-sm font-semibold text-slate-500 mb-1">Cálculo Manual</p>
                              <p className="text-xs text-slate-400">Esta atividade não possui subtarefas dependentes. Seu progresso deve ser informado e atualizado manualmente na aba Formulário.</p>
                            </div>
                            
                            <div className="bg-gradient-to-br from-emerald-50/50 to-slate-50/50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-3 border-b border-emerald-100 pb-3">
                                <Activity className="text-emerald-600 shrink-0" size={18} />
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Fórmula de Cálculo Manual</h4>
                              </div>
                              <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-2 font-mono text-xs">
                                <span className="text-slate-500 font-bold">Progresso =</span>
                                <span className="font-bold text-slate-800">Progresso Definido Manualmente =</span>
                                <span className="text-base font-black text-emerald-700 bg-emerald-100/40 px-2.5 py-1 rounded-lg">{(fallbackProgress)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Compute active elements
                      const subtasks = childrenMap[targetTaskId];
                      let totalWeight = 0;
                      let totalCalculated = 0;
                      
                      const computeChildNode = (nodeId: number): any => {
                        const node = taskById[nodeId];
                        if (!node) return { progress: 0, weight: 1 };
                        const cList = childrenMap[nodeId] || [];
                        if (cList.length === 0) return { progress: node.progress || 0, weight: node.weight !== undefined && node.weight !== ("" as any) ? Number(node.weight) : 1 };
                        let cTotalP = 0;
                        let cTotalW = 0;
                        cList.forEach(c => {
                          const cChild = computeChildNode(c.id);
                          const w = cChild.weight;
                          cTotalP += (cChild.progress || 0) * w;
                          cTotalW += w;
                        });
                        return { 
                          progress: cTotalW > 0 ? Math.round(cTotalP / cTotalW) : 0, 
                          weight: node.weight !== undefined && node.weight !== ("" as any) ? Number(node.weight) : 1 
                        };
                      };

                      const subtaskDetails = subtasks.map(sub => {
                        const childInfo = computeChildNode(sub.id);
                        const prog = childInfo.progress;
                        const w = childInfo.weight;
                        const impact = prog * w;
                        totalWeight += w;
                        totalCalculated += impact;
                        return {
                          id: sub.id,
                          title: getTaskDisplayName(sub),
                          progress: prog,
                          weight: w,
                          impact: impact
                        };
                      });

                      const finalResult = totalWeight > 0 ? Math.round(totalCalculated / totalWeight) : 0;

                      return (
                        <div className="space-y-5">
                          {/* Rich mathematical dynamic formula display */}
                          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-3 mb-4">
                              <div className="flex items-center gap-2">
                                <Activity className="text-indigo-600 shrink-0" size={18} />
                                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Demonstração da Fórmula Geral</h4>
                              </div>
                              <div className="bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-sm">
                                Resultado = {finalResult}%
                              </div>
                            </div>
                            
                            <div className="bg-white border border-slate-200 p-4 rounded-xl overflow-x-auto">
                              <div className="flex items-center gap-2.5 font-mono text-xs whitespace-nowrap">
                                <span className="text-slate-500 font-extrabold text-[11px]">Progresso de {getTaskDisplayName(taskById[targetTaskId])} =</span>
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-bold border-b border-slate-350 pb-1 text-slate-700 px-2 flex gap-1">
                                    {subtaskDetails.map((s, idx) => (
                                      <span key={s.id} className="inline-flex items-center gap-1">
                                        ({s.progress}% &times; {s.weight}) {idx < subtaskDetails.length - 1 ? "+" : ""}
                                      </span>
                                    ))}
                                  </span>
                                  <span className="font-bold pt-1 text-slate-600">
                                    {subtaskDetails.map((s, idx) => (
                                      <span key={s.id}>
                                        {s.weight} {idx < subtaskDetails.length - 1 ? "+" : ""}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                                <span className="text-slate-400 font-bold">=</span>
                                <span className="text-slate-600 font-extrabold">{totalCalculated} / {totalWeight} =</span>
                                <span className="text-sm font-black text-emerald-700 bg-emerald-100/45 px-2.5 py-1 rounded-lg">{finalResult}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Components Details List */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Graus de Relevância por Subtarefa</h4>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
                              {subtaskDetails.map(sub => (
                                <div key={sub.id} className="flex flex-wrap items-center justify-between p-4 gap-3 hover:bg-slate-50/50 transition-colors">
                                  <div className="space-y-1 max-w-md">
                                    <h5 className="text-[13px] font-black text-slate-800 tracking-tight leading-none flex items-center gap-1.5 font-sans">
                                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                      {sub.title}
                                    </h5>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">ID: {sub.id}</p>
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0 font-bold font-sans">
                                    <div className="text-center">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Progresso</p>
                                      <span className="text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{sub.progress}%</span>
                                    </div>
                                    <div className="text-center w-12">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Peso</p>
                                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{sub.weight}</span>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Impacto</p>
                                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{sub.impact} p.c.</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
      </div>
    );
  }

  // Aggregate stats across all agendas and items
  const stats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let inProgressItems = 0;
    let pendingItems = 0;
    let totalProgressSum = 0;

    agendas.forEach(agenda => {
      if (filterAgenda !== "TODOS" && agenda.nome !== filterAgenda) return;
      if (filterTema !== "TODOS" && agenda.tema !== filterTema) return;

      const items = agenda.agenda_tasks || [];
      items.forEach(it => {
        const taskObj = taskMap[it.task_id];
        const effectiveStatus = normalizeStatus(taskObj?.status || it.status);
        const prog = typeof taskObj?.progress === "number" ? taskObj.progress : (effectiveStatus === "Concluída" ? 100 : 0);
        totalItems++;
        totalProgressSum += prog;
        if (effectiveStatus === "Concluída") {
          completedItems++;
        } else if (effectiveStatus === "Em andamento") {
          inProgressItems++;
        } else {
          pendingItems++;
        }
      });
    });

    const averageProgressPct = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;

    return {
      totalAgendas: agendas.filter(agenda => {
        if (filterAgenda !== "TODOS" && agenda.nome !== filterAgenda) return false;
        if (filterTema !== "TODOS" && agenda.tema !== filterTema) return false;
        return true;
      }).length,
      totalItems,
      completedItems,
      inProgressItems,
      pendingItems,
      averageProgressPct,
      completedPct: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      inProgressPct: totalItems > 0 ? Math.round((inProgressItems / totalItems) * 100) : 0,
      pendingPct: totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0
    };
  }, [agendas, taskMap, filterAgenda, filterTema]);

  // Chart data: Distribution of items status
  const pieChartData = useMemo(() => {
    return [
      { name: "Concluída", value: stats.completedItems, color: "#10b981" },
      { name: "Em andamento", value: stats.inProgressItems, color: "#3b82f6" },
      { name: "Não iniciada", value: stats.pendingItems, color: "#94a3b8" }
    ].filter(i => i.value > 0);
  }, [stats]);

  // Chart data: Themes performance (stacked bars)
  const themeChartData = useMemo(() => {
    const dataMap: Record<string, { concluida: number; emAndamento: number; naoIniciada: number }> = {};
    
    // Initialize
    themeList.forEach(theme => {
      if (theme !== "TODOS") {
        dataMap[theme] = { concluida: 0, emAndamento: 0, naoIniciada: 0 };
      }
    });

    agendas.forEach(agenda => {
      if (filterAgenda !== "TODOS" && agenda.nome !== filterAgenda) return;

      const theme = agenda.tema;
      if (!dataMap[theme]) {
        dataMap[theme] = { concluida: 0, emAndamento: 0, naoIniciada: 0 };
      }
      const items = agenda.agenda_tasks || [];
      items.forEach(it => {
        const taskObj = taskMap[it.task_id];
        const effectiveStatus = normalizeStatus(taskObj?.status || it.status);
        if (effectiveStatus === "Concluída") {
          dataMap[theme].concluida++;
        } else if (effectiveStatus === "Em andamento") {
          dataMap[theme].emAndamento++;
        } else {
          dataMap[theme].naoIniciada++;
        }
      });
    });

    return Object.keys(dataMap).map(key => {
      let displayName = key;
      if (key === "QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS") {
        displayName = "Qualidade Mod. 1";
      } else if (key === "FORTALECIMENTO DA CAPACIDADE REGULATÓRIA") {
        displayName = "Capacid. Regulatória";
      }

      return {
        tema: displayName,
        fullTemaName: key,
        "Concluída": dataMap[key].concluida,
        "Em andamento": dataMap[key].emAndamento,
        "Não iniciada": dataMap[key].naoIniciada
      };
    }).filter(item => {
      if (filterTema !== "TODOS" && item.fullTemaName !== filterTema) return false;
      return true;
    });
  }, [agendas, themeList, taskMap, filterAgenda, filterTema]);

  // Distinct agenda names
  const agendaNames = useMemo(() => {
    return Array.from(new Set(agendas.map(a => a.nome).filter(Boolean)));
  }, [agendas]);

  const filteredAgendasForTable = useMemo(() => {
    return agendas.filter(agenda => {
      const matchesAgenda = filterAgenda === "TODOS" || agenda.nome === filterAgenda;
      const matchesTema = filterTema === "TODOS" || agenda.tema === filterTema;
      return matchesAgenda && matchesTema;
    });
  }, [agendas, filterAgenda, filterTema]);

  // Filtered listing of all individual items (tasks) across agendas
  const flattenedAndFilteredItems = useMemo(() => {
    const items: Array<{
      agendaId: number;
      agendaNome: string;
      agendaTema: string;
      taskId: number;
      taskTitle: string;
      status: string;
      progress: number;
      entrega: string;
      entregaLink?: string;
      startDate?: string;
      endDate?: string;
    }> = [];

    agendas.forEach(agenda => {
      const agendaTasks = agenda.agenda_tasks || [];
      agendaTasks.forEach(it => {
        const taskObj = taskMap[it.task_id];
        const taskTitle = taskObj ? taskObj.title : `Atividade ID: ${it.task_id}`;
        const effectiveStatus = normalizeStatus(taskObj?.status || it.status);
        const prog = typeof taskObj?.progress === "number" ? taskObj.progress : (effectiveStatus === "Concluída" ? 100 : 0);
        
        // Apply filters
        const matchesSearch = searchText === "" || 
          taskTitle.toLowerCase().includes(searchText.toLowerCase()) ||
          agenda.nome.toLowerCase().includes(searchText.toLowerCase()) ||
          (it.entrega || "").toLowerCase().includes(searchText.toLowerCase());

        const matchesTema = filterTema === "TODOS" || agenda.tema === filterTema;
        const matchesStatus = filterStatus === "TODOS" || effectiveStatus === filterStatus;
        const matchesAgenda = filterAgenda === "TODOS" || agenda.nome === filterAgenda;

        if (matchesSearch && matchesTema && matchesStatus && matchesAgenda) {
          items.push({
            agendaId: agenda.id,
            agendaNome: agenda.nome,
            agendaTema: agenda.tema,
            taskId: it.task_id,
            taskTitle: taskTitle,
            status: effectiveStatus,
            progress: prog,
            entrega: it.entrega,
            entregaLink: it.entrega_link,
            startDate: taskObj?.startDate,
            endDate: taskObj?.endDate
          });
        }
      });
    });

    return items;
  }, [agendas, taskMap, searchText, filterTema, filterStatus, filterAgenda]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof flattenedAndFilteredItems> = {};
    flattenedAndFilteredItems.forEach(item => {
      if (!groups[item.agendaNome]) {
        groups[item.agendaNome] = [];
      }
      groups[item.agendaNome].push(item);
    });
    return groups;
  }, [flattenedAndFilteredItems]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 w-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-adasa-mid border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Carregando Indicadores...</h4>
        <p className="text-xs text-slate-400 mt-1">Sincronizando status das ações regulatórias.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 text-left flex flex-col gap-6">
      {/* Header element */}
      <div className="bg-gradient-to-r from-adasa-dark to-[#133170] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-adasa-mid/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 font-bold">
          <span className="text-[10px] bg-white/10 text-white/90 border border-white/20 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none mb-3 inline-block">
            MAPEAMENTO & MONITORAMENTO REGULATÓRIO
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Painel Estratégico da Agenda Regulatória
          </h2>
          <p className="text-xs text-blue-105 font-medium mt-2">
            Agenda Regulatória da Superintendência de Abastecimento de Água e Esgoto • ADASA
          </p>
        </div>
        <div className="relative z-10 shrink-0 self-start md:self-center">
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?public=reg_agenda_painel`;
              navigator.clipboard.writeText(shareUrl)
                .then(() => {
                  showToast("Link Copiado!", "O link de acesso público do painel da agenda regulatória foi copiado para a área de transferência.", "success");
                })
                .catch(() => {
                  alert(`Link público do painel: ${shareUrl}`);
                });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer select-none"
          >
            <Share2 size={14} className="text-adasa-light animate-pulse" />
            <span>Compartilhar Painel</span>
          </button>
        </div>
      </div>

      {/* Filtros Estratégicos da Agenda */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Filter size={15} className="text-adasa-dark" />
              Filtros de Pesquisa - Agenda Regulatória
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              Refine a visualização das agendas, metas, KPIs e gráficos de progresso.
            </p>
          </div>
          {(filterAgenda !== "TODOS" || filterTema !== "TODOS" || filterStatus !== "TODOS" || searchText !== "") && (
            <button
              onClick={() => {
                setFilterAgenda("TODOS");
                setFilterTema("TODOS");
                setFilterStatus("TODOS");
                setSearchText("");
              }}
              className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-750 transition-colors flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl cursor-pointer select-none"
            >
              <X size={12} />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Nome da Agenda */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📖 Nome da Agenda</span>
            <select
              value={filterAgenda}
              onChange={(e) => setFilterAgenda(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-adasa-mid transition-all"
            >
              <option value="TODOS">Todas as Agendas</option>
              {agendaNames.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Tema Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">📂 Tema da Agenda</span>
            <select
              value={filterTema}
              onChange={(e) => setFilterTema(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-adasa-mid transition-all"
            >
              {themeList.map((st, idx) => (
                <option key={idx} value={st}>{st === "TODOS" ? "Todos os Temas" : st.substring(0, 30) + "..."}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🚦 Situação / Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-adasa-mid transition-all"
            >
              {statusList.map((st, idx) => (
                <option key={idx} value={st}>{st === "TODOS" ? "Todos os Status" : st}</option>
              ))}
            </select>
          </div>

          {/* Search items bar */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">🔍 Pesquisa Geral</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filtrar atividade ou entrega..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:border-adasa-mid outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Middle broad banner - Estoque Regulatório Total & Progresso Geral */}
      <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5 hover:translate-y-[-2px] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sky-50 border border-sky-100 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={28} className="text-adasa-dark" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                TOTAL DE ITENS REGULATÓRIOS
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <h3 className="text-3xl md:text-4xl font-black text-slate-800 leading-none">
                  {stats.totalItems}
                </h3>
                <span className="text-xs text-slate-400 font-bold">atividades monitoradas</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Metas e atividades cadastradas e monitoradas pelas superintendências
              </p>
            </div>
          </div>
          <div className="shrink-0 self-start md:self-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-full text-xs font-extrabold leading-none select-none shadow-3xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              Base de Dados Integrada em Tempo Real
            </div>
          </div>
        </div>

        {/* Highlighted Progress Bar Card matching user design */}
        <div className="w-full bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 md:p-5 flex flex-col gap-3 shadow-3xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>PERCENTUAL DE CONCLUSÃO</span>
                <Info size={13} className="text-slate-400 hover:text-slate-600 transition-colors cursor-help" title="Média ponderada do progresso de todas as atividades e metas cadastradas" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {stats.averageProgressPct}%
                </span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  MÉDIA
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shadow-3xs">
              <TrendingUp size={20} className="stroke-[2.5px]" />
            </div>
          </div>

          {/* Horizontal Progress Bar */}
          <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"
              style={{ width: `${stats.averageProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* KPI Overviews container (4 columns matching mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Concluídas (Green) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-emerald-500/10 text-[#008A3F] border border-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">CONCLUÍDAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.completedItems}</span>
            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{stats.averageProgressPct}% de progresso médio geral</p>
          </div>
        </div>

        {/* KPI 2: Em andamento (Blue) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 border border-blue-500/15 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="stroke-[2.5px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">EM ANDAMENTO</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.inProgressItems}</span>
            <p className="text-[10px] text-blue-600 font-bold mt-0.5">{stats.inProgressPct}% das metas em execução</p>
          </div>
        </div>

        {/* KPI 3: Não Iniciadas (Slate) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-slate-500/10 text-slate-600 border border-slate-500/15 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">NÃO INICIADAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.pendingItems}</span>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{stats.pendingPct}% aguardando início</p>
          </div>
        </div>

        {/* KPI 4: Agendas Ativas (Sky) */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:translate-y-[-2px] transition-all">
          <div className="w-12 h-12 bg-sky-500/10 text-sky-600 border border-sky-550/15 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">AGENDAS ATIVAS</span>
            <span className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.totalAgendas}</span>
            <p className="text-[10px] text-sky-600 font-bold mt-0.5">Planos estratégicos em vigor</p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={16} className="text-adasa-dark" />
              Execução das Metas por Situação
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Distribuição percentual global das metas cadastradas por status de entrega (pizza completa).
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-4 flex-1">
            <div className="w-40 h-40 shrink-0 relative flex items-center justify-center">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ border: 'none', borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Nenhum item associado disponível</span>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-3 justify-center">
              {pieChartData.map((entry, idx) => {
                const pct = stats.totalItems > 0 ? ((entry.value / stats.totalItems) * 100).toFixed(1) : "0.0";
                return (
                  <div key={idx} className="flex flex-col">
                    <div className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-tight">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-bold ml-5">
                      {entry.value} {entry.value === 1 ? 'Meta' : 'Metas'} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stacked theme distribution chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={16} className="text-adasa-dark" />
              Metas por Tema e Situação
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1 mb-4">
              Distribuição quantitativa de itens normativos e progresso por cada área regulatória estratégica.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-end">
            {/* Custom Legend to match categories */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-black uppercase text-slate-505 mb-4 select-none">
              <span className="text-slate-400">Situação:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span>Concluída</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                <span>Em andamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                <span>Não iniciada</span>
              </div>
            </div>

            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={themeChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="tema" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', background: '#0f172a', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="Não iniciada" stackId="a" fill="#94a3b8" />
                  <Bar dataKey="Em andamento" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Concluída" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Agendas Performance */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-adasa-dark" />
          Status de Execução das Agendas Regulatórias
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                <th className="px-5 py-4">Agenda / Nome</th>
                <th className="px-5 py-4">Tema Estratégico</th>
                <th className="px-5 py-4 text-center">Ações Vinculadas</th>
                <th className="px-5 py-4 text-center">Metas Concluídas</th>
                <th className="px-5 py-4">Progresso Geral</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAgendasForTable.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-semibold">
                    Nenhuma agenda cadastrada ou encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredAgendasForTable.map(agenda => {
                  const items = agenda.agenda_tasks || [];
                  const total = items.length;
                  const completed = items.filter(it => normalizeStatus(taskMap[it.task_id]?.status || it.status) === "Concluída").length;
                  const inProgress = items.filter(it => normalizeStatus(taskMap[it.task_id]?.status || it.status) === "Em andamento").length;
                  const totalProgress = items.reduce((sum, it) => {
                    const taskObj = taskMap[it.task_id];
                    const effectiveStatus = normalizeStatus(taskObj?.status || it.status);
                    const prog = typeof taskObj?.progress === "number" ? taskObj.progress : (effectiveStatus === "Concluída" ? 100 : 0);
                    return sum + prog;
                  }, 0);
                  const pct = total > 0 ? Math.round(totalProgress / total) : 0;

                  return (
                    <tr key={agenda.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">{agenda.nome}</td>
                      <td className="px-5 py-4 text-slate-500 font-semibold">{agenda.tema}</td>
                      <td className="px-5 py-4 text-center font-black text-slate-600">{total}</td>
                      <td className="px-5 py-4 text-center font-bold text-adasa-dark">
                        {completed} de {total}
                        {inProgress > 0 && (
                          <span className="text-[9px] text-blue-600 block">({inProgress} em andamento)</span>
                        )}
                      </td>
                      <td className="px-5 py-4 w-44">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-adasa-green' : pct >= 50 ? 'bg-adasa-mid' : 'bg-amber-550'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`font-black text-[10px] w-8 text-right ${pct === 100 ? 'text-adasa-green' : pct >= 50 ? 'text-adasa-mid' : 'text-amber-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item-by-item detailed listing table (Interactive) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-adasa-dark" />
              Detalhador de Metas da Agenda
            </h4>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Relação detalhada de cada item/meta associada para acompanhamento das entregas e anexos.
            </p>
          </div>
        </div>

        {/* List of actions/items */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black text-[10px]">
                <th className="px-5 py-3.5 pl-8">Item / Atividade Regulatória</th>
                <th className="px-5 py-3.5 text-center">Prazo</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center w-36">Progresso</th>
                <th className="px-5 py-3.5 text-center">Linha do Tempo</th>
                <th className="px-5 py-3.5">Entrega</th>
                <th className="px-5 py-3.5 text-right">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flattenedAndFilteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Nenhum item encontrado para as chaves de busca e filtros ativos.
                  </td>
                </tr>
              ) : (
                (Object.entries(groupedItems) as [string, typeof flattenedAndFilteredItems][]).map(([agendaNome, items]) => {
                  const isCollapsed = !!collapsedAgendas[agendaNome];
                  return (
                    <React.Fragment key={agendaNome}>
                      <tr 
                        onClick={() => toggleAgendaCollapse(agendaNome)}
                        className="bg-blue-50/20 border-y border-blue-100/30 cursor-pointer hover:bg-slate-100/60 select-none transition-all"
                      >
                        <td colSpan={7} className="px-5 py-3 font-black text-adasa-dark text-[11px] uppercase tracking-wider bg-slate-50/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen size={13} className="text-adasa-mid" />
                              <span>Agenda: {agendaNome}</span>
                              <span className="text-[9px] bg-blue-50 text-adasa-mid px-2 py-0.5 rounded-full font-black">
                                {items.length} {items.length === 1 ? "Item/Meta" : "Itens/Metas"}
                              </span>
                            </div>
                            <div className="flex items-center text-adasa-mid font-bold text-[10px] uppercase gap-1 bg-white border border-blue-100/80 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                              <span>{isCollapsed ? "Expandir" : "Recolher"}</span>
                              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {!isCollapsed && items.map((item, idx) => {
                        return (
                          <tr key={`${item.agendaId}-${item.taskId}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-800 text-[13px] max-w-xs whitespace-normal pl-8">
                              {item.taskTitle}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-semibold">
                                <CalendarRange size={13} className="text-slate-400 shrink-0" />
                                <span>
                                  {item.startDate ? new Date(item.startDate + (item.startDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : '-'}
                                  <span className="mx-1 text-slate-300 font-normal">até</span>
                                  {item.endDate ? new Date(item.endDate + (item.endDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                item.status === "Concluída" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : item.status === "Em andamento"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap w-36">
                              <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                                <div className="flex items-center justify-between w-full text-[10px] font-extrabold">
                                  <span className="text-slate-400 uppercase tracking-widest text-[9px]">Evolução</span>
                                  <span className={item.progress === 100 ? "text-emerald-600 font-black" : item.progress >= 50 ? "text-blue-600 font-black" : item.progress > 0 ? "text-indigo-600 font-black" : "text-slate-400 font-bold"}>
                                    {item.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      item.progress === 100 
                                        ? "bg-emerald-500" 
                                        : item.progress >= 50 
                                        ? "bg-blue-500" 
                                        : item.progress > 0 
                                        ? "bg-indigo-500" 
                                        : "bg-slate-300"
                                    }`}
                                    style={{ width: `${item.progress}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setTimelineTaskId(item.taskId);
                                }}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-xs transition-all cursor-pointer font-bold text-xs group"
                                title="Clique para visualizar a Linha do Tempo e Evolução"
                              >
                                <Activity size={14} className="text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                <span className="group-hover:text-indigo-600 transition-colors">Timeline</span>
                              </button>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-medium whitespace-pre-wrap max-w-xs text-left">
                              {item.entrega || <span className="text-slate-350 italic">Sem detalhamento de entrega</span>}
                            </td>
                            <td className="px-5 py-4 text-right">
                              {item.entregaLink ? (
                                <a 
                                  href={item.entregaLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100/80 active:bg-blue-200 text-adasa-dark font-black uppercase text-[9px] tracking-wider rounded-lg transition-colors border border-blue-200"
                                >
                                  <ExternalLink size={11} />
                                  Acessar Link
                                </a>
                              ) : (
                                <span className="text-slate-350 italic text-[10px] font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Timeline Modal Overlay - Matching PlanningTab format perfectly */}
        {timelineTaskId !== null && (
          <TaskTimelineModal
            taskId={timelineTaskId}
            onClose={() => setTimelineTaskId(null)}
            onEditTask={(task) => {
              setTimelineTaskId(null);
              showToast("Visualização", `Para editar a atividade "${task.title}", acesse o módulo de Cadastrar Atividades no menu Planejamento.`, "info");
            }}
            tasks={tasks}
            taskById={taskById}
            childrenMap={childrenMap}
            areas={areas}
            categories={categories}
            responsibles={responsibles}
            formatDate={formatDate}
            showToast={showToast}
            renderProgressCalc={renderProgressCalc}
          />
        )}
      </div>
    </div>
  );
}
