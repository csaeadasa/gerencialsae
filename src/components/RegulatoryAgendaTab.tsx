import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, BookOpen, Layers, ExternalLink, Check, Sparkles, Filter, Link2, Target } from "lucide-react";
import { TEMAS_AGENDA_REGULATORIA } from "../types";

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
  agendaRegulatoriaData?: {
    temaRegulatorio?: string;
    entregaMeta?: string;
    linkArquivoEntrega?: string;
  };
}

interface RegulatoryAgenda {
  id: number;
  nome: string;
  tema?: string;
  task_ids: number[];
  agenda_tasks?: {
    task_id: number;
    status: string;
    entrega: string;
    entrega_link?: string;
    tema?: string;
  }[];
}

interface RegulatoryAgendaTabProps {
  showToast: any;
  currentUser?: { name?: string; email?: string } | null;
}

export function RegulatoryAgendaTab({ showToast, currentUser }: RegulatoryAgendaTabProps) {
  const [agendas, setAgendas] = useState<RegulatoryAgenda[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTema, setFilterTema] = useState("TODOS");

  // Collapsed agenda list IDs (for hiding descriptions / tasks)
  const [collapsedAgendas, setCollapsedAgendas] = useState<number[]>([]);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formNome, setFormNome] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [formAgendaTasks, setFormAgendaTasks] = useState<{
    task_id: number;
    status: string;
    entrega: string;
    entrega_link: string;
    tema: string;
  }[]>([]);

  // Picker search & filter state inside modal
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Load data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get Agendas
      const agendasRes = await fetch("/api/agendas");
      if (!agendasRes.ok) {
        const text = await agendasRes.text();
        throw new Error(`Servidor retornou status ${agendasRes.status}: ${text}`);
      }
      const agendasJson = await agendasRes.json();
      
      // Get Tasks for relations
      const tasksRes = await fetch("/api/tasks");
      if (!tasksRes.ok) {
        const text = await tasksRes.text();
        throw new Error(`Servidor retornou status ${tasksRes.status}: ${text}`);
      }
      const tasksJson = await tasksRes.json();

      if (agendasJson.success) {
        setAgendas(agendasJson.data || []);
      } else {
        showToast(agendasJson.error || "Erro ao carregar agendas regulatórias.", "error");
      }

      if (tasksJson.success) {
        setTasks(tasksJson.data || []);
      }
    } catch (error: any) {
      console.error(error);
      showToast("Não foi possível carregar os dados do servidor.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const temas = [
    "TODOS",
    ...TEMAS_AGENDA_REGULATORIA
  ];

  const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
    if (!status) return "Não iniciada";
    const s = status.toLowerCase().trim();
    if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
    if (s === "em andamento" || s === "in_progress" || s === "in progress") return "Em andamento";
    return "Não iniciada";
  };

  const toggleAgendaExpand = (id: number) => {
    if (collapsedAgendas.includes(id)) {
      setCollapsedAgendas(collapsedAgendas.filter(x => x !== id));
    } else {
      setCollapsedAgendas([...collapsedAgendas, id]);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormNome("");
    setSelectedTaskIds([]);
    setFormAgendaTasks([]);
    setTaskSearchQuery("");
    setIsPickerOpen(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agenda: RegulatoryAgenda) => {
    setEditingId(agenda.id);
    setFormNome(agenda.nome);
    const ids = agenda.task_ids || [];
    setSelectedTaskIds(ids);
    
    // Set customized task entries with per-activity tema
    const paired = (agenda.agenda_tasks || []).map(t => {
      const tId = Number(t.task_id);
      const matchingTask = tasks.find(x => x.id === tId);
      return {
        task_id: tId,
        status: normalizeStatus(matchingTask?.status || t.status),
        entrega: t.entrega || "",
        entrega_link: t.entrega_link || "",
        tema: t.tema || matchingTask?.agendaRegulatoriaData?.temaRegulatorio || "Qualidade da Prestação de Serviços"
      };
    });
    setFormAgendaTasks(paired);
    setTaskSearchQuery("");
    setIsPickerOpen(false);
    setIsModalOpen(true);
  };

  const handleToggleTaskSelection = (taskId: number) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
      setFormAgendaTasks(formAgendaTasks.filter(item => item.task_id !== taskId));
    } else {
      const matchingTask = tasks.find(x => x.id === taskId);
      const defaultTema = matchingTask?.agendaRegulatoriaData?.temaRegulatorio || "Qualidade da Prestação de Serviços";
      const defaultEntrega = matchingTask?.agendaRegulatoriaData?.entregaMeta || "";
      const defaultLink = matchingTask?.agendaRegulatoriaData?.linkArquivoEntrega || "";

      setSelectedTaskIds([...selectedTaskIds, taskId]);
      setFormAgendaTasks([...formAgendaTasks, {
        task_id: taskId,
        status: normalizeStatus(matchingTask?.status),
        entrega: defaultEntrega,
        entrega_link: defaultLink,
        tema: defaultTema
      }]);
    }
  };

  const handleUpdateTaskConfig = (
    taskId: number, 
    field: "entrega" | "entrega_link" | "tema", 
    value: string
  ) => {
    setFormAgendaTasks(prev => prev.map(item => {
      if (item.task_id === taskId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir esta Agenda Regulatória?")) return;

    try {
      const response = await fetch(`/api/agendas/${id}`, {
        method: "DELETE"
      });
      const json = await response.json();
      if (json.success) {
        showToast("Agenda Regulatória excluída com sucesso!", "success");
        setAgendas(agendas.filter(a => a.id !== id));
      } else {
        showToast(json.error || "Erro ao excluir.", "error");
      }
    } catch {
      showToast("Erro de comunicação.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      showToast("Por favor, preencha o Nome da Agenda.", "error");
      return;
    }

    if (selectedTaskIds.length === 0) {
      if (!window.confirm("Esta agenda não possui atividades vinculadas. Deseja salvar mesmo assim?")) {
        return;
      }
    }

    const payload = {
      nome: formNome.trim(),
      tema: formAgendaTasks.length > 0 ? formAgendaTasks[0].tema : "Qualidade da Prestação de Serviços",
      task_ids: selectedTaskIds,
      agenda_tasks: formAgendaTasks.map(item => {
        const matchingTask = tasks.find(t => t.id === item.task_id);
        return {
          ...item,
          status: normalizeStatus(matchingTask?.status || item.status)
        };
      })
    };

    try {
      const url = editingId ? `/api/agendas/${editingId}` : "/api/agendas";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();

      if (json.success) {
        showToast(
          editingId ? "Agenda Regulatória atualizada com sucesso!" : "Agenda Regulatória cadastrada com sucesso!",
          "success"
        );
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(json.error || "Erro ao salvar agenda.", "error");
      }
    } catch {
      showToast("Erro de comunicação com o servidor.", "error");
    }
  };

  // Filter agendas for main list
  const filteredAgendas = agendas.filter(agenda => {
    const matchesSearch = agenda.nome.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterTema === "TODOS") return matchesSearch;

    // Check if any task in agenda has the matching theme
    const hasMatchingTaskTema = (agenda.agenda_tasks || []).some(
      t => t.tema === filterTema || (tasks.find(x => x.id === Number(t.task_id))?.agendaRegulatoriaData?.temaRegulatorio === filterTema)
    );
    const matchesAgendaTema = agenda.tema === filterTema;

    return matchesSearch && (matchesAgendaTema || hasMatchingTaskTema);
  });

  // Filter task options in modal picker
  const filteredTaskOptions = tasks.filter(task => {
    const query = taskSearchQuery.toLowerCase().trim();
    if (!query) return true;
    return task.title.toLowerCase().includes(query) || (task.description && task.description.toLowerCase().includes(query));
  });

  return (
    <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative min-h-[80vh]">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-adasa-mid" size={28} />
            Agenda Regulatória
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gestão de agendas regulatórias, vínculo de ações estratégicas e controle por tema regulatório individual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-adasa-mid hover:bg-adasa-hover text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-adasa-dark/20 cursor-pointer"
          >
            <Plus size={16} /> Nova Agenda
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pesquisar Agenda</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por nome..."
              className="w-full bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-semibold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          </div>
        </div>

        {/* Tema Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Filtrar por Tema Regulatório</label>
          <select
            value={filterTema}
            onChange={(e) => setFilterTema(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {temas.map(t => (
              <option key={t} value={t}>{t === "TODOS" ? "Todos os Temas Regulatórios" : t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content area */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 border border-slate-200/60 rounded-3xl">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Carregando Agendas Regulatórias...</h4>
          <p className="text-xs text-slate-400 mt-1 font-medium">Buscando do banco de dados.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                  <th className="px-5 py-4 w-1/2">Agenda Regulatória / Nome</th>
                  <th className="px-5 py-4 text-center">Atividades Vinculadas</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAgendas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-slate-400 font-medium">
                      Nenhuma agenda regulatória encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAgendas.map(agenda => {
                    const isExpanded = !collapsedAgendas.includes(agenda.id);
                    const associatedTasks = tasks.filter(t => (agenda.task_ids || []).includes(t.id));

                    return (
                      <React.Fragment key={agenda.id}>
                        <tr className="hover:bg-slate-50/30 transition-colors group align-top">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{agenda.nome}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-slate-400">
                                  {associatedTasks.length} {associatedTasks.length === 1 ? "atividade regulatória vinculada" : "atividades regulatórias vinculadas"}
                                </span>
                                {associatedTasks.length > 0 && (
                                  <button
                                    onClick={() => toggleAgendaExpand(agenda.id)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 focus:outline-none cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {isExpanded ? "Ocultar Detalhes" : "Ver Atividades"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 font-black text-xs">
                              <Layers size={13} className="text-indigo-600" />
                              {associatedTasks.length} {associatedTasks.length === 1 ? "Atividade" : "Atividades"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(agenda)}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar Agenda Regulatória"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(agenda.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Excluir Agenda Regulatória"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable row for associated Task Details */}
                        {isExpanded && associatedTasks.length > 0 && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={3} className="px-6 py-4 border-t border-slate-200/80">
                              <div className="space-y-2 text-left">
                                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-2.5">
                                  <Layers size={13} className="text-indigo-600" />
                                  Ações Regulatórias Vinculadas (Com Temas Individuais)
                                </h5>

                                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                                          <th className="px-4 py-3 w-4/12">Atividade Regulatória</th>
                                          <th className="px-4 py-3 w-3/12">Tema Regulatório Estratégico</th>
                                          <th className="px-4 py-3 w-3/12">Entrega / Meta</th>
                                          <th className="px-4 py-3 w-24 text-center">Status</th>
                                          <th className="px-4 py-3 w-20 text-center">Documento</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs">
                                        {associatedTasks.map(tk => {
                                          const customTaskConfig = (agenda.agenda_tasks || []).find(it => Number(it.task_id) === tk.id);
                                          const taskStatus = normalizeStatus(tk.status || customTaskConfig?.status);
                                          const taskTema = customTaskConfig?.tema || tk.agendaRegulatoriaData?.temaRegulatorio || "Qualidade da Prestação de Serviços";
                                          const taskEntrega = customTaskConfig?.entrega || tk.agendaRegulatoriaData?.entregaMeta || "";
                                          const taskLink = customTaskConfig?.entrega_link || tk.agendaRegulatoriaData?.linkArquivoEntrega || "";

                                          return (
                                            <tr key={tk.id} className="hover:bg-slate-50/50 transition-colors">
                                              <td className="px-4 py-3 align-middle">
                                                <span className="font-bold text-slate-800 block">{tk.title}</span>
                                                {tk.description && (
                                                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 block">
                                                    {tk.description}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 align-middle">
                                                <span className="inline-block bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                                                  {taskTema}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 align-middle font-medium text-slate-600">
                                                {taskEntrega ? (
                                                  <span className="text-slate-700 font-semibold">{taskEntrega}</span>
                                                ) : (
                                                  <span className="text-slate-400 italic text-[11px]">Não informada</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                <span
                                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                                                    taskStatus === "Concluída"
                                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                      : taskStatus === "Em andamento"
                                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                                  }`}
                                                >
                                                  {taskStatus}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                {taskLink ? (
                                                  <a
                                                    href={taskLink.startsWith("http") ? taskLink : `https://${taskLink}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                    title="Acessar documento oficial"
                                                  >
                                                    <ExternalLink size={12} />
                                                    <span>Link</span>
                                                  </a>
                                                ) : (
                                                  <span className="text-slate-300 text-xs font-semibold">-</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Registration / Edit Modal - Modernized & Intuitive */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full p-6 sm:p-8 max-h-[92vh] flex flex-col my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    {editingId !== null ? "Editar Agenda Regulatória" : "Cadastrar Nova Agenda Regulatória"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {editingId !== null 
                      ? "Atualize o nome da agenda e gerencie o tema e entregas de cada atividade vinculada." 
                      : "Defina o nome da agenda e vincule as atividades do sistema configurando o tema de cada uma."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-1">
              {/* Nome da Agenda */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-indigo-600" />
                  Nome da Agenda Regulatória <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Agenda Regulatória 2025-2026"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-2xs bg-white"
                />
              </div>

              {/* Seção Vincular Atividades */}
              <div className="space-y-3 text-left border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" />
                      Vincular Atividades à Agenda
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Pesquise e selecione as atividades que fazem parte desta Agenda. O tema regulatório é configurado individualmente para cada uma.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isPickerOpen 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <Plus size={14} />
                    <span>{isPickerOpen ? "Fechar Busca" : "Buscar e Vincular Atividades"}</span>
                  </button>
                </div>

                {/* Search & Picker Drawer / Combobox */}
                {isPickerOpen && (
                  <div className="bg-slate-50/90 border border-indigo-100 rounded-2xl p-4 space-y-3 shadow-inner">
                    <div className="relative">
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        placeholder="Digite para buscar atividades por título..."
                        className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-500 outline-none transition-all"
                      />
                      <Search className="absolute left-3 top-3 text-slate-400" size={15} />
                      {taskSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTaskSearchQuery("")}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Results list */}
                    <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {filteredTaskOptions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center font-medium py-6">
                          Nenhuma atividade encontrada com o termo "{taskSearchQuery}".
                        </p>
                      ) : (
                        filteredTaskOptions.map(tk => {
                          const isSelected = selectedTaskIds.includes(tk.id);
                          const statusNorm = normalizeStatus(tk.status);

                          return (
                            <div
                              key={tk.id}
                              onClick={() => handleToggleTaskSelection(tk.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 shadow-2xs' 
                                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3 pr-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold truncate block">{tk.title}</span>
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider inline-block mt-0.5 ${
                                    statusNorm === 'Concluída' ? 'text-emerald-600' : statusNorm === 'Em andamento' ? 'text-blue-600' : 'text-slate-400'
                                  }`}>
                                    Status: {statusNorm}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                  isSelected 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600'
                                }`}
                              >
                                {isSelected ? "✓ Vinculada" : "+ Vincular"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* List of Linked Activities with Individual Tema */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Atividades Vinculadas ({selectedTaskIds.length})
                    </span>
                    {selectedTaskIds.length === 0 && (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        Nenhuma atividade vinculada ainda
                      </span>
                    )}
                  </div>

                  {selectedTaskIds.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/40">
                      <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Nenhuma atividade vinculada a esta agenda.</p>
                      <p className="text-[11px] text-slate-400 mt-1 mb-3">Clique no botão abaixo para buscar e adicionar atividades do sistema.</p>
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                      >
                        <Plus size={14} /> Buscar e Vincular Atividades
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                      {selectedTaskIds.map((taskId, index) => {
                        const matchingTask = tasks.find(t => t.id === taskId);
                        if (!matchingTask) return null;

                        const inheritedStatus = normalizeStatus(matchingTask.status);
                        const config = formAgendaTasks.find(it => Number(it.task_id) === taskId) || {
                          task_id: taskId,
                          status: inheritedStatus,
                          entrega: "",
                          entrega_link: "",
                          tema: "Qualidade da Prestação de Serviços"
                        };

                        return (
                          <div 
                            key={taskId} 
                            className="bg-white border-2 border-slate-200/90 rounded-2xl p-4 space-y-3.5 text-left shadow-2xs hover:border-slate-300 transition-all"
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center border border-indigo-100">
                                  {index + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800">{matchingTask.title}</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  inheritedStatus === "Concluída" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : inheritedStatus === "Em andamento"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}>
                                  {inheritedStatus}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleTaskSelection(taskId)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Desvincular atividade da agenda"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {/* Config Fields Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* 1. Tema Regulatório Estratégico (Informed individually for each task!) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                  <Layers size={12} className="text-indigo-600" />
                                  Tema Regulatório *
                                </label>
                                <select
                                  value={config.tema || "Qualidade da Prestação de Serviços"}
                                  onChange={(e) => handleUpdateTaskConfig(taskId, "tema", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                                >
                                  {TEMAS_AGENDA_REGULATORIA.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>

                              {/* 2. Entrega / Meta do Item */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                  <Target size={12} className="text-indigo-600" />
                                  Entrega / Meta do Item
                                </label>
                                <input
                                  type="text"
                                  value={config.entrega}
                                  onChange={(e) => handleUpdateTaskConfig(taskId, "entrega", e.target.value)}
                                  placeholder="Ex: Resolução, Relatório ARR..."
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                              </div>

                              {/* 3. Hiperlink do Arquivo */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                  <Link2 size={12} className="text-indigo-600" />
                                  Hiperlink do Arquivo
                                </label>
                                <input
                                  type="url"
                                  value={config.entrega_link}
                                  onChange={(e) => handleUpdateTaskConfig(taskId, "entrega_link", e.target.value)}
                                  placeholder="https://..."
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-adasa-mid hover:bg-adasa-hover text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-adasa-dark/10 cursor-pointer"
                >
                  {editingId !== null ? "Salvar Alterações" : "Criar Agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
