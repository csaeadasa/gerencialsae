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

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  parentId?: number | null;
  progress?: number;
  weight?: number;
  isProgrammed?: boolean;
  seiProcess?: string;
  priority?: string;
  categoryIds?: number[];
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  planId?: number | null;
  areaIds?: number[];
  responsibleIds?: number[];
  dependsOnTaskId?: number | null;
}

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
  const [responsibles, setResponsibles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
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
  const [timelineModalTab, setTimelineModalTab] = useState<"timeline" | "gantt" | "calc">("timeline");
  const [ganttScale, setGanttScale] = useState<"mes" | "trimestre" | "semestre">("mes");

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
          const loadDataRes = await fetch("/api/load-data");
          if (loadDataRes.ok) {
            const loadDataJson = await loadDataRes.json();
            if (loadDataJson.success && loadDataJson.data) {
              const cloud = loadDataJson.data;
              setTasks(cloud.tasks || []);
              setResponsibles(cloud.responsibles || []);
              setCategories(cloud.categories || []);
              setPlans(cloud.plans || []);
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

  const timelineTasks = useMemo(() => {
    if (timelineTaskId === null) return [];
    
    // Find absolute root and the path to target
    const pathIds = new Set<number>();
    let currId: number | null | undefined = timelineTaskId;
    let rootId = timelineTaskId;
    
    while (currId && taskById[currId]) {
      pathIds.add(currId);
      rootId = currId;
      currId = taskById[currId].parentId;
    }

    const result: { task: Task; depth: number; isTarget: boolean; isAncestor: boolean }[] = [];
    
    // Collect from root to all descendants
    const collect = (id: number, currentDepth: number) => {
      const t = taskById[id];
      if (t) {
        const isTarget = id === timelineTaskId;
        const isAncestor = pathIds.has(id) && !isTarget;
        result.push({ task: t, depth: currentDepth, isTarget, isAncestor });
      }
      const children = childrenMap[id] || [];
      const sortedChildren = [...children].sort((a, b) => new Date(a.endDate || "2099-01-01").getTime() - new Date(b.endDate || "2099-01-01").getTime());
      sortedChildren.forEach(c => collect(c.id, currentDepth + 1));
    };
    
    collect(rootId, 0);
    
    return result;
  }, [timelineTaskId, taskById, childrenMap]);

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

  const getDeadlineStatus = (endDate: string | null | undefined, status: string | undefined): "Atrasada" | "Crítica" | "No Prazo" => {
    const normStatus = normalizeStatus(status);
    if (normStatus === "Concluída") return "No Prazo";
    if (!endDate) return "No Prazo";
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let dEnd: Date;
      if (endDate.includes("-")) {
        const parts = endDate.split('T')[0].split('-');
        dEnd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else {
        dEnd = new Date(endDate);
      }
      
      if (isNaN(dEnd.getTime())) return "No Prazo";
      dEnd.setHours(0, 0, 0, 0);
      
      const diffTime = dEnd.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return "Atrasada";
      } else if (diffDays <= 7) {
        return "Crítica";
      } else {
        return "No Prazo";
      }
    } catch (e) {
      return "No Prazo";
    }
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
                                  setTimelineModalTab("timeline");
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col p-4 sm:p-8 md:p-12 items-center justify-center overflow-hidden">
            <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full max-h-[90vh] shadow-2xl relative flex flex-col text-left">
              <div className="flex z-20 justify-between items-center p-6 border-b border-slate-100 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Evolução do Item</h3>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setTimelineModalTab("timeline")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${timelineModalTab === "timeline" ? "bg-white text-slate-850 shadow-xs border border-slate-200/40" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Linha do Tempo
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineModalTab("gantt")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${timelineModalTab === "gantt" ? "bg-white text-slate-850 shadow-xs border border-slate-200/40" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Gráfico de Gantt
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineModalTab("calc")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${timelineModalTab === "calc" ? "bg-white text-slate-850 shadow-xs border border-slate-200/40" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      Cálculo do Progresso
                    </button>
                  </div>
                </div>
                <button onClick={() => setTimelineTaskId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-500 hover:text-slate-800" />
                </button>
              </div>
              <div className="p-6 sm:p-10 overflow-y-auto custom-scrollbar flex-1 relative text-left">
                {timelineModalTab === "timeline" ? (
                  <>
                    <div className="mb-8 border-b border-slate-100 pb-4">
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} className="text-adasa-mid" /> 
                        Linha do Tempo: {getTaskDisplayName(taskById[timelineTaskId]) || ""}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1 mb-4">
                        Exibindo a hierarquia da tarefa (predecessores e subtarefas dependentes). As estatísticas referem-se à tarefa selecionada e suas filhas.
                      </p>
                      {(() => {
                        const getDescendantsAndSelf = (id: number): number[] => {
                          const res = [id];
                          const children = childrenMap[id] || [];
                          children.forEach(c => res.push(...getDescendantsAndSelf(c.id)));
                          return res;
                        };
                        const descendantsIds = new Set(getDescendantsAndSelf(timelineTaskId));
                        const childrenTasks = timelineTasks.filter(t => descendantsIds.has(t.task.id));
                        const total = childrenTasks.length;
                        if (total === 0) return null;
                        
                        const completed = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Concluída").length;
                        const inProgress = childrenTasks.filter(t => normalizeStatus(t.task.status) === "Em andamento").length;
                        const pending = total - completed - inProgress;
                        
                        return (
                          <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                              <span>TOTAIS <span className="border-l border-slate-300 ml-2 pl-2 text-sm font-extrabold">{total}</span></span>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                              <CheckCircle2 size={16} /> CONCLUÍDAS <span className="border-l border-emerald-200 ml-1 pl-2 text-sm font-extrabold">{completed}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                              <Activity size={16} /> EM ANDAMENTO <span className="border-l border-blue-200 ml-1 pl-2 text-sm font-extrabold">{inProgress}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                              <Clock size={16} /> NÃO INICIADAS <span className="border-l border-slate-200 ml-1 pl-2 text-sm font-extrabold">{pending}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="relative border-l-2 border-slate-200/80 ml-4 lg:ml-6 pl-6 lg:pl-10 space-y-12">
                      {timelineTasks.map(({ task, depth, isTarget, isAncestor }, idx) => (
                        <div key={task.id} className="relative group z-10">
                          {depth > 0 && (
                            <div 
                              className="absolute top-4 border-t-2 border-slate-200/80 border-dashed -z-10"
                              style={{ left: '-20px', width: `calc(20px + ${Math.min(depth * 1.5, 6)}rem)` }}
                            />
                          )}
                          
                          <div className={`absolute -left-[37px] lg:-left-[55px] top-1.5 z-10 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110 ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : normalizeStatus(task.status) === "Em andamento" ? "bg-blue-500" : "bg-slate-400"}`}>
                            {normalizeStatus(task.status) === "Concluída" ? <CheckCircle2 size={12} className="text-white" /> : normalizeStatus(task.status) === "Em andamento" ? <Activity size={12} className="text-white" /> : <Clock size={12} className="text-white" />}
                          </div>
                          
                          <div 
                            className={cn("border p-5 rounded-2xl hover:shadow-md transition-all cursor-pointer group-hover:-translate-y-0.5", isTarget ? "bg-indigo-50/50 border-indigo-300 shadow-md ring-2 ring-indigo-500/20" : isAncestor ? "bg-slate-50/50 border-slate-200 opacity-80 hover:opacity-100" : "bg-white border-slate-200/70 hover:border-adasa-mid/60")} 
                            onClick={() => setTimelineTaskId(task.id)}
                            style={{ marginLeft: `${depth > 0 ? Math.min(depth * 1.5, 6) : 0}rem` }}
                          >
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isTarget && <span className="text-[10px] font-black tracking-widest uppercase text-white bg-indigo-500 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm"><Activity size={10} className="text-indigo-100" /> Selecionada</span>}
                                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">ID: {task.id}</span>
                                  <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded-md border flex items-center gap-1 ${getPriorityBadgeClass(task.priority)}`}>
                                    <Flag size={10} className={task.priority === "Alta" ? "fill-rose-100" : task.priority === "Média" ? "fill-amber-100" : ""} />
                                    {task.priority}
                                  </span>

                                  {(() => {
                                    const normStatus = normalizeStatus(task.status);
                                    let statusClasses = "bg-slate-100 text-slate-600 border-slate-200";
                                    let StatusIcon = Circle;
                                    if (normStatus === "Concluída") {
                                      statusClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                      StatusIcon = CheckCircle2;
                                    } else if (normStatus === "Em andamento") {
                                      statusClasses = "bg-blue-50 text-blue-700 border-blue-200";
                                      StatusIcon = Clock;
                                    }

                                    return (
                                      <span className={`text-[9px] font-black uppercase py-0.5 px-2 rounded-md border flex items-center gap-1 ${statusClasses}`}>
                                        <StatusIcon size={10} />
                                        {normStatus}
                                      </span>
                                    );
                                  })()}

                                  {(() => {
                                    if (normalizeStatus(task.status) === "Concluída") return null;
                                    const dlStatus = getDeadlineStatus(task.endDate, task.status);
                                    let dlClasses = "bg-slate-550 text-slate-500 border-slate-200";
                                    let DlIcon = CheckCircle2;
                                    if (dlStatus === "Atrasada") {
                                      dlClasses = "bg-rose-500 text-white border-rose-500 font-extrabold shadow-xs";
                                      DlIcon = AlertCircle;
                                    } else if (dlStatus === "Crítica") {
                                      dlClasses = "bg-amber-500 text-white border-amber-500 font-extrabold shadow-xs";
                                      DlIcon = AlertTriangle;
                                    } else {
                                      dlClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
                                      DlIcon = CheckCircle2;
                                    }

                                    return (
                                      <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${dlClasses}`}>
                                        <DlIcon size={10} />
                                        {dlStatus}
                                      </span>
                                    );
                                  })()}
                                  
                                  {task.isProgrammed !== false ? (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 bg-indigo-50 text-indigo-700 border-indigo-200">
                                      PROGRAMADA
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 bg-rose-50 text-rose-700 border-rose-200">
                                      NÃO PROGRAMADA
                                    </span>
                                  )}
                                  
                                  {task.parentId && (
                                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1"><GitCommit size={10} /> Subatividade</span>
                                  )}
                                  {task.categoryIds?.map(cid => {
                                    const cat = categories.find(c => c.id === cid);
                                    return cat ? (
                                      <span key={cid} className="text-[9px] font-bold uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Tag size={10} /> {cat.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                <h4 className="text-base font-black text-slate-800 leading-tight group-hover:text-[#415bcb] transition-colors">{getTaskDisplayName(task)}</h4>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex-wrap justify-end">
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    <CalendarRange size={12} className="text-adasa-mid" /> Início
                                  </div>
                                  <div className="text-sm font-black text-slate-800">{formatDate(task.startDate) || "Não definido"}</div>
                                </div>
                                <div className="w-px h-8 bg-slate-100"></div>
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    <CalendarRange size={12} className="text-adasa-mid" /> Prazo final
                                  </div>
                                  <div className="text-sm font-black text-slate-800">{formatDate(task.endDate) || "Não definido"}</div>
                                </div>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-xs font-semibold text-slate-600 mb-4 leading-relaxed line-clamp-2">{task.description}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200/70 text-left">
                              <div className="space-y-4">
                                {task.responsibleIds && task.responsibleIds.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Responsáveis</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {task.responsibleIds.map(rid => {
                                        const resp = responsibles.find(r => r.id === rid);
                                        if (!resp) return null;
                                        const initials = resp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                        return (
                                          <div key={rid} className="flex items-center justify-center w-7 h-7 text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full border border-slate-200 shadow-sm animate-none" title={resp.name}>
                                            {initials}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                
                                {task.dependsOnTaskId && taskById[task.dependsOnTaskId] && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Depende de</span>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm w-max" title={getTaskDisplayName(taskById[task.dependsOnTaskId])}>
                                      <Link2 size={14} className="text-slate-400" />
                                      <span className="max-w-[200px] truncate">{getTaskDisplayName(taskById[task.dependsOnTaskId])}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {task.seiProcess && (
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Processo SEI</span>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700 bg-white pl-2.5 pr-1 py-1 rounded-lg border border-slate-200 shadow-sm w-max">
                                      <FileDigit size={14} className="text-slate-400" />
                                      <span className="max-w-[200px] truncate font-mono">{task.seiProcess}</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(task.seiProcess || "");
                                          showToast("Processo SEI copiado", "success");
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                        title="Copiar Processo SEI"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">Progresso <span className="text-adasa-mid">{task.progress}%</span></span>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200/50">
                                  <div className={`h-full ${normalizeStatus(task.status) === "Concluída" ? "bg-emerald-500" : "bg-adasa-mid"} transition-all duration-500`} style={{ width: `${task.progress || 0}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {timelineTasks.length === 0 && (
                        <div className="text-center py-10 text-slate-400 font-semibold italic text-sm">
                          Nenhuma tarefa encontrada na linha do tempo.
                        </div>
                      )}
                    </div>
                  </>
                ) : timelineModalTab === "calc" ? (
                  <div className="mt-4">
                    {renderProgressCalc(timelineTaskId, timelineTaskId ? (taskById[timelineTaskId]?.progress ?? 0) : 0)}
                  </div>
                ) : (() => {
                  const parseSafeDate = (dateStr: string | null | undefined): Date | null => {
                    if (!dateStr) return null;
                    try {
                      let d: Date;
                      if (dateStr.includes("-")) {
                        const parts = dateStr.split("T")[0].split("-");
                        d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      } else {
                        d = new Date(dateStr);
                      }
                      return isNaN(d.getTime()) ? null : d;
                    } catch (e) {
                      return null;
                    }
                  };

                  const tasksWithDates = timelineTasks.map(t => t.task).filter(t => t.startDate && t.endDate);
                  
                  let startDateLimit = new Date();
                  startDateLimit.setMonth(startDateLimit.getMonth() - 1);
                  let endDateLimit = new Date();
                  endDateLimit.setMonth(endDateLimit.getMonth() + 4);
                  
                  const parsedTasks = tasksWithDates.map(t => ({
                    task: t,
                    start: parseSafeDate(t.startDate)!,
                    end: parseSafeDate(t.endDate)!
                  })).filter(item => item.start !== null && item.end !== null && item.start <= item.end);
                  
                  if (parsedTasks.length > 0) {
                    let minT = new Date(Math.min(...parsedTasks.map(t => t.start.getTime())));
                    let maxT = new Date(Math.max(...parsedTasks.map(t => t.end.getTime())));
                    
                    minT.setDate(minT.getDate() - 7);
                    maxT.setDate(maxT.getDate() + 15);
                    
                    startDateLimit = minT;
                    endDateLimit = maxT;
                  }
                  
                  startDateLimit.setHours(0,0,0,0);
                  endDateLimit.setHours(23,59,59,999);
                  
                  const totalDays = Math.max(1, Math.round((endDateLimit.getTime() - startDateLimit.getTime()) / (1000 * 60 * 60 * 24)));
                  const gridColumns: { label: string; widthPercent: number; key: string }[] = [];

                  if (ganttScale === "mes") {
                    let currentPointer = new Date(startDateLimit);
                    currentPointer.setDate(1);
                    
                    const monthsList: { year: number; month: number }[] = [];
                    const endPointer = new Date(endDateLimit);
                    
                    while (currentPointer <= endPointer) {
                      monthsList.push({
                        year: currentPointer.getFullYear(),
                        month: currentPointer.getMonth()
                      });
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
                          key: `${year}-${month}`
                        });
                      }
                    });
                  } else if (ganttScale === "trimestre") {
                    let currentPointer = new Date(startDateLimit);
                    const currentQ = Math.floor(currentPointer.getMonth() / 3);
                    currentPointer.setMonth(currentQ * 3);
                    currentPointer.setDate(1);

                    const quartersList: { year: number; quarter: number }[] = [];
                    const endPointer = new Date(endDateLimit);

                    while (currentPointer <= endPointer) {
                      const q = Math.floor(currentPointer.getMonth() / 3);
                      quartersList.push({
                        year: currentPointer.getFullYear(),
                        quarter: q
                      });
                      currentPointer.setMonth((q + 1) * 3);
                    }

                    const uniqueQuarters = quartersList.filter((item, index, self) => 
                      self.findIndex(t => t.year === item.year && t.quarter === item.quarter) === index
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
                          key: `${year}-Q${quarter}`
                        });
                      }
                    });
                  } else {
                    let currentPointer = new Date(startDateLimit);
                    const currentS = Math.floor(currentPointer.getMonth() / 6);
                    currentPointer.setMonth(currentS * 6);
                    currentPointer.setDate(1);

                    const semestersList: { year: number; semester: number }[] = [];
                    const endPointer = new Date(endDateLimit);

                    while (currentPointer <= endPointer) {
                      const s = Math.floor(currentPointer.getMonth() / 6);
                      semestersList.push({
                        year: currentPointer.getFullYear(),
                        semester: s
                      });
                      currentPointer.setMonth((s + 1) * 6);
                    }

                    const uniqueSemesters = semestersList.filter((item, index, self) => 
                      self.findIndex(t => t.year === item.year && t.semester === item.semester) === index
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
                          key: `${year}-S${semester}`
                        });
                      }
                    });
                  }

                  return (
                    <div className="space-y-6 text-left">
                      <div className="mb-4">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Activity size={16} className="text-indigo-600" />
                          Cronograma do Item: {getTaskDisplayName(taskById[timelineTaskId]) || ""}
                        </h4>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">
                          Acompanhe os prazos de início, término e o progresso (%) das subatividades ao longo do tempo.
                        </p>
                      </div>

                      {/* Scale Selector & Legend */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => setGanttScale("mes")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 cursor-pointer ${ganttScale === "mes" ? "bg-slate-800 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
                          >
                            Mês
                          </button>
                          <button
                            type="button"
                            onClick={() => setGanttScale("trimestre")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 cursor-pointer ${ganttScale === "trimestre" ? "bg-slate-800 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
                          >
                            Trimestre
                          </button>
                          <button
                            type="button"
                            onClick={() => setGanttScale("semestre")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-extrabold transition-all duration-200 cursor-pointer ${ganttScale === "semestre" ? "bg-slate-800 text-white shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
                          >
                            Semestre
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Concluída
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Em andamento
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-slate-400 rounded-full" /> Não Iniciada
                          </div>
                        </div>
                      </div>

                      {timelineTasks.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-medium">
                          Nenhuma atividade disponível para exibição cronológica.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white shadow-xs">
                          <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-black uppercase text-slate-500 tracking-wider font-sans">
                            <div className="w-1/3 min-w-[240px] px-4 py-3 bg-slate-100/30 border-r border-slate-200">
                              Atividade / Cronograma
                            </div>
                            <div className="flex-1 relative flex">
                              {gridColumns.map(gc => (
                                <div 
                                  key={gc.key}
                                  style={{ width: `${gc.widthPercent}%` }}
                                  className="px-2 py-3 border-r border-slate-200 last:border-r-0 text-center text-[10px] truncate"
                                >
                                  {gc.label}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {timelineTasks.map(({ task, depth }) => {
                              const hasDates = task.startDate && task.endDate;
                              const dateStart = hasDates ? parseSafeDate(task.startDate) : null;
                              const dateEnd = hasDates ? parseSafeDate(task.endDate) : null;
                              const statusName = normalizeStatus(task.status);
                              
                              const statusColor = statusName === "Concluída" 
                                ? "bg-emerald-500 hover:bg-emerald-600" 
                                : statusName === "Em andamento" 
                                ? "bg-blue-500 hover:bg-blue-600" 
                                : "bg-slate-400 hover:bg-slate-500";
                              
                              let leftPct = 0;
                              let widthPct = 0;
                              
                              if (dateStart && dateEnd && dateEnd >= dateStart) {
                                const diffLeft = dateStart.getTime() - startDateLimit.getTime();
                                leftPct = Math.max(0, Math.min(100, (diffLeft / (1000 * 60 * 60 * 24)) / totalDays * 100));
                                
                                const diffWidth = dateEnd.getTime() - dateStart.getTime();
                                widthPct = Math.max(1, Math.min(100 - leftPct, (diffWidth / (1000 * 60 * 60 * 24)) / totalDays * 100));
                              }

                              return (
                                <div key={task.id} className="flex transition-colors hover:bg-slate-50/50 group items-stretch min-h-[52px]">
                                  <div className="w-1/3 min-w-[240px] px-4 py-2 border-r border-slate-200 flex flex-col justify-center text-left bg-slate-50/10">
                                    <div className="flex items-center gap-1.5 mb-0.5" style={{ paddingLeft: `${Math.min(depth * 0.75, 4)}rem` }}>
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusName === "Concluída" ? "bg-emerald-500" : statusName === "Em andamento" ? "bg-blue-500" : "bg-slate-400"}`} />
                                      <span className="text-xs font-bold text-slate-800 line-clamp-1 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setTimelineTaskId(task.id)}>
                                        {getTaskDisplayName(task)}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider" style={{ paddingLeft: `${Math.min(depth * 0.75, 4)}rem` }}>
                                      {task.startDate ? <span>Início: {task.startDate.split("T")[0].split("-").reverse().join("/")}</span> : null}
                                      {task.endDate ? <span>Término: {task.endDate.split("T")[0].split("-").reverse().join("/")}</span> : null}
                                      {!hasDates && <span className="text-amber-500 font-bold normal-case">Período não definido</span>}
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 relative flex bg-white hover:bg-slate-50/20">
                                    <div className="absolute inset-y-0 left-0 right-0 flex pointer-events-none">
                                      {gridColumns.map(gc => (
                                        <div 
                                          key={`bg-${gc.key}`}
                                          style={{ width: `${gc.widthPercent}%` }}
                                          className="h-full border-r border-slate-100 last:border-r-0"
                                        />
                                      ))}
                                    </div>
                                    
                                    {hasDates && dateStart && dateEnd ? (
                                      <div className="w-full h-full relative flex items-center px-1">
                                        <div
                                          style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                                          className={`h-7 rounded-lg relative overflow-hidden transition-all duration-350 shadow-xs cursor-pointer select-none flex items-center ${statusColor}`}
                                          title={`${getTaskDisplayName(task)}: ${task.progress || 0}%`}
                                          onClick={() => setTimelineTaskId(task.id)}
                                        >
                                          <span className="absolute inset-0 flex items-center justify-center font-bold text-[9px] text-white px-1.5 truncate">
                                            {task.progress || 0}%
                                          </span>
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
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
