import React, { useMemo } from "react";
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
  UserCheck
} from "lucide-react";
import { motion } from "motion/react";
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
  onNavigateToPlanningWithFilter?: (subTab: "tasks" | "dashboard", planId: number | string, areaId?: number, isMyTasks?: boolean) => void;
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
      name: "Minhas Tarefas",
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

      {/* Module Group: Acesso Rápido (Plano Ativo) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1 px-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-600" />
              Acesso Rápido
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Plano Ativo: <span className="text-indigo-700 font-extrabold">{activePlan?.name || "Plano Geral de Atividades"}</span>
            </h2>
          </div>
          {activePlan && (
            <div className="flex items-center gap-2">
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

        {/* Box com Gráficos da Figura */}
        <div className="space-y-4">
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
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  <span>TOTAL DE ATIVIDADES</span>
                  <Info size={13} className="text-slate-400 cursor-help" title="Total de atividades cadastradas no plano ativo" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-tight">
                  {totalTasks}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  filtradas no painel
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                <FolderKanban size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 2: Não Iniciadas */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  <span>NÃO INICIADAS</span>
                  <Info size={13} className="text-slate-400 cursor-help" title="Atividades ainda não iniciadas (progresso 0%)" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-tight">
                  {notStartedTasks}
                </div>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  atividades pendentes
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
                <Clock size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 3: Em Andamento */}
            <div className="bg-blue-50/40 rounded-3xl p-5 sm:p-6 border border-blue-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 mb-1">
                  <span>EM ANDAMENTO</span>
                  <Info size={13} className="text-blue-400 cursor-help" title="Atividades iniciadas em execução (progresso entre 1% e 99%)" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-blue-900 tracking-tight tabular-nums leading-tight">
                  {inProgressTasks}
                </div>
                <div className="text-xs font-semibold text-blue-600/70 mt-0.5">
                  atividades iniciadas
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-blue-600 border border-blue-100 shadow-xs flex items-center justify-center shrink-0">
                <Activity size={22} className="stroke-[2.2]" />
              </div>
            </div>

            {/* Box 4: Concluídas */}
            <div className="bg-emerald-50/50 rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 mb-1">
                  <span>CONCLUÍDAS</span>
                  <Info size={13} className="text-emerald-500 cursor-help" title="Atividades concluídas com 100% de entrega" />
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight tabular-nums leading-tight">
                  {completedTasks}
                </div>
                <div className="text-xs font-semibold text-emerald-700/80 mt-0.5">
                  atividades finalizadas
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 border border-emerald-200 shadow-xs flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="stroke-[2.2]" />
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

                    {/* Quadros de Distribuição: Situação e Status do Prazo */}
                    <div className="space-y-2.5">
                      {/* Quadro 1: Situação */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Situação
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/90 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Não Inic.</span>
                            <span className="text-sm font-black text-slate-700 tabular-nums">{item.notStarted}</span>
                          </div>
                          <div className="border-x border-slate-200 px-1">
                            <span className="text-[10px] font-black uppercase text-blue-500 block tracking-wider">Andamento</span>
                            <span className="text-sm font-black text-blue-700 tabular-nums">{item.inProgress}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-500 block tracking-wider">Concluídas</span>
                            <span className="text-sm font-black text-emerald-700 tabular-nums">{item.completed}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quadro 2: Status do Prazo */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Status do Prazo
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/90 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">No Prazo</span>
                            <span className="text-sm font-black text-emerald-700 tabular-nums">{item.onTime}</span>
                          </div>
                          <div className="border-x border-slate-200 px-1">
                            <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider">Crítica</span>
                            <span className="text-sm font-black text-amber-700 tabular-nums">{item.critical}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-rose-500 block tracking-wider">Atrasadas</span>
                            <span className="text-sm font-black text-rose-700 tabular-nums">{item.delayed}</span>
                          </div>
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
    </div>
  );
}
