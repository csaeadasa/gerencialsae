import React, { useMemo, useState, useEffect } from "react";
import { 
  Droplets, 
  Activity, 
  GitCompare, 
  FolderKanban, 
  FileSpreadsheet, 
  ArrowRight, 
  ListTodo, 
  BookmarkCheck, 
  Users, 
  Tags, 
  ClipboardList, 
  BarChart3, 
  CalendarCheck, 
  FileText, 
  BarChart2, 
  BookOpen, 
  Shield, 
  Scale, 
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  UserCheck,
  X,
  Search,
  AlertOctagon,
  AlertTriangle,
  ExternalLink,
  Edit3,
  Calendar,
  User,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Task, Area } from "../types";
import { useAuth } from "../lib/auth";

interface HomeTabProps {
  setActiveTab: (tab: any) => void;
  setActivePlanningSubTab: (subTab: "tasks" | "dashboard" | "plans" | "areas" | "categories" | "responsibles") => void;
  tasks: Task[];
  areas: Area[];
  plans?: any[];
  responsibles?: any[];
  onMyTasksSelect?: () => void;
  onNavigateToPlanningWithFilter?: (subTab: "tasks" | "dashboard", planId: number | string, areaId?: number, isMyTasks?: boolean, taskIdToEdit?: number) => void;
  checkPermission?: (moduleId: any, action: any) => boolean;
  showToast?: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

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

const formatDateBR = (d: string | null | undefined): string => {
  if (!d) return "-";
  try {
    const datePart = d.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(d).toLocaleDateString('pt-BR');
  } catch (e) {
    return d;
  }
};

const getDaysDiffFromToday = (endDate: string | null | undefined): number | null => {
  if (!endDate) return null;
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
    if (isNaN(dEnd.getTime())) return null;
    dEnd.setHours(0, 0, 0, 0);
    const diffTime = dEnd.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
};

const getTaskAreaName = (task: Task, areasList: Area[] = []): string => {
  const targetAreaId = task.areaId || (task.areaIds && task.areaIds[0]);
  if (!targetAreaId) return "Geral";
  const found = areasList.find(a => Number(a.id) === Number(targetAreaId));
  return found ? found.name : "Geral";
};

interface ExpandedStatusModalState {
  isOpen: boolean;
  scopeTitle: string;
  scopeSubtitle?: string;
  categoryType: "status" | "situation";
  activeFilter: "Atrasada" | "Crítica" | "No Prazo" | "Não iniciada" | "Em andamento" | "Concluída" | "all";
  areaId?: number;
  isMyTasks?: boolean;
}

interface MonthlyDeliveriesModalState {
  monthIndex: number;
  monthName: string;
  monthAbbr: string;
  year: number;
}

export function HomeTab({ 
  setActiveTab, 
  setActivePlanningSubTab, 
  tasks, 
  areas, 
  plans = [],
  responsibles = [],
  onMyTasksSelect, 
  onNavigateToPlanningWithFilter,
  checkPermission, 
  showToast 
}: HomeTabProps) {
  const { currentUser } = useAuth();

  // Estado do Modal de Expansão de Status/Situação
  const [expandedModalState, setExpandedModalState] = useState<ExpandedStatusModalState>({
    isOpen: false,
    scopeTitle: "",
    categoryType: "status",
    activeFilter: "Atrasada",
    areaId: undefined,
    isMyTasks: false,
  });

  const [modalSearchTerm, setModalSearchTerm] = useState("");

  const openStatusModal = (config: Omit<ExpandedStatusModalState, "isOpen">) => {
    setModalSearchTerm("");
    setExpandedModalState({
      isOpen: true,
      ...config,
    });
  };

  const closeStatusModal = () => {
    setExpandedModalState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expandedModalState.isOpen) {
        closeStatusModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedModalState.isOpen]);
  
  const handleProtectedNavigate = (tab: string, subTab?: any, requiredModule?: string) => {
    if (requiredModule && checkPermission && !checkPermission(requiredModule, 'view')) {
      if (showToast) {
        showToast("Acesso Negado", "Você não possui permissão para acessar este módulo.", "error");
      }
      return;
    }
    if (subTab) {
      setActivePlanningSubTab(subTab);
    }
    setActiveTab(tab);
  };

  // Identificar Plano Ativo
  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans.find((p: any) => p.isActive) || plans[0];
  }, [plans]);

  // Tarefas do Plano Ativo
  const planTasks = useMemo(() => {
    if (!activePlan) return tasks;
    return tasks.filter(t => Number(t.planId) === Number(activePlan.id));
  }, [activePlan, tasks]);

  const totalTasks = planTasks.length;
  const notStartedTasks = useMemo(() => planTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length, [planTasks]);
  const inProgressTasks = useMemo(() => planTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length, [planTasks]);
  const completedTasks = useMemo(() => planTasks.filter(t => normalizeStatus(t.status) === "Concluída").length, [planTasks]);

  const averageCompletion = useMemo(() => {
    if (totalTasks === 0) return 0;
    const sumProgress = planTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0);
    return Math.round(sumProgress / totalTasks);
  }, [planTasks, totalTasks]);

  // Responsável vinculado ao usuário atual
  const userRespId = useMemo(() => {
    if (!currentUser || !responsibles || responsibles.length === 0) return null;
    const userResp = responsibles.find(r => 
      (r.userId && Number(r.userId) === Number(currentUser.id)) ||
      (r.email && currentUser.email && r.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
      (r.name && currentUser.name && r.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
    );
    return userResp ? userResp.id : null;
  }, [currentUser, responsibles]);

  // Tarefas do usuário logado no plano ativo
  const myPlanTasks = useMemo(() => {
    if (!currentUser) return [];
    return planTasks.filter(t => {
      if (t.assignedTo && (
        t.assignedTo.toLowerCase().trim() === currentUser.name?.toLowerCase().trim() ||
        (currentUser.email && t.assignedTo.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
      )) return true;

      if (userRespId && t.responsibleIds?.some(id => Number(id) === Number(userRespId))) {
        return true;
      }

      if (responsibles && t.responsibleIds && t.responsibleIds.length > 0) {
        const isMatch = t.responsibleIds.some(respId => {
          const resp = responsibles.find(r => Number(r.id) === Number(respId));
          if (!resp) return false;
          return (
            (resp.userId && Number(resp.userId) === Number(currentUser.id)) ||
            (resp.email && currentUser.email && resp.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
            (resp.name && currentUser.name && resp.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
          );
        });
        if (isMatch) return true;
      }

      return false;
    });
  }, [planTasks, currentUser, userRespId, responsibles]);

  // Resumo de Minhas Tarefas
  const myTasksSummary = useMemo(() => {
    const total = myPlanTasks.length;
    const notStarted = myPlanTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
    const inProgress = myPlanTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
    const completed = myPlanTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
    const avgProg = total > 0 ? Math.round(myPlanTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / total) : 0;

    const onTime = myPlanTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "No Prazo").length;
    const critical = myPlanTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Crítica").length;
    const delayed = myPlanTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Atrasada").length;

    return {
      isMyTasks: true,
      name: "MINHAS TAREFAS",
      description: currentUser?.name ? `Atividades de ${currentUser.name}` : "Atividades atribuídas ao seu usuário",
      total,
      notStarted,
      inProgress,
      completed,
      avgProg,
      onTime,
      critical,
      delayed
    };
  }, [myPlanTasks, currentUser]);

  // Resumo consolidado por Área Temática incluindo "Minhas Tarefas" antes de Regulação
  const combinedSummaries = useMemo(() => {
    const areaList = (areas || []).map(area => {
      const areaTasks = planTasks.filter(t => 
        t.areaIds?.some(id => Number(id) === Number(area.id)) || 
        Number(t.areaId) === Number(area.id)
      );
      const total = areaTasks.length;
      const notStarted = areaTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
      const inProgress = areaTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
      const completed = areaTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
      const avgProg = total > 0 ? Math.round(areaTasks.reduce((acc, t) => acc + (Number(t.progress) || 0), 0) / total) : 0;
      
      const onTime = areaTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "No Prazo").length;
      const critical = areaTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Crítica").length;
      const delayed = areaTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Atrasada").length;

      return {
        isMyTasks: false,
        area,
        name: area.name,
        description: area.description,
        total,
        notStarted,
        inProgress,
        completed,
        avgProg,
        onTime,
        critical,
        delayed
      };
    });

    const result = [...areaList];
    if (myTasksSummary) {
      // Localizar o índice da área de "Regulação"
      const regIndex = result.findIndex(item => 
        item.area?.name && item.area.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("regulacao")
      );

      if (regIndex !== -1) {
        // Inserir exatamente antes de Regulação
        result.splice(regIndex, 0, myTasksSummary);
      } else {
        // Caso a área de regulação não exista, inserir no início
        result.unshift(myTasksSummary);
      }
    }

    return result;
  }, [areas, planTasks, myTasksSummary]);

  // Tarefas base do escopo atualmente aberto no modal
  const modalScopeTasks = useMemo(() => {
    if (!expandedModalState.isOpen) return [];
    if (expandedModalState.isMyTasks) {
      return myPlanTasks;
    } else if (expandedModalState.areaId) {
      return planTasks.filter(t => 
        t.areaIds?.some(id => Number(id) === Number(expandedModalState.areaId)) || 
        Number(t.areaId) === Number(expandedModalState.areaId)
      );
    }
    return planTasks;
  }, [expandedModalState.isOpen, expandedModalState.isMyTasks, expandedModalState.areaId, myPlanTasks, planTasks]);

  // Contadores dinâmicos para as abas internas do modal
  const modalCounts = useMemo(() => {
    const delayed = modalScopeTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Atrasada").length;
    const critical = modalScopeTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "Crítica").length;
    const onTime = modalScopeTasks.filter(t => getDeadlineStatus(t.endDate, t.status) === "No Prazo").length;
    
    const notStarted = modalScopeTasks.filter(t => normalizeStatus(t.status) === "Não iniciada").length;
    const inProgress = modalScopeTasks.filter(t => normalizeStatus(t.status) === "Em andamento").length;
    const completed = modalScopeTasks.filter(t => normalizeStatus(t.status) === "Concluída").length;
    const total = modalScopeTasks.length;

    return { delayed, critical, onTime, notStarted, inProgress, completed, total };
  }, [modalScopeTasks]);

  // Tarefas exibidas com busca e ordenação por criticidade
  const modalDisplayTasks = useMemo(() => {
    if (!expandedModalState.isOpen) return [];

    let list = modalScopeTasks;

    if (expandedModalState.categoryType === "status") {
      if (expandedModalState.activeFilter !== "all") {
        list = list.filter(t => getDeadlineStatus(t.endDate, t.status) === expandedModalState.activeFilter);
      }
    } else if (expandedModalState.categoryType === "situation") {
      if (expandedModalState.activeFilter !== "all") {
        list = list.filter(t => normalizeStatus(t.status) === expandedModalState.activeFilter);
      }
    }

    if (modalSearchTerm.trim()) {
      const term = modalSearchTerm.toLowerCase().trim();
      list = list.filter(t => 
        t.title?.toLowerCase().includes(term) ||
        t.code?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.assignedTo?.toLowerCase().includes(term)
      );
    }

    // Ordenação: Atrasadas primeiro (mais antigas), depois Críticas (mais próximas), depois No Prazo
    return [...list].sort((a, b) => {
      const statusA = getDeadlineStatus(a.endDate, a.status);
      const statusB = getDeadlineStatus(b.endDate, b.status);
      const priorityOrder: Record<string, number> = { "Atrasada": 1, "Crítica": 2, "No Prazo": 3 };
      const diff = (priorityOrder[statusA] || 99) - (priorityOrder[statusB] || 99);
      if (diff !== 0) return diff;

      if (a.endDate && b.endDate) {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      return 0;
    });
  }, [expandedModalState, modalScopeTasks, modalSearchTerm]);

  // ----------------------------------------------------
  // Entregas por Mês: Dados e Lógica da Linha do Tempo
  // ----------------------------------------------------
  const planReferenceYear = useMemo(() => {
    if (activePlan?.name) {
      const match = activePlan.name.match(/20\d\d/);
      if (match) return parseInt(match[0]);
    }
    return new Date().getFullYear();
  }, [activePlan]);

  const [selectedTimelineYear, setSelectedTimelineYear] = useState<number>(planReferenceYear);

  useEffect(() => {
    setSelectedTimelineYear(planReferenceYear);
  }, [planReferenceYear]);

  const MONTHS_CONFIG = useMemo(() => [
    { index: 0, abbr: "JAN", name: "Janeiro" },
    { index: 1, abbr: "FEV", name: "Fevereiro" },
    { index: 2, abbr: "MAR", name: "Março" },
    { index: 3, abbr: "ABR", name: "Abril" },
    { index: 4, abbr: "MAI", name: "Maio" },
    { index: 5, abbr: "JUN", name: "Junho" },
    { index: 6, abbr: "JUL", name: "Julho" },
    { index: 7, abbr: "AGO", name: "Agosto" },
    { index: 8, abbr: "SET", name: "Setembro" },
    { index: 9, abbr: "OUT", name: "Outubro" },
    { index: 10, abbr: "NOV", name: "Novembro" },
    { index: 11, abbr: "DEZ", name: "Dezembro" },
  ], []);

  const completedPlanTasks = useMemo(() => {
    return planTasks.filter(t => normalizeStatus(t.status) === "Concluída" || Number(t.progress) === 100);
  }, [planTasks]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(planReferenceYear);
    completedPlanTasks.forEach(t => {
      const dateStr = t.completedAt || t.endDate || t.updatedAt || t.startDate;
      if (dateStr) {
        try {
          const y = new Date(dateStr).getFullYear();
          if (!isNaN(y) && y >= 2020 && y <= 2035) {
            yearsSet.add(y);
          }
        } catch {
          // ignore
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [completedPlanTasks, planReferenceYear]);

  const monthlyDeliveriesData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();

    return MONTHS_CONFIG.map(month => {
      const monthTasks = completedPlanTasks.filter(t => {
        const dateStr = t.completedAt || t.endDate || t.updatedAt || t.startDate;
        if (!dateStr) return false;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === selectedTimelineYear && d.getMonth() === month.index;
        } catch {
          return false;
        }
      });

      const isCurrentMonth = selectedTimelineYear === currentYear && month.index === currentMonthIndex;

      const areaCountMap: Record<number, number> = {};
      monthTasks.forEach(t => {
        const aId = t.areaId || (t.areaIds && t.areaIds[0]);
        if (aId) {
          areaCountMap[aId] = (areaCountMap[aId] || 0) + 1;
        }
      });

      return {
        ...month,
        year: selectedTimelineYear,
        tasks: monthTasks,
        count: monthTasks.length,
        isCurrentMonth,
        areaCountMap
      };
    });
  }, [MONTHS_CONFIG, completedPlanTasks, selectedTimelineYear]);

  // Estado do Modal de Entregas por Mês
  const [selectedMonthForDeliveries, setSelectedMonthForDeliveries] = useState<MonthlyDeliveriesModalState | null>(null);
  const [monthModalAreaFilter, setMonthModalAreaFilter] = useState<number | "all">("all");
  const [monthModalSearch, setMonthModalSearch] = useState<string>("");

  const selectedMonthTasks = useMemo(() => {
    if (!selectedMonthForDeliveries) return [];
    return completedPlanTasks.filter(t => {
      const dateStr = t.completedAt || t.endDate || t.updatedAt || t.startDate;
      if (!dateStr) return false;
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === selectedMonthForDeliveries.year && d.getMonth() === selectedMonthForDeliveries.monthIndex;
      } catch {
        return false;
      }
    });
  }, [selectedMonthForDeliveries, completedPlanTasks]);

  const monthAvailableAreas = useMemo(() => {
    const areaIdSet = new Set<number>();
    selectedMonthTasks.forEach(t => {
      const aId = t.areaId || (t.areaIds && t.areaIds[0]);
      if (aId) areaIdSet.add(Number(aId));
    });
    return (areas || []).filter(a => areaIdSet.has(Number(a.id)));
  }, [selectedMonthTasks, areas]);

  const filteredMonthTasks = useMemo(() => {
    let list = selectedMonthTasks;
    if (monthModalAreaFilter !== "all") {
      list = list.filter(t => {
        const aId = t.areaId || (t.areaIds && t.areaIds[0]);
        return Number(aId) === Number(monthModalAreaFilter);
      });
    }
    if (monthModalSearch.trim()) {
      const term = monthModalSearch.toLowerCase().trim();
      list = list.filter(t => 
        t.title?.toLowerCase().includes(term) ||
        t.code?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term) ||
        t.assignedTo?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [selectedMonthTasks, monthModalAreaFilter, monthModalSearch]);

  return (
    <div className="space-y-10 w-full pb-16">
      {/* Dynamic Header Promo Banner */}
      <div className="bg-adasa-dark rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-adasa-light/10 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs font-black uppercase tracking-widest text-adasa-light/80">
              <Droplets size={12} className="text-adasa-light animate-pulse" />
              Gerencial SAE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none">
              Plataforma de Planejamento <br className="hidden sm:block" />
              e Gestão da SAE
            </h1>
          </div>
        </div>
      </div>

      {/* Module Group: Sumário Executivo (Plano Ativo) */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="p-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Sparkles size={13} className="text-indigo-600" />
            Sumário Executivo
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Plano Ativo: <span className="text-indigo-700 font-extrabold">{activePlan?.name || "Plano Geral de Atividades"}</span>
          </h2>
        </div>

        {/* Box com Gráficos da Figura */}
        <div className="space-y-3.5">
          {/* Título e Subtítulo com botões de ação alinhados à direita */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Resumo do Plano da Superintendência
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Progresso, status de execução
              </p>
            </div>

            {activePlan && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (onNavigateToPlanningWithFilter) {
                      onNavigateToPlanningWithFilter("tasks", activePlan.id);
                    } else {
                      handleProtectedNavigate("planning", "tasks", "planning_tasks");
                    }
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Abrir Cadastrar Atividades para o Plano Ativo"
                >
                  <ListTodo size={14} className="text-slate-600" />
                  <span>Ver Atividades</span>
                </button>
                <button
                  onClick={() => {
                    if (onNavigateToPlanningWithFilter) {
                      onNavigateToPlanningWithFilter("dashboard", activePlan.id);
                    } else {
                      handleProtectedNavigate("planning", "dashboard", "planning_dashboard");
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Abrir Painel de Atividades para o Plano Ativo"
                >
                  <BarChart3 size={14} />
                  <span>Painel do Plano</span>
                </button>
              </div>
            )}
          </div>

          {/* Top Card: PERCENTUAL DE CONCLUSÃO */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <span>PERCENTUAL DE CONCLUSÃO</span>
                <Info size={13} className="text-slate-400 cursor-help" title="Média ponderada do percentual de conclusão das atividades do plano ativo" />
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
                {averageCompletion}%
              </span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                MÉDIA
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, averageCompletion))}%` }}
              />
            </div>
          </div>

          {/* Row of 4 Metric Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Box 1: Total de Atividades */}
            <div 
              onClick={() => openStatusModal({
                scopeTitle: activePlan?.name || "Plano Geral de Atividades",
                scopeSubtitle: "Todas as atividades do plano ativo",
                categoryType: "status",
                activeFilter: "all"
              })}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex items-center justify-between cursor-pointer group"
              title="Clique para ver a lista de todas as atividades"
            >
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  <span>TOTAL DE ATIVIDADES</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight tabular-nums leading-tight">
                  {totalTasks}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>filtradas no painel</span>
                  <span className="text-[10px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">• expandir</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <FolderKanban size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 2: Não Iniciadas */}
            <div 
              onClick={() => openStatusModal({
                scopeTitle: activePlan?.name || "Plano Geral de Atividades",
                scopeSubtitle: "Atividades com status Não Iniciada",
                categoryType: "situation",
                activeFilter: "Não iniciada"
              })}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-400 transition-all duration-200 flex items-center justify-between cursor-pointer group"
              title="Clique para ver a lista de atividades não iniciadas"
            >
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  <span>NÃO INICIADAS</span>
                  <Info size={13} className="text-slate-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:text-slate-700 transition-colors tracking-tight tabular-nums leading-tight">
                  {notStartedTasks}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>atividades pendentes</span>
                  <span className="text-[10px] text-slate-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">• expandir</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <Clock size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 3: Em Andamento */}
            <div 
              onClick={() => openStatusModal({
                scopeTitle: activePlan?.name || "Plano Geral de Atividades",
                scopeSubtitle: "Atividades com status Em Andamento",
                categoryType: "situation",
                activeFilter: "Em andamento"
              })}
              className="bg-blue-50/40 rounded-3xl p-5 sm:p-6 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all duration-200 flex items-center justify-between cursor-pointer group"
              title="Clique para ver a lista de atividades em andamento"
            >
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 mb-1">
                  <span>EM ANDAMENTO</span>
                  <Info size={13} className="text-blue-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-blue-900 group-hover:text-blue-700 transition-colors tracking-tight tabular-nums leading-tight">
                  {inProgressTasks}
                </div>
                <div className="text-xs font-semibold text-blue-600/70 mt-0.5 flex items-center gap-1">
                  <span>atividades iniciadas</span>
                  <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">• expandir</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 border border-blue-100 shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <Activity size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 4: Concluídas */}
            <div 
              onClick={() => openStatusModal({
                scopeTitle: activePlan?.name || "Plano Geral de Atividades",
                scopeSubtitle: "Atividades finalizadas",
                categoryType: "situation",
                activeFilter: "Concluída"
              })}
              className="bg-emerald-50/50 rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex items-center justify-between cursor-pointer group"
              title="Clique para ver a lista de atividades concluídas"
            >
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 mb-1">
                  <span>CONCLUÍDAS</span>
                  <Info size={13} className="text-emerald-500" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-950 group-hover:text-emerald-700 transition-colors tracking-tight tabular-nums leading-tight">
                  {completedTasks}
                </div>
                <div className="text-xs font-semibold text-emerald-700/80 mt-0.5 flex items-center gap-1">
                  <span>atividades finalizadas</span>
                  <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">• expandir</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 border border-emerald-200 shadow-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* Linha do Tempo: Entregas por Mês (Full Width) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <CalendarCheck size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
                        Entregas por Mês
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {completedPlanTasks.length} {completedPlanTasks.length === 1 ? "concluída" : "concluídas"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Linha do tempo das atividades concluídas. Clique em um mês para abrir as tarefas e filtrar por área.
                    </p>
                  </div>
                </div>

                {availableYears.length > 1 && (
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => setSelectedTimelineYear(y)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          selectedTimelineYear === y
                            ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline Track with 12 months */}
              <div className="relative pt-1 pb-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2.5 relative z-10">
                  {monthlyDeliveriesData.map(m => {
                    const hasDeliveries = m.count > 0;
                    return (
                      <div
                        key={m.index}
                        onClick={() => {
                          setSelectedMonthForDeliveries({
                            monthIndex: m.index,
                            monthName: m.name,
                            monthAbbr: m.abbr,
                            year: m.year
                          });
                          setMonthModalAreaFilter("all");
                          setMonthModalSearch("");
                        }}
                        className={`group relative rounded-2xl p-3 border transition-all duration-200 cursor-pointer flex flex-col justify-between items-center text-center select-none ${
                          m.isCurrentMonth
                            ? "ring-2 ring-indigo-500/50 ring-offset-2 bg-indigo-50/20"
                            : ""
                        } ${
                          hasDeliveries
                            ? "bg-gradient-to-b from-white to-emerald-50/50 border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5"
                            : "bg-slate-50/80 border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                        title={`Clique para ver as ${m.count} atividades concluídas em ${m.name} de ${m.year}`}
                      >
                        {/* Top Node Indicator */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${
                            hasDeliveries ? "text-emerald-700" : "text-slate-500"
                          }`}>
                            {m.abbr}
                          </span>
                          {m.isCurrentMonth ? (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" title="Mês atual" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${hasDeliveries ? "bg-emerald-500" : "bg-slate-300"}`} />
                          )}
                        </div>

                        {/* Counter Circle / Big Number */}
                        <div className="my-1 flex flex-col items-center">
                          <div className={`text-2xl font-black tracking-tight tabular-nums transition-colors ${
                            hasDeliveries 
                              ? "text-emerald-700 group-hover:text-emerald-800" 
                              : "text-slate-400 group-hover:text-slate-600"
                          }`}>
                            {m.count}
                          </div>
                          <span className={`text-[9px] font-bold ${
                            hasDeliveries ? "text-emerald-600/90" : "text-slate-400"
                          }`}>
                            {m.count === 1 ? "entrega" : "entregas"}
                          </span>
                        </div>

                        {/* Bottom micro link */}
                        <div className="w-full pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-center">
                          <span className={`text-[9px] font-bold tracking-tight transition-colors ${
                            hasDeliveries
                              ? "text-emerald-600 group-hover:underline"
                              : "text-slate-400"
                          }`}>
                            {hasDeliveries ? "Ver tarefas →" : "Ver mês →"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        {/* Box Resumo por Área Temática do Plano Ativo */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Resumo por Área Temática
              </h3>
              <p className="text-xs text-slate-500">
                Progresso, status de execução e atalhos diretos para cada área no plano ativo
              </p>
            </div>
          </div>

          {combinedSummaries.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 text-xs">
              Nenhuma área temática cadastrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {combinedSummaries.map((item) => (
                <div 
                  key={item.isMyTasks ? "my-tasks-summary-card" : item.area.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between group space-y-4"
                >
                  <div>
                    {/* Header Area / Minhas Tarefas Card */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2.5 rounded-xl border transition-colors ${
                          item.isMyTasks 
                            ? 'bg-violet-50 text-violet-600 border-violet-100 group-hover:bg-violet-600 group-hover:text-white'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          {item.isMyTasks ? <UserCheck size={18} /> : <BookmarkCheck size={18} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-sm font-black transition-colors truncate ${
                            item.isMyTasks 
                              ? 'text-slate-900 group-hover:text-violet-700' 
                              : 'text-slate-900 group-hover:text-indigo-700'
                          }`}>
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full tabular-nums shrink-0 ${
                        item.isMyTasks 
                          ? 'text-violet-700 bg-violet-50' 
                          : 'text-slate-600 bg-slate-100'
                      }`}>
                        {item.total} {item.total === 1 ? 'atividade' : 'atividades'}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Progresso</span>
                        <span className="text-slate-900 font-black tabular-nums">{item.avgProg}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            item.avgProg === 100 
                              ? 'bg-emerald-500' 
                              : item.avgProg > 0 
                              ? (item.isMyTasks ? 'bg-violet-600' : 'bg-indigo-600')
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${item.avgProg}%` }}
                        />
                      </div>
                    </div>

                    {/* Quadros de Distribuição: Situação e Status do Prazo com mecanismos de expansão */}
                    <div className="space-y-2.5">
                      {/* Quadro 1: Situação */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Situação
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <span>Clique para expandir</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50/90 rounded-2xl border border-slate-100 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "situation",
                                activeFilter: "Não iniciada",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-white hover:shadow-xs transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.notStarted} atividades não iniciadas de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider group-hover/btn:text-slate-600">Não Inic.</span>
                            <span className="text-sm font-black text-slate-700 tabular-nums">{item.notStarted}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "situation",
                                activeFilter: "Em andamento",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-white hover:shadow-xs border-x border-slate-200 transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.inProgress} atividades em andamento de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-blue-500 block tracking-wider group-hover/btn:text-blue-700">Andamento</span>
                            <span className="text-sm font-black text-blue-700 tabular-nums">{item.inProgress}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "situation",
                                activeFilter: "Concluída",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-white hover:shadow-xs transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.completed} atividades concluídas de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-emerald-500 block tracking-wider group-hover/btn:text-emerald-700">Concluídas</span>
                            <span className="text-sm font-black text-emerald-700 tabular-nums">{item.completed}</span>
                          </button>
                        </div>
                      </div>

                      {/* Quadro 2: Status do Prazo */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Status do Prazo
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                            <span>Clique para expandir</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50/90 rounded-2xl border border-slate-100 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "status",
                                activeFilter: "No Prazo",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-emerald-50/80 hover:shadow-xs transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.onTime} atividades no prazo de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider group-hover/btn:text-emerald-800">No Prazo</span>
                            <span className="text-sm font-black text-emerald-700 tabular-nums">{item.onTime}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "status",
                                activeFilter: "Crítica",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-amber-50/80 hover:shadow-xs border-x border-slate-200 transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.critical} atividades críticas (vencendo em até 7 dias) de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider group-hover/btn:text-amber-700">Crítica</span>
                            <span className="text-sm font-black text-amber-700 tabular-nums">{item.critical}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openStatusModal({
                                scopeTitle: item.name,
                                scopeSubtitle: item.description,
                                categoryType: "status",
                                activeFilter: "Atrasada",
                                areaId: item.isMyTasks ? undefined : item.area?.id,
                                isMyTasks: item.isMyTasks
                              });
                            }}
                            className="py-1.5 px-1 rounded-xl hover:bg-rose-50/80 hover:shadow-xs transition-all cursor-pointer text-center group/btn focus:outline-hidden"
                            title={`Clique para ver as ${item.delayed} atividades atrasadas de ${item.name}`}
                          >
                            <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider group-hover/btn:text-rose-700">Atrasadas</span>
                            <span className="text-sm font-black text-rose-700 tabular-nums">{item.delayed}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação para Cadastrar Atividades e Painel */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        if (item.isMyTasks) {
                          if (activePlan) {
                            if (onNavigateToPlanningWithFilter) {
                              onNavigateToPlanningWithFilter("tasks", activePlan.id, undefined, true);
                            } else if (onMyTasksSelect) {
                              onMyTasksSelect();
                            } else {
                              handleProtectedNavigate("planning", "tasks", "planning_my_tasks");
                            }
                          } else if (onMyTasksSelect) {
                            onMyTasksSelect();
                          } else {
                            handleProtectedNavigate("planning", "tasks", "planning_my_tasks");
                          }
                        } else {
                          if (activePlan) {
                            if (onNavigateToPlanningWithFilter) {
                              onNavigateToPlanningWithFilter("tasks", activePlan.id, item.area.id);
                            } else {
                              handleProtectedNavigate("planning", "tasks", "planning_tasks");
                            }
                          }
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl bg-slate-50 border text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                        item.isMyTasks 
                          ? 'hover:bg-violet-50 border-slate-200 hover:border-violet-200 text-slate-700 hover:text-violet-700' 
                          : 'hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700'
                      }`}
                      title={item.isMyTasks ? "Abrir Minhas Atividades no plano ativo" : `Abrir Cadastrar Atividades com filtro de ${item.name}`}
                    >
                      <ListTodo size={14} className={item.isMyTasks ? "text-violet-600" : "text-indigo-600"} />
                      <span>Cadastrar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (item.isMyTasks) {
                          if (activePlan) {
                            if (onNavigateToPlanningWithFilter) {
                              onNavigateToPlanningWithFilter("dashboard", activePlan.id, undefined, true);
                            } else {
                              handleProtectedNavigate("planning", "dashboard", "planning_dashboard");
                            }
                          }
                        } else {
                          if (activePlan) {
                            if (onNavigateToPlanningWithFilter) {
                              onNavigateToPlanningWithFilter("dashboard", activePlan.id, item.area.id);
                            } else {
                              handleProtectedNavigate("planning", "dashboard", "planning_dashboard");
                            }
                          }
                        }
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      title={item.isMyTasks ? "Abrir Painel de Atividades das minhas tarefas" : `Abrir Painel de Atividades com filtro de ${item.name}`}
                    >
                      <BarChart3 size={14} className="text-blue-600" />
                      <span>Painel</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Module Group: Painéis Gerenciais */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">
              Painéis
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Painéis Gerenciais</h2>
          </div>
        </div>

        {/* Master Row with major cards */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Painel de Atividades Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("planning", "dashboard", "planning_dashboard")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FolderKanban size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Atividades</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhe o andamento geral das tarefas e metas. Visualize status, progressos acumulados e índices gerenciais por área operacional em gráficos de tempo real.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Resoluções Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("reg_painel", undefined, "reg_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Resoluções</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhe as resoluções vigentes, atas de audiência, estoque regulatório normas organizadas e monitoramentos das obrigações legais em formato agregador dinâmico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Resoluções <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel da Agenda Regulatória Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("reg_agenda_painel", undefined, "reg_agenda_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel da Agenda Regulatória</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhamento estratégico, metas, indicadores gráficos e percentual de entregas dos itens da Agenda Regulatória de forma integrada e visual.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel da Agenda <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Participação Social Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("reg_subsidios_painel", undefined, "reg_subsidios_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel Participação Social</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Acompanhamento gerencial das ações de participação social, consultas públicas, audiências, tomadas de subsídios e análise de contribuições.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel Participação Social <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel do Balanço Hídrico Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("analyze", undefined, "analyze")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Droplets size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel do Balanço Hídrico</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Explore mapas interativos de balanço e visualize gráficos de projeções isoladas de oferta versus demandas projetadas de recursos para saneamento básico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel do Balanço Hídrico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Fiscalização Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("fisc_operational", undefined, "fisc_operational")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Shield size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Fiscalização</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Painel estratégico de monitoramento das ações de fiscalização, constatações, não conformidades e termos emitidos pela equipe regulatória.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Fiscalização <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel Demanda Ouvidoria Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("recurso_painel", undefined, "recurso_painel")}
              className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Scale size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Qualidade do Atendimento</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Painel estratégico de acompanhamento de demandas de ouvidoria, prazos de análise, andamento e penalidades aplicadas.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Qualidade do Atendimento <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Painel de Publicações Card */}
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={() => handleProtectedNavigate("pub_painel", undefined, "pub_painel")}
              className="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-white to-indigo-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group text-left h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-600 w-max border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                  <BookOpen size={24} className="text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Publicações</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Visualize estatísticas gerais de publicações da agência. Explore a ementa de relatórios técnicos, artigos científicos e boletins informativos.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-indigo-700">
                Abrir Painel de Publicações <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Module Group 1: Planejamento e Plano de Trabalho */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 1
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Planejamento e Cronogramas</h2>
          </div>
        </div>

        {/* Master Row with two major cards: Minhas Atividades on the left, Painel de Atividades on the right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Minhas Atividades Card */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={onMyTasksSelect}
            className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Minhas Atividades</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Veja as atividades atribuídas diretamente a você no plano ativo de tarefas. Monitore seus prazos, entregas pendentes e atualize seus progressos de forma simplificada.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-700">
              Ir para Minhas Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Painel de Atividades Card */}
          <motion.div 
            whileHover={{ y: -2 }}
            onClick={() => handleProtectedNavigate("planning", "dashboard", "planning_dashboard")}
            className="p-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <FolderKanban size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Atividades</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Acompanhe o andamento geral das tarefas e metas. Visualize status, progressos acumulados e índices gerenciais por área operacional em gráficos de tempo real.
              </p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-xs font-bold text-blue-700">
              Abrir Painel de Atividades <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>

        {/* Shortcuts Sub-grid list: remaining 6 elements positioned in 2 columns of 3 items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Shortcut A: Painel de Atividades */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "dashboard", "planning_dashboard")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Painel de Atividades</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Gráficos de progresso, relatórios sintéticos e métricas unificadas.</p>
            </div>
          </div>

          {/* Shortcut B: Atividades e Tarefas */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "tasks", "planning_tasks")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <ListTodo size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Cadastrar Atividades</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Cadastrar, gerenciar e editar atividades e cronogramas detalhados.</p>
            </div>
          </div>

          {/* Shortcut C: Planos de Trabalho */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "plans", "planning_plans")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <ClipboardList size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Planos de Trabalho</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Configurar macrometas e planos estratégicos estruturados.</p>
            </div>
          </div>

          {/* Shortcut D: Areas Tematicas */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "areas", "planning_areas")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <BookmarkCheck size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Áreas Temáticas</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Gerenciar áreas de atuação, siglas e descrições temáticas.</p>
            </div>
          </div>

          {/* Shortcut E: Categorias */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "categories", "planning_categories")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <Tags size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Categorias de Atividades</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Categorizar as atividades para rotular e analisar relatórios.</p>
            </div>
          </div>

          {/* Shortcut F: Responsáveis */}
          <div 
            onClick={() => handleProtectedNavigate("planning", "responsibles", "planning_responsibles")}
            className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer group transition-all duration-200 flex items-start gap-3"
          >
            <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-0.5">
              <Users size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-800 transition-colors">Atribuição de Responsáveis</h4>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Cadastrar membros da equipe, cargos e e-mails de acompanhamento.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Module Group 2: Regulação */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 2
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Regulação</h2>
          </div>
        </div>
        
        <div className="pt-2 space-y-8">
          {/* Sub-Módulo 2.1: Resoluções e Participação Social */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                Sub-Módulo 2.1
              </div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Resoluções e Participação Social</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item 2.1.1: Cadastrar Resoluções */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_cadastro", undefined, "reg_cadastro")}
                className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Resoluções</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Cadastre e gerencie o estoque regulatório, resoluções vigentes, atos normativos e atas de audiência da superintendência.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                  Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.1.2: Painel de Resoluções */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_painel", undefined, "reg_painel")}
                className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Resoluções</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Visualize estatísticas gerenciais do estoque regulatório, painel de monitoramento de obrigações e relatórios analíticos de resoluções.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                  Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.1.3: Participação Social */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_subsidios", undefined, "reg_subsidios")}
                className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Participação Social</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Gerencie tomadas de subsídios, consultas e audiências públicas, cadastre minutas e receba contribuições da sociedade.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                  Acessar participação <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.1.4: Painel de Participação Social */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_subsidios_painel", undefined, "reg_subsidios_painel")}
                className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Participação Social</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Acompanhamento gerencial das ações de participação social, consultas públicas, audiências, tomadas de subsídios e análise de contribuições.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                  Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sub-Módulo 2.2: Agenda Regulatória */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                Sub-Módulo 2.2
              </div>
              <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Agenda Regulatória</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item 2.2.1: Cadastrar Agenda Regulatória */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_agenda", undefined, "reg_agenda")}
                className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Agenda Regulatória</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Cadastre e gerencie a agenda regulatória, metas, temas e ações da agência reguladora e monitore seu progresso.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                  Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>

              {/* Item 2.2.2: Painel da Agenda Regulatória */}
              <motion.div 
                whileHover={{ y: -3 }}
                onClick={() => handleProtectedNavigate("reg_agenda_painel", undefined, "reg_agenda_painel")}
                className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel da Agenda Regulatória</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                    Acompanhamento estratégico, metas, indicadores gráficos e percentual de entregas dos itens da Agenda Regulatória.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                  Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Module Group 3: Fiscalização */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 3
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Fiscalização e Operações</h2>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
              Sub-Módulo 3.1
            </div>
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Balanço Hídrico dos Sistemas de Abastecimento de Água</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Item 3.1: Gerenciar Balancos */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => handleProtectedNavigate("manage", undefined, "water_balances")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <Droplets size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">1. Gerenciar Balanços</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Cadastro centralizado, duplicação rápida e controle histórico de todas as séries de balanço hídrico cadastradas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
              Acessar registros <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Item 3.2: Análise Individual */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => handleProtectedNavigate("analyze", undefined, "analyze")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-500 w-max border border-emerald-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                <Activity size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">2. Análise Individual</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Explore mapas interativos de balanço e visualize gráficos de projeções isoladas de oferta versus demandas projetadas de recursos.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-2">
              Visualizar gráficos <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Item 3.3: Comparar Balanços */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => handleProtectedNavigate("compare", undefined, "compare")}
            className="p-6 rounded-2xl border border-slate-200 hover:border-purple-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-purple-50 text-purple-500 w-max border border-purple-100 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                <GitCompare size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">3. Comparação de Cenários</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Comparações agregadas de múltiplos balanços hídricos selecionados simultaneamente em formato de curvas comparativas consolidadas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-purple-600 mt-2">
              Ver comparação <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-1 px-2.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
            Sub-Módulo 3.2
          </div>
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Fiscalização e Qualidade do Atendimento</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sub-Módulo 3.2.1: Painel de Fiscalização */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => handleProtectedNavigate("fisc_operational", undefined, "fisc_operational")}
            className="p-6 rounded-2xl border border-blue-200 hover:border-blue-400 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <Shield size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Fiscalização</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Painel estratégico de monitoramento das ações de fiscalização, constatações, não conformidades e termos emitidos.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
              Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Sub-Módulo 3.2.2: Painel Demanda Ouvidoria */}
          <motion.div 
            whileHover={{ y: -3 }}
            onClick={() => handleProtectedNavigate("recurso_painel", undefined, "recurso_painel")}
            className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-400 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <Scale size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Qualidade do Atendimento</h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                Painel estratégico de acompanhamento de demandas de ouvidoria, prazos, andamento e penalidades aplicadas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
              Visualizar painel <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
        </div>
      </section>

      {/* Module Group 4: Publicações */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-wider">
              Módulo 4
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Publicações</h2>
          </div>
        </div>

        <div className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sub-Módulo 4.1: Cadastrar Publicações */}
            <motion.div 
              whileHover={{ y: -3 }}
              onClick={() => handleProtectedNavigate("pub_cadastro", undefined, "pub_cadastro")}
              className="p-6 rounded-2xl border border-slate-200 hover:border-blue-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-500 w-max border border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Cadastrar Publicações</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                  Cadastre e gerencie o acervo bibliográfico da agência, relatórios anuais de atividades, boletins informativos e artigos de pesquisa científica. Siga o mesmo layout da página de Resoluções.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
                Acessar cadastro <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>

            {/* Sub-Módulo 4.2: Painel de Publicações */}
            <motion.div 
              whileHover={{ y: -3 }}
              onClick={() => handleProtectedNavigate("pub_painel", undefined, "pub_painel")}
              className="p-6 rounded-2xl border border-indigo-200 hover:border-indigo-300 bg-white cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-indigo-50 text-indigo-500 w-max border border-indigo-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <BarChart2 size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 leading-tight">Painel de Publicações</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                  Visualize os painéis gerenciais gráficos de publicações, filtre seu acervo histórico e pesquise relatórios e artigos por autor, tipo de arquivo ou ementa explicativa de forma dinâmica.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 mt-2">
                Visualizar painel gráfico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Module Group 3: Outros Recursos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <div className="p-1 px-2.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-black uppercase tracking-wider">
            Suporte
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Arquivos de Apoio e Templates</h2>
        </div>

        <motion.div 
          whileHover={{ y: -2 }}
          onClick={() => handleProtectedNavigate("templates", undefined, "templates")}
          className="p-5 rounded-2xl border border-slate-200 hover:border-rose-300 bg-white cursor-pointer group shadow-sm transition-all duration-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Baixar Arquivos Modelo para Carga de Dados</h3>
              <p className="text-slate-500 text-[11px] font-medium mt-0.5">Baixe formatos estruturados em Excel/CSV para preencher demandas com facilidade.</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform mr-2" />
        </motion.div>
      </section>

      {/* Modal de Expansão de Atividades por Status / Situação */}
      <AnimatePresence>
        {expandedModalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="fixed inset-0"
              onClick={closeStatusModal}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className={`p-6 border-b text-white relative overflow-hidden ${
                expandedModalState.activeFilter === "Atrasada"
                  ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-500 border-rose-800"
                  : expandedModalState.activeFilter === "Crítica"
                  ? "bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 border-amber-700"
                  : expandedModalState.activeFilter === "No Prazo"
                  ? "bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 border-emerald-800"
                  : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-slate-800"
              }`}>
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-white">
                      {expandedModalState.categoryType === "status" ? (
                        <>
                          <Clock size={12} className="text-white/80" />
                          <span>Status do Prazo</span>
                        </>
                      ) : (
                        <>
                          <Activity size={12} className="text-white/80" />
                          <span>Situação Operacional</span>
                        </>
                      )}
                      <span className="text-white/60">•</span>
                      <span>{expandedModalState.scopeTitle}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      {expandedModalState.activeFilter === "all" ? (
                        "Todas as Atividades"
                      ) : expandedModalState.activeFilter === "Atrasada" ? (
                        <>
                          <AlertOctagon size={22} className="text-white animate-pulse" />
                          <span>Atividades Atrasadas</span>
                        </>
                      ) : expandedModalState.activeFilter === "Crítica" ? (
                        <>
                          <AlertTriangle size={22} className="text-white animate-bounce" />
                          <span>Atividades Críticas (Vencendo em até 7 dias)</span>
                        </>
                      ) : expandedModalState.activeFilter === "No Prazo" ? (
                        <>
                          <CheckCircle2 size={22} className="text-white" />
                          <span>Atividades No Prazo</span>
                        </>
                      ) : (
                        `Atividades ${expandedModalState.activeFilter}`
                      )}
                    </h3>

                    <p className="text-xs text-white/80 font-medium">
                      {expandedModalState.scopeSubtitle ? (
                        <span>{expandedModalState.scopeSubtitle} — </span>
                      ) : null}
                      Total de <strong>{modalDisplayTasks.length}</strong> {modalDisplayTasks.length === 1 ? "atividade listada" : "atividades listadas"} no plano ativo.
                    </p>
                  </div>

                  <button
                    onClick={closeStatusModal}
                    className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Fechar janela (ESC)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Sub-bar com Abas de Filtro e Busca */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Abas Rápidas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {expandedModalState.categoryType === "status" ? (
                    <>
                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "Atrasada" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          expandedModalState.activeFilter === "Atrasada"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>Atrasadas ({modalCounts.delayed})</span>
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "Crítica" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          expandedModalState.activeFilter === "Crítica"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>Críticas ({modalCounts.critical})</span>
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "No Prazo" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          expandedModalState.activeFilter === "No Prazo"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>No Prazo ({modalCounts.onTime})</span>
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "all" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          expandedModalState.activeFilter === "all"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        Todas ({modalCounts.total})
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "Não iniciada" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          expandedModalState.activeFilter === "Não iniciada"
                            ? "bg-slate-700 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        Não Iniciadas ({modalCounts.notStarted})
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "Em andamento" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          expandedModalState.activeFilter === "Em andamento"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        Em Andamento ({modalCounts.inProgress})
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "Concluída" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          expandedModalState.activeFilter === "Concluída"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        Concluídas ({modalCounts.completed})
                      </button>

                      <button
                        onClick={() => setExpandedModalState(prev => ({ ...prev, activeFilter: "all" }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                          expandedModalState.activeFilter === "all"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                        }`}
                      >
                        Todas ({modalCounts.total})
                      </button>
                    </>
                  )}
                </div>

                {/* Input de Busca */}
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, código ou responsável..."
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 transition-colors"
                  />
                  {modalSearchTerm && (
                    <button
                      onClick={() => setModalSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Atividades */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-h-[55vh]">
                {modalDisplayTasks.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Nenhuma atividade encontrada</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {modalSearchTerm
                          ? "Nenhum resultado corresponde aos termos da pesquisa."
                          : "Não há atividades com este status no escopo selecionado."}
                      </p>
                    </div>
                  </div>
                ) : (
                  modalDisplayTasks.map((task) => {
                    const taskDlStatus = getDeadlineStatus(task.endDate, task.status);
                    const taskNormStatus = normalizeStatus(task.status);
                    const diffDays = getDaysDiffFromToday(task.endDate);

                    return (
                      <div
                        key={task.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 hover:shadow-md bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${
                          taskDlStatus === "Atrasada"
                            ? "border-rose-200 hover:border-rose-300"
                            : taskDlStatus === "Crítica"
                            ? "border-amber-200 hover:border-amber-300"
                            : "border-slate-200 hover:border-indigo-200"
                        }`}
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Badges superiores */}
                          <div className="flex flex-wrap items-center gap-2">
                            {task.code && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {task.code}
                              </span>
                            )}

                            {/* Badge de Status do Prazo */}
                            {taskDlStatus === "Atrasada" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <AlertOctagon size={11} className="text-rose-600" />
                                <span>
                                  {diffDays !== null && diffDays < 0
                                    ? `Atrasada há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dia" : "dias"}`
                                    : "Atrasada"}
                                </span>
                              </span>
                            ) : taskDlStatus === "Crítica" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Clock size={11} className="text-amber-600" />
                                <span>
                                  {diffDays !== null && diffDays >= 0
                                    ? `Vence em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`
                                    : "Crítica"}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>No Prazo</span>
                              </span>
                            )}

                            {/* Badge de Situação */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              taskNormStatus === "Concluída"
                                ? "bg-emerald-100 text-emerald-800"
                                : taskNormStatus === "Em andamento"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {taskNormStatus}
                            </span>
                          </div>

                          {/* Título da Atividade */}
                          <h4 
                            onClick={() => {
                              closeStatusModal();
                              if (activePlan) {
                                if (onNavigateToPlanningWithFilter) {
                                  onNavigateToPlanningWithFilter(
                                    "tasks", 
                                    activePlan.id, 
                                    task.areaId || (task.areaIds && task.areaIds[0]), 
                                    expandedModalState.isMyTasks,
                                    task.id
                                  );
                                } else {
                                  handleProtectedNavigate("planning", "tasks", "planning_tasks");
                                }
                              }
                            }}
                            className="text-sm font-black text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors cursor-pointer"
                            title="Clique para editar esta atividade"
                          >
                            {task.title}
                          </h4>

                          {/* Meta: Datas e Responsáveis */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400" />
                              <span>
                                {task.startDate ? formatDateBR(task.startDate) : "Início n/d"}
                                {" → "}
                                <strong className={taskDlStatus === "Atrasada" ? "text-rose-600 font-black" : taskDlStatus === "Crítica" ? "text-amber-600 font-black" : "text-slate-800"}>
                                  {task.endDate ? formatDateBR(task.endDate) : "Sem prazo"}
                                </strong>
                              </span>
                            </div>

                            {task.assignedTo && (
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                <span className="text-slate-700 font-semibold">{task.assignedTo}</span>
                              </div>
                            )}
                          </div>

                          {/* Barra de Progresso */}
                          <div className="flex items-center gap-3 pt-1 max-w-md">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  task.progress === 100
                                    ? "bg-emerald-500"
                                    : (task.progress || 0) > 0
                                    ? taskDlStatus === "Atrasada"
                                      ? "bg-rose-500"
                                      : taskDlStatus === "Crítica"
                                      ? "bg-amber-500"
                                      : "bg-indigo-600"
                                    : "bg-slate-300"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700 tabular-nums shrink-0">
                              {task.progress || 0}%
                            </span>
                          </div>
                        </div>

                        {/* Botão de Ação Direta para Editar Atividade */}
                        <button
                          onClick={() => {
                            closeStatusModal();
                            if (activePlan) {
                              if (onNavigateToPlanningWithFilter) {
                                onNavigateToPlanningWithFilter(
                                  "tasks", 
                                  activePlan.id, 
                                  task.areaId || (task.areaIds && task.areaIds[0]), 
                                  expandedModalState.isMyTasks,
                                  task.id
                                );
                              } else {
                                handleProtectedNavigate("planning", "tasks", "planning_tasks");
                              }
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 group/open shadow-2xs"
                          title="Abrir formulário para editar esta atividade"
                        >
                          <Edit3 size={13} className="text-slate-400 group-hover/open:text-indigo-600 transition-colors" />
                          <span>Editar Atividade</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer do Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Mostrando <strong>{modalDisplayTasks.length}</strong> de <strong>{modalScopeTasks.length}</strong> atividades do escopo
                </span>

                <div className="flex items-center gap-2">
                  {activePlan && (
                    <button
                      onClick={() => {
                        closeStatusModal();
                        if (onNavigateToPlanningWithFilter) {
                          onNavigateToPlanningWithFilter(
                            "tasks",
                            activePlan.id,
                            expandedModalState.areaId,
                            expandedModalState.isMyTasks
                          );
                        } else {
                          handleProtectedNavigate("planning", "tasks", "planning_tasks");
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ListTodo size={14} />
                      <span>Abrir Todas no Planejamento</span>
                    </button>
                  )}

                  <button
                    onClick={closeStatusModal}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Entregas do Mês com Filtro por Área Temática */}
      <AnimatePresence>
        {selectedMonthForDeliveries && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <CalendarCheck size={24} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                        Entregas de {selectedMonthForDeliveries.monthName} de {selectedMonthForDeliveries.year}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {selectedMonthTasks.length} {selectedMonthTasks.length === 1 ? "Concluída" : "Concluídas"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Atividades finalizadas no plano <strong>{activePlan?.name || "Plano Geral"}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMonthForDeliveries(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Filter Bar */}
              <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col gap-3">
                {/* Filtro por Área Temática */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Filter size={13} /> Área:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => setMonthModalAreaFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        monthModalAreaFilter === "all"
                          ? "bg-slate-800 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Todas ({selectedMonthTasks.length})
                    </button>
                    {monthAvailableAreas.map(area => {
                      const count = selectedMonthTasks.filter(t => {
                        const aId = t.areaId || (t.areaIds && t.areaIds[0]);
                        return Number(aId) === Number(area.id);
                      }).length;
                      return (
                        <button
                          key={area.id}
                          onClick={() => setMonthModalAreaFilter(area.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            monthModalAreaFilter === area.id
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
                          }`}
                        >
                          {area.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Box on the line below */}
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar entregas por título, descrição ou ID..."
                    value={monthModalSearch}
                    onChange={e => setMonthModalSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 outline-none transition"
                  />
                  {monthModalSearch && (
                    <button
                      onClick={() => setMonthModalSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Task List */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3 bg-slate-50/40">
                {filteredMonthTasks.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl space-y-2">
                    <CheckCircle2 size={36} className="mx-auto text-slate-300" />
                    <h4 className="text-sm font-bold text-slate-700">Nenhuma entrega encontrada</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {monthModalSearch || monthModalAreaFilter !== "all"
                        ? "Nenhum resultado corresponde aos filtros selecionados para este mês."
                        : "Não há atividades com status concluído registradas neste mês."}
                    </p>
                  </div>
                ) : (
                  filteredMonthTasks.map(task => {
                    const areaName = getTaskAreaName(task, areas);
                    const compDate = task.completedAt || task.endDate;

                    return (
                      <div
                        key={task.id}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {task.code && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-black uppercase tracking-wider">
                                {task.code}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Concluída
                            </span>
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-bold">
                              {areaName}
                            </span>
                          </div>

                          <h4 
                            onClick={() => {
                              setSelectedMonthForDeliveries(null);
                              if (activePlan) {
                                if (onNavigateToPlanningWithFilter) {
                                  onNavigateToPlanningWithFilter(
                                    "tasks",
                                    activePlan.id,
                                    task.areaId || (task.areaIds && task.areaIds[0]),
                                    undefined,
                                    task.id
                                  );
                                } else {
                                  handleProtectedNavigate("planning", "tasks", "planning_tasks");
                                }
                              }
                            }}
                            className="text-sm font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Clique para editar esta atividade"
                          >
                            {task.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-medium">
                            {compDate && (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-slate-400" />
                                <span>
                                  Conclusão: <strong className="text-slate-800 font-bold">{formatDateBR(compDate)}</strong>
                                </span>
                              </div>
                            )}
                            {task.assignedTo && (
                              <div className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                <span className="text-slate-700 font-semibold">{task.assignedTo}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button to Edit Task */}
                        <button
                          onClick={() => {
                            setSelectedMonthForDeliveries(null);
                            if (activePlan) {
                              if (onNavigateToPlanningWithFilter) {
                                onNavigateToPlanningWithFilter(
                                  "tasks",
                                  activePlan.id,
                                  task.areaId || (task.areaIds && task.areaIds[0]),
                                  undefined,
                                  task.id
                                );
                              } else {
                                handleProtectedNavigate("planning", "tasks", "planning_tasks");
                              }
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs group/btn"
                          title="Abrir formulário para editar esta atividade"
                        >
                          <Edit3 size={13} className="text-slate-400 group-hover/btn:text-emerald-600 transition-colors" />
                          <span>Editar Atividade</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Mostrando <strong>{filteredMonthTasks.length}</strong> de <strong>{selectedMonthTasks.length}</strong> entregas de {selectedMonthForDeliveries.monthName}
                </span>

                <div className="flex items-center gap-2">
                  {activePlan && (
                    <button
                      onClick={() => {
                        setSelectedMonthForDeliveries(null);
                        if (onNavigateToPlanningWithFilter) {
                          onNavigateToPlanningWithFilter(
                            "tasks",
                            activePlan.id,
                            monthModalAreaFilter !== "all" ? Number(monthModalAreaFilter) : undefined
                          );
                        } else {
                          handleProtectedNavigate("planning", "tasks", "planning_tasks");
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ListTodo size={14} />
                      <span>Abrir no Planejamento</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedMonthForDeliveries(null)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
