import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, BookOpen, Layers, ExternalLink } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
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
  const [formTema, setFormTema] = useState("QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS");
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [formAgendaTasks, setFormAgendaTasks] = useState<{ task_id: number; status: string; entrega: string; entrega_link: string }[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");

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
    "QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS",
    "FORTALECIMENTO DA CAPACIDADE REGULATÓRIA"
  ];

  const normalizeStatus = (status: string | undefined): "Não iniciada" | "Em andamento" | "Concluída" => {
    if (!status) return "Não iniciada";
    const s = status.toLowerCase().trim();
    if (s === "concluída" || s === "concluído" || s === "completed") return "Concluída";
    if (s === "em andamento" || s === "in_progress" || s === "in progress") return "Em andamento";
    return "Não iniciada";
  };

  const statuses = ["TODOS", "Não iniciada", "Em andamento", "Concluída"];

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
    setFormTema("QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS");
    setSelectedTaskIds([]);
    setFormAgendaTasks([]);
    setTaskSearchQuery("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agenda: RegulatoryAgenda) => {
    setEditingId(agenda.id);
    setFormNome(agenda.nome);
    setFormTema(agenda.tema);
    setSelectedTaskIds(agenda.task_ids || []);
    
    // Set customized task entries with status inherited from task
    const paired = (agenda.agenda_tasks || []).map(t => {
      const tId = Number(t.task_id);
      const matchingTask = tasks.find(x => x.id === tId);
      return {
        task_id: tId,
        status: normalizeStatus(matchingTask?.status || t.status),
        entrega: t.entrega || "",
        entrega_link: t.entrega_link || ""
      };
    });
    setFormAgendaTasks(paired);
    setTaskSearchQuery("");
    setIsModalOpen(true);
  };

  const handleToggleTaskSelection = (taskId: number) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
      setFormAgendaTasks(formAgendaTasks.filter(item => item.task_id !== taskId));
    } else {
      const matchingTask = tasks.find(x => x.id === taskId);
      setSelectedTaskIds([...selectedTaskIds, taskId]);
      setFormAgendaTasks([...formAgendaTasks, {
        task_id: taskId,
        status: normalizeStatus(matchingTask?.status),
        entrega: "",
        entrega_link: ""
      }]);
    }
  };

  const handleUpdateTaskConfig = (taskId: number, field: "entrega" | "entrega_link", value: string) => {
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
    if (!formNome) {
      showToast("Por favor, preencha o Nome da Agenda.", "error");
      return;
    }

    const payload = {
      nome: formNome,
      tema: formTema,
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
          editingId ? "Agenda Regulatória atualizada!" : "Agenda Regulatória cadastrada com sucesso!",
          "success"
        );
        setIsModalOpen(false);
        fetchData();
      } else {
        showToast(json.error || "Erro ao salvar.", "error");
      }
    } catch {
      showToast("Erro ao conectar com o servidor.", "error");
    }
  };

  // Filter agendas
  const filteredAgendas = agendas.filter(agenda => {
    const matchesSearch =
      agenda.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTema = filterTema === "TODOS" || agenda.tema === filterTema;

    return matchesSearch && matchesTema;
  });

  // Filter tasks shown as options in multi-select form
  const filteredTaskOptions = tasks.filter(task =>
    task.title.toLowerCase().includes(taskSearchQuery.toLowerCase())
  );

  return (
    <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative min-h-[80vh]">
      {/* Header section copying ResolutionsTab layout */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={28} />
            Agenda Regulatória
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Planejamento de ações regulatórias, metas de qualidade de serviços e fortalecimento da capacidade regulatória da agência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus size={16} /> Nova Agenda
          </button>
        </div>
      </div>

      {/* Filters bar copying exactly the styling of ResolutionsTab */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pesquisar</label>
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

        {/* Tema */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tema</label>
          <select
            value={filterTema}
            onChange={(e) => setFilterTema(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {temas.map(t => (
              <option key={t} value={t}>{t === "TODOS" ? "Tudo (Temas)" : t}</option>
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
                  <th className="px-5 py-4 w-1/2">Agenda / Nome</th>
                  <th className="px-5 py-4 w-1/3">Tema</th>
                  <th className="px-5 py-4 w-28 text-right">Ações</th>
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
                    // Match tasks corresponding to associated task_ids
                    const associatedTasks = tasks.filter(t => (agenda.task_ids || []).includes(t.id));

                    return (
                      <React.Fragment key={agenda.id}>
                        <tr className="hover:bg-slate-50/30 transition-colors group align-top">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800">{agenda.nome}</span>
                              {associatedTasks.length > 0 && (
                                <button
                                  onClick={() => toggleAgendaExpand(agenda.id)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1.5 focus:outline-none"
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  {associatedTasks.length} {associatedTasks.length === 1 ? "tarefa associada" : "tarefas associadas"}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                            <span className="inline-block bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1 text-[10px] uppercase font-black text-indigo-700 tracking-wider">
                              {agenda.tema}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(agenda)}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(agenda.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Deletar"
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
                                  Ações Regulatórias Vinculadas (Métricas Específicas)
                                </h5>

                                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                                          <th className="px-4 py-3 w-5/12">Ação Regulatória / Atividade</th>
                                          <th className="px-4 py-3 w-3/12">Entrega / Detalhes</th>
                                          <th className="px-4 py-3 w-32 text-center">Progresso</th>
                                          <th className="px-4 py-3 w-28 text-center">Status</th>
                                          <th className="px-4 py-3 w-24 text-center">Link</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs">
                                        {associatedTasks.map(tk => {
                                          const customTaskConfig = (agenda.agenda_tasks || []).find(it => Number(it.task_id) === tk.id);
                                          const taskStatus = normalizeStatus(tk.status || customTaskConfig?.status);
                                          const taskProgress = typeof tk.progress === "number" ? tk.progress : (taskStatus === "Concluída" ? 100 : 0);
                                          const taskEntrega = customTaskConfig?.entrega || "";
                                          const taskLink = customTaskConfig?.entrega_link || "";

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
                                              <td className="px-4 py-3 align-middle font-medium text-slate-600">
                                                {taskEntrega ? (
                                                  <span className="text-slate-700 font-semibold">{taskEntrega}</span>
                                                ) : (
                                                  <span className="text-slate-400 italic text-[11px]">Não informada</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                                                <div className="flex flex-col items-center gap-1 min-w-[100px] max-w-[120px] mx-auto">
                                                  <div className="flex items-center justify-between w-full text-[10px] font-extrabold">
                                                    <span className={taskProgress === 100 ? "text-emerald-600" : taskProgress >= 50 ? "text-blue-600" : taskProgress > 0 ? "text-indigo-600" : "text-slate-400"}>
                                                      {taskProgress}%
                                                    </span>
                                                  </div>
                                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/60">
                                                    <div 
                                                      className={`h-full rounded-full transition-all duration-500 ${
                                                        taskProgress === 100 
                                                          ? "bg-emerald-500" 
                                                          : taskProgress >= 50 
                                                          ? "bg-blue-500" 
                                                          : taskProgress > 0 
                                                          ? "bg-indigo-500" 
                                                          : "bg-slate-300"
                                                      }`}
                                                      style={{ width: `${taskProgress}%` }}
                                                    />
                                                  </div>
                                                </div>
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
                                                    title="Acessar link externo"
                                                  >
                                                    <ExternalLink size={12} />
                                                    <span>Acessar</span>
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

      {/* Main Registration Modal - mimicking style of ResolutionsTab modal exactly */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-black text-slate-800 tracking-tight gap-2 flex items-center mb-6">
              <BookOpen className="text-indigo-600" size={20} />
              {editingId !== null ? "Editar Agenda Regulatória" : "Cadastrar Nova Agenda Regulatória"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Agenda *</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Agenda de Saneamento 2026"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {/* Tema */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tema Regulatório *</label>
                <select
                  value={formTema}
                  onChange={(e) => setFormTema(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none bg-white transition-all cursor-pointer"
                >
                  <option value="QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS">QUALIDADE DA PRESTAÇÃO DOS SERVIÇOS</option>
                  <option value="FORTALECIMENTO DA CAPACIDADE REGULATÓRIA">FORTALECIMENTO DA CAPACIDADE REGULATÓRIA</option>
                </select>
              </div>

              {/* Ações Regulatórias (Tasks Association) */}
              <div className="space-y-2 text-left border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ações Regulatórias Vinculadas (Tarefas)
                </label>
                <p className="text-[10px] text-slate-400 font-medium">
                  Selecione as tarefas do sistema que pertencem a este cronograma de trabalho da agenda.
                </p>

                {/* SubSearch inside checkboxes list */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Filtrar tarefas..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                  />
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
                </div>

                {/* Checklist container */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-48 overflow-y-auto space-y-2">
                  {filteredTaskOptions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center font-medium py-4">Nenhuma tarefa cadastrada ou encontrada.</p>
                  ) : (
                    filteredTaskOptions.map(tk => {
                      const isChecked = selectedTaskIds.includes(tk.id);
                      return (
                        <label
                          key={tk.id}
                          className="flex items-start gap-2.5 p-1.5 hover:bg-slate-100/70 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTaskSelection(tk.id)}
                            className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-slate-700">{tk.title}</span>
                            {tk.status && (
                              <span className="ml-1.5 text-[9px] font-semibold text-slate-400 uppercase">
                                ({tk.status})
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                {selectedTaskIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-indigo-600 font-bold">
                      {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "tarefa selecionada" : "tarefas selecionadas"}.
                    </p>

                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                        Configuração Individual de cada Tarefa Selecionada
                      </label>
                      <div className="space-y-4 max-h-80 overflow-y-auto p-1 pr-2">
                        {selectedTaskIds.map(taskId => {
                          const matchingTask = tasks.find(t => t.id === taskId);
                          if (!matchingTask) return null;

                          const inheritedStatus = normalizeStatus(matchingTask.status);
                          const config = formAgendaTasks.find(it => Number(it.task_id) === taskId) || {
                            task_id: taskId,
                            status: inheritedStatus,
                            entrega: "",
                            entrega_link: ""
                          };

                          return (
                            <div key={taskId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 text-left">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 line-clamp-1">{matchingTask.title}</span>
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider whitespace-nowrap ${
                                      inheritedStatus === "Concluída"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : inheritedStatus === "Em andamento"
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}
                                  >
                                    Status: {inheritedStatus} (Herdado da Atividade)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskSelection(taskId)}
                                  className="text-[9px] uppercase font-black text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                >
                                  Remover
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Task Delivery details */}
                                <div>
                                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Entrega / Meta do Item</label>
                                  <input
                                    type="text"
                                    value={config.entrega}
                                    onChange={(e) => handleUpdateTaskConfig(taskId, "entrega", e.target.value)}
                                    placeholder="Ex: Ofício de conclusão, relatório técnico..."
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-all"
                                  />
                                </div>

                                {/* Task External Link / Hiperlink */}
                                <div>
                                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Hiperlink do Arquivo da Entrega (Opcional)</label>
                                  <input
                                    type="text"
                                    value={config.entrega_link}
                                    onChange={(e) => handleUpdateTaskConfig(taskId, "entrega_link", e.target.value)}
                                    placeholder="Ex: https://drive.google.com/file/d/..."
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-indigo-500 transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions submit */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
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
