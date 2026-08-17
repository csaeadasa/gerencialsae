import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  X, 
  Upload, 
  Download, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  ArrowUpDown, 
  ArrowDown, 
  ArrowUp,
  Compass,
  Clock,
  Sparkles,
  Layers,
  AlertCircle,
  Eye,
  CheckCircle,
  FileText,
  Filter,
  MessageSquare,
  Send,
  User,
  Calendar
} from "lucide-react";
import { RadarActivity, RadarComment } from "../types";
import { useAuth } from "../lib/auth";

export function parseRadarComments(raw?: string): RadarComment[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((c: any, idx: number) => ({
          id: c.id || `cmt-${idx}-${Date.now()}`,
          autor: c.autor || "Membro da Equipe",
          autorEmail: c.autorEmail || "",
          dataHora: c.dataHora || new Date().toISOString(),
          texto: c.texto || ""
        }))
        .filter((c: RadarComment) => c.texto.trim().length > 0)
        .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
    }
  } catch {
    if (raw.trim()) {
      return [{
        id: "legacy-1",
        autor: "Equipe",
        dataHora: new Date().toISOString(),
        texto: raw.trim()
      }];
    }
  }
  return [];
}

export function formatRadarDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeFormatted = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${dateFormatted} às ${timeFormatted}`;
  } catch {
    return dateStr;
  }
}

interface RadarAtividadesTabProps {
  showToast: any;
  currentUser?: { name?: string; email?: string } | null;
}

export function RadarAtividadesTab({ showToast, currentUser }: RadarAtividadesTabProps) {
  const { currentUser: authUser } = useAuth();
  const activeUser = authUser || currentUser;
  const loggedUserName = activeUser?.name || activeUser?.email || "Membro da Equipe";

  const [activities, setActivities] = useState<RadarActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const notify = (msg: string, type: "success" | "error" | "warning" | "info" = "info") => {
    if (typeof showToast === "function") {
      if (showToast.length >= 3) {
        const title = type === "error" ? "Erro" : type === "warning" ? "Aviso" : type === "info" ? "Informação" : "Sucesso";
        showToast(title, msg, type);
      } else {
        showToast(msg, type);
      }
    }
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [filterPrioridade, setFilterPrioridade] = useState("TODOS");
  const [filterArea, setFilterArea] = useState("TODOS");

  // Expanded details rows in table
  const [expandedRowIds, setExpandedRowIds] = useState<number[]>([]);

  // Modals & Drawers state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<RadarActivity | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formAreaTematica, setFormAreaTematica] = useState("Regulação (CORA)");
  const [formAssunto, setFormAssunto] = useState("");
  const [formResultadoEsperado, setFormResultadoEsperado] = useState("");
  const [formPrioridade, setFormPrioridade] = useState("Alta (1 a 2 anos)");
  const [formJustificativa, setFormJustificativa] = useState("");
  const [formStatus, setFormStatus] = useState("Elegível");
  const [formComments, setFormComments] = useState<RadarComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [viewCommentText, setViewCommentText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // CSV Import state
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RadarActivity;
    direction: "asc" | "desc";
  }>({ key: "id", direction: "asc" });

  // Load data
  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/radar-activities");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Servidor retornou status ${response.status}: ${text}`);
      }
      const json = await response.json();
      if (json.success) {
        setActivities(json.data);
      } else {
        notify(json.error || "Erro ao carregar atividades do radar.", "error");
      }
    } catch (error: any) {
      console.error(error);
      notify("Não foi possível carregar as atividades do radar.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Filter options derived from data
  const statuses = ["TODOS", "Elegível", "Selecionado", "Arquivado"];
  const prioridades = [
    "TODOS",
    "Alta (1 a 2 anos)",
    "Média (3 a 4 anos)",
    "Baixa (mais de 5 anos)"
  ];
  const areas = ["TODOS", ...Array.from(new Set(activities.map(a => a.area_tematica).filter(Boolean)))];

  const toggleRowExpand = (id: number) => {
    if (expandedRowIds.includes(id)) {
      setExpandedRowIds(expandedRowIds.filter(x => x !== id));
    } else {
      setExpandedRowIds([...expandedRowIds, id]);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormTitulo("");
    setFormDescricao("");
    setFormAreaTematica("Regulação (CORA)");
    setFormAssunto("");
    setFormResultadoEsperado("");
    setFormPrioridade("Alta (1 a 2 anos)");
    setFormJustificativa("");
    setFormStatus("Elegível");
    setFormComments([]);
    setNewCommentText("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (act: RadarActivity) => {
    setEditingId(act.id);
    setFormTitulo(act.titulo || "");
    setFormDescricao(act.descricao || "");
    setFormAreaTematica(act.area_tematica || "Regulação (CORA)");
    setFormAssunto(act.assunto || "");
    setFormResultadoEsperado(act.resultado_esperado || "");
    setFormPrioridade(act.prioridade || "Alta (1 a 2 anos)");
    setFormJustificativa(act.justificativa || "");
    setFormStatus(act.status || "Elegível");
    setFormComments(parseRadarComments(act.observacoes));
    setNewCommentText("");
    setIsModalOpen(true);
  };

  const handleAddCommentToForm = () => {
    if (!newCommentText.trim()) return;
    const newComment: RadarComment = {
      id: `cmt-${Date.now()}`,
      autor: loggedUserName,
      autorEmail: activeUser?.email || "",
      dataHora: new Date().toISOString(),
      texto: newCommentText.trim()
    };
    setFormComments(prev => [newComment, ...prev]);
    setNewCommentText("");
  };

  const handleDeleteCommentFromForm = (id: string) => {
    setFormComments(prev => prev.filter(c => c.id !== id));
  };

  const handleQuickAddCommentToView = async (actId: number) => {
    if (!viewCommentText.trim()) return;
    const currentComments = parseRadarComments(viewingActivity?.observacoes);
    const newComment: RadarComment = {
      id: `cmt-${Date.now()}`,
      autor: loggedUserName,
      autorEmail: activeUser?.email || "",
      dataHora: new Date().toISOString(),
      texto: viewCommentText.trim()
    };
    const updatedComments = [newComment, ...currentComments];
    
    try {
      const response = await fetch(`/api/radar-activities/${actId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...viewingActivity,
          observacoes: JSON.stringify(updatedComments)
        })
      });
      const json = await response.json();
      if (json.success) {
        notify("Comentário adicionado com sucesso!", "success");
        setViewCommentText("");
        setViewingActivity(json.data);
        fetchActivities();
      } else {
        notify(json.error || "Erro ao adicionar comentário.", "error");
      }
    } catch (e) {
      notify("Erro ao conectar ao servidor.", "error");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      notify("O título da atividade é obrigatório.", "warning");
      return;
    }

    setIsSaving(true);
    let finalComments = [...formComments];
    if (newCommentText.trim()) {
      finalComments = [
        {
          id: `cmt-${Date.now()}`,
          autor: loggedUserName,
          autorEmail: activeUser?.email || "",
          dataHora: new Date().toISOString(),
          texto: newCommentText.trim()
        },
        ...finalComments
      ];
      setNewCommentText("");
    }

    const payload = {
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim(),
      area_tematica: formAreaTematica.trim(),
      assunto: formAssunto.trim(),
      resultado_esperado: formResultadoEsperado.trim(),
      prioridade: formPrioridade.trim(),
      justificativa: formJustificativa.trim(),
      status: formStatus.trim(),
      observacoes: JSON.stringify(finalComments)
    };

    try {
      let response;
      if (editingId) {
        response = await fetch(`/api/radar-activities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch("/api/radar-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const json = await response.json();
      if (json.success) {
        notify(
          editingId ? "Atividade do radar atualizada com sucesso!" : "Nova atividade cadastrada no radar!",
          "success"
        );
        setIsModalOpen(false);
        fetchActivities();
      } else {
        notify(json.error || "Erro ao salvar atividade.", "error");
      }
    } catch (error: any) {
      console.error(error);
      notify("Erro ao conectar ao servidor.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/radar-activities/${id}`, {
        method: "DELETE"
      });
      const json = await response.json();
      if (json.success) {
        notify("Atividade removida do radar com sucesso.", "success");
        setDeleteConfirmId(null);
        if (viewingActivity?.id === id) setViewingActivity(null);
        fetchActivities();
      } else {
        notify(json.error || "Erro ao excluir atividade.", "error");
      }
    } catch (error: any) {
      console.error(error);
      notify("Erro ao excluir atividade.", "error");
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      notify("Insira o conteúdo do CSV ou carregue um arquivo.", "warning");
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch("/api/radar-activities/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: csvText })
      });
      const json = await response.json();
      if (json.success) {
        notify(`${json.count} atividades importadas com sucesso!`, "success");
        setIsImportModalOpen(false);
        setCsvText("");
        fetchActivities();
      } else {
        notify(json.error || "Erro ao importar dados.", "error");
      }
    } catch (error: any) {
      console.error(error);
      notify("Erro ao realizar importação.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      notify("Arquivo carregado com sucesso! Clique em Importar.", "info");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleExportCsv = () => {
    if (activities.length === 0) {
      notify("Não há atividades para exportar.", "warning");
      return;
    }

    const headers = ["ID", "Título", "Área Temática", "Assunto", "Prioridade", "Status", "Resultado Esperado", "Justificativa", "Descrição", "Comentários da Equipe"];
    const rows = filteredActivities.map(act => {
      const cmts = parseRadarComments(act.observacoes);
      const commentsExportText = cmts
        .map(c => `[${formatRadarDate(c.dataHora)} - ${c.autor}]: ${c.texto}`)
        .join(" | ");

      return [
        act.id,
        `"${(act.titulo || "").replace(/"/g, '""')}"`,
        `"${(act.area_tematica || "").replace(/"/g, '""')}"`,
        `"${(act.assunto || "").replace(/"/g, '""')}"`,
        `"${(act.prioridade || "").replace(/"/g, '""')}"`,
        `"${(act.status || "").replace(/"/g, '""')}"`,
        `"${(act.resultado_esperado || "").replace(/"/g, '""')}"`,
        `"${(act.justificativa || "").replace(/"/g, '""')}"`,
        `"${(act.descricao || "").replace(/"/g, '""')}"`,
        `"${commentsExportText.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `radar_atividades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exportação CSV concluída com sucesso.", "success");
  };

  // Filter logic
  const filteredActivities = activities.filter(act => {
    const term = searchQuery.toLowerCase();
    const matchSearch =
      (act.titulo || "").toLowerCase().includes(term) ||
      (act.descricao || "").toLowerCase().includes(term) ||
      (act.assunto || "").toLowerCase().includes(term) ||
      (act.area_tematica || "").toLowerCase().includes(term) ||
      (act.resultado_esperado || "").toLowerCase().includes(term) ||
      (act.justificativa || "").toLowerCase().includes(term) ||
      (act.observacoes || "").toLowerCase().includes(term);

    const matchStatus = filterStatus === "TODOS" || act.status === filterStatus;
    const matchPrioridade = filterPrioridade === "TODOS" || act.prioridade === filterPrioridade;
    const matchArea = filterArea === "TODOS" || act.area_tematica === filterArea;

    return matchSearch && matchStatus && matchPrioridade && matchArea;
  });

  const handleSort = (key: keyof RadarActivity) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIcon = (key: keyof RadarActivity) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="text-slate-300 ml-1 inline" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={12} className="text-indigo-600 ml-1 inline" />
    ) : (
      <ArrowDown size={12} className="text-indigo-600 ml-1 inline" />
    );
  };

  const sortedFilteredActivities = [...filteredActivities].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    if (key === "id") {
      return (a.id - b.id) * dir;
    }

    const valA = (a[key] || "").toString().toLowerCase();
    const valB = (b[key] || "").toString().toLowerCase();
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });

  // Color helpers
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "selecionado":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "elegível":
      case "elegivel":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "em análise":
      case "em analise":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "concluído":
      case "concluido":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "arquivado":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "rejeitado":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadge = (prio: string) => {
    if (prio?.toLowerCase().includes("alta")) {
      return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
    }
    if (prio?.toLowerCase().includes("média") || prio?.toLowerCase().includes("media")) {
      return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
    }
    if (prio?.toLowerCase().includes("baixa")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  // Metrics
  const countTotal = activities.length;
  const countSelecionado = activities.filter(a => a.status?.toLowerCase() === "selecionado").length;
  const countElegivel = activities.filter(a => a.status?.toLowerCase() === "elegível" || a.status?.toLowerCase() === "elegivel").length;
  const countAlta = activities.filter(a => a.prioridade?.toLowerCase().includes("alta")).length;

  return (
    <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-left flex flex-col relative min-h-[80vh]">
      {/* Header section identical to standard portal style */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Compass className="text-indigo-600" size={28} />
            Radar de Atividades
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Mapeamento e gestão de propostas de atividades regulatórias futuras a serem analisadas, priorizadas e estruturadas pela equipe.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            title="Exportar dados em formato CSV"
          >
            <Download size={15} /> Exportar CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            <Upload size={15} /> Importar CSV
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus size={16} /> Nova Proposta
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Propostas</span>
            <Layers size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{countTotal}</span>
            <span className="text-xs text-slate-500 font-medium">no radar</span>
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Selecionadas</span>
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{countSelecionado}</span>
            <span className="text-xs text-blue-600/80 font-medium">priorizadas</span>
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Elegíveis</span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{countElegivel}</span>
            <span className="text-xs text-emerald-600/80 font-medium">em avaliação</span>
          </div>
        </div>

        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Alta Prioridade</span>
            <Clock size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{countAlta}</span>
            <span className="text-xs text-rose-600/80 font-medium">1 a 2 anos</span>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pesquisar</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Título, descrição, assunto..."
              className="w-full bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 text-xs font-semibold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {statuses.map(st => (
              <option key={st} value={st}>{st === "TODOS" ? "Todos os Status" : st}</option>
            ))}
          </select>
        </div>

        {/* Prioridade */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prioridade / Horizonte</label>
          <select
            value={filterPrioridade}
            onChange={(e) => setFilterPrioridade(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {prioridades.map(p => (
              <option key={p} value={p}>{p === "TODOS" ? "Todas as Prioridades" : p}</option>
            ))}
          </select>
        </div>

        {/* Area */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Área Temática</label>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {areas.map(a => (
              <option key={a} value={a}>{a === "TODOS" ? "Todas as Áreas" : a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50/50 border border-slate-200/60 rounded-3xl">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Carregando Radar...</h4>
          <p className="text-xs text-slate-400 mt-1">Buscando propostas registradas.</p>
        </div>
      ) : sortedFilteredActivities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 bg-slate-50/50 border border-slate-200/60 rounded-2xl text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <Compass size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-800">Nenhuma proposta encontrada</h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            {searchQuery || filterStatus !== "TODOS" || filterPrioridade !== "TODOS" || filterArea !== "TODOS"
              ? "Nenhuma atividade corresponde aos filtros aplicados. Tente ajustar os parâmetros de busca."
              : "Cadastre novas atividades ou importe uma planilha para alimentar o radar."}
          </p>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus size={14} /> Cadastrar Primeira Proposta
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-black">
                  <th className="px-5 py-4 w-12 text-center">#</th>
                  <th 
                    className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("titulo")}
                  >
                    <div className="flex items-center">Atividade / Proposta {getSortIcon("titulo")}</div>
                  </th>
                  <th 
                    className="px-5 py-4 w-52 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("assunto")}
                  >
                    <div className="flex items-center">Assunto & Área {getSortIcon("assunto")}</div>
                  </th>
                  <th 
                    className="px-5 py-4 w-44 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                    onClick={() => handleSort("prioridade")}
                  >
                    <div className="flex items-center justify-center">Prioridade {getSortIcon("prioridade")}</div>
                  </th>
                  <th 
                    className="px-5 py-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center justify-center">Status {getSortIcon("status")}</div>
                  </th>
                  <th className="px-5 py-4 w-28 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedFilteredActivities.map((act, index) => {
                  const isExpanded = expandedRowIds.includes(act.id);
                  return (
                    <React.Fragment key={act.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors group align-top">
                        <td className="px-5 py-4 text-xs font-bold text-slate-400 text-center">
                          {index + 1}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-snug">
                                {act.titulo}
                              </span>
                            </div>

                            {/* Badge resumido quando colapsado */}
                            {!isExpanded && (() => {
                              const cmts = parseRadarComments(act.observacoes);
                              return (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  {act.descricao && (
                                    <p className="text-xs text-slate-500 line-clamp-1 flex-1">
                                      {act.descricao}
                                    </p>
                                  )}
                                  {cmts.length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                      <MessageSquare size={11} className="text-indigo-500" />
                                      {cmts.length} {cmts.length === 1 ? "comentário" : "comentários"}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Painel de Mais Detalhes Expandido */}
                            {isExpanded && (
                              <div className="mt-3 space-y-3 pt-2 border-t border-slate-100">
                                {/* 1. Descrição da Proposta */}
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">
                                    Descrição da Proposta
                                  </span>
                                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {act.descricao || "Não informada."}
                                  </p>
                                </div>

                                {/* 2. Resultado Esperado */}
                                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                                  <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block mb-1">
                                    Resultado Esperado
                                  </span>
                                  <p className="text-xs text-emerald-950 leading-relaxed whitespace-pre-wrap">
                                    {act.resultado_esperado || "Não informado."}
                                  </p>
                                </div>

                                {/* 3. Justificativa / Contexto Regulatório */}
                                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                                  <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                                    Justificativa / Contexto Regulatório
                                  </span>
                                  <p className="text-xs text-amber-950 leading-relaxed whitespace-pre-wrap">
                                    {act.justificativa || "Não informada."}
                                  </p>
                                </div>

                                {/* 4. Comentários da Equipe */}
                                {(() => {
                                  const cmts = parseRadarComments(act.observacoes);
                                  return (
                                    <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/80 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                          <MessageSquare size={13} className="text-indigo-600" />
                                          <span>Comentários da Equipe ({cmts.length})</span>
                                        </div>
                                      </div>

                                      {cmts.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                                          Nenhum comentário registrado nesta proposta.
                                        </p>
                                      ) : (
                                        <div className="space-y-1.5 mt-1">
                                          {cmts.map((cmt) => (
                                            <div key={cmt.id} className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs shadow-2xs">
                                              <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100">
                                                <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                                  <User size={12} className="text-indigo-500" />
                                                  {cmt.autor}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                  {formatRadarDate(cmt.dataHora)}
                                                </span>
                                              </div>
                                              <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{cmt.texto}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Botão Mais Detalhes / Menos Detalhes */}
                            <button
                              onClick={() => toggleRowExpand(act.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-2 self-start transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={13} /> Menos detalhes
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={13} /> Mais detalhes
                                </>
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-slate-700 leading-snug">
                              {act.assunto || "Geral"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {act.area_tematica || "Regulação (CORA)"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs border ${getPriorityBadge(act.prioridade)}`}>
                            {act.prioridade || "Não definida"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(act.status)}`}>
                            {act.status || "Elegível"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setViewingActivity(act)}
                              title="Ver ficha completa"
                              className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(act)}
                              title="Editar atividade"
                              className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(act.id)}
                              title="Excluir proposta"
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              Exibindo <strong>{sortedFilteredActivities.length}</strong> de <strong>{activities.length}</strong> atividades cadastradas no radar
            </span>
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Elegível
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Selecionado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Arquivado
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New / Edit Activity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                {editingId ? <Edit2 size={18} /> : <Plus size={20} />}
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 tracking-tight">
                  {editingId ? "Editar Proposta no Radar" : "Cadastrar Nova Proposta no Radar"}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Preencha os campos para estruturar e avaliar a atividade regulatória.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Titulo */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Título da Atividade / Proposta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Revisão da Resolução n. 14/2011..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Grid: Area, Assunto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Área Temática
                  </label>
                  <input
                    type="text"
                    value={formAreaTematica}
                    onChange={(e) => setFormAreaTematica(e.target.value)}
                    placeholder="Ex: Regulação (CORA), Fiscalização..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Assunto
                  </label>
                  <input
                    type="text"
                    value={formAssunto}
                    onChange={(e) => setFormAssunto(e.target.value)}
                    placeholder="Ex: Normas regulatórias de água e de esgoto"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Grid: Prioridade, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Prioridade / Prazo
                  </label>
                  <select
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="Alta (1 a 2 anos)">Alta (1 a 2 anos)</option>
                    <option value="Média (3 a 4 anos)">Média (3 a 4 anos)</option>
                    <option value="Baixa (mais de 5 anos)">Baixa (mais de 5 anos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="Elegível">Elegível</option>
                    <option value="Selecionado">Selecionado</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              {/* Descricao */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Descrição da Proposta
                </label>
                <textarea
                  rows={3}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhamento técnico do escopo e objetivo da atividade..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl p-3 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Resultado Esperado */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Resultado Esperado
                </label>
                <textarea
                  rows={2}
                  value={formResultadoEsperado}
                  onChange={(e) => setFormResultadoEsperado(e.target.value)}
                  placeholder="Ex: Melhoria da prestação dos serviços de água e esgoto aos usuários..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl p-3 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Justificativa */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Justificativa / Contexto Regulatório
                </label>
                <textarea
                  rows={3}
                  value={formJustificativa}
                  onChange={(e) => setFormJustificativa(e.target.value)}
                  placeholder="Ex: Publicação de nova norma de referência da ANA, defasagem de dados, lacuna regulatória..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-semibold rounded-xl p-3 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Comentarios da Equipe */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <MessageSquare size={14} className="text-indigo-600" />
                    <span>Comentários da Equipe ({formComments.length})</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                    <User size={12} className="text-slate-400" />
                    <span>Comentando como: <strong className="text-slate-700">{loggedUserName}</strong></span>
                  </div>
                </div>

                {/* Novo Comentário Input */}
                <div className="mb-3 space-y-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Escreva um comentário sobre esta proposta..."
                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 text-slate-800 text-xs font-semibold rounded-xl p-3 outline-none transition-all resize-none shadow-2xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddCommentToForm}
                      disabled={!newCommentText.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      <Send size={12} />
                      Adicionar Comentário
                    </button>
                  </div>
                </div>

                {/* Lista de Comentários em Ordem Decrescente */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formComments.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 bg-white/70 rounded-xl border border-slate-200/60 border-dashed">
                      Nenhum comentário registrado nesta proposta ainda.
                    </div>
                  ) : (
                    formComments.map((cmt) => (
                      <div key={cmt.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">
                              {cmt.autor.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-800">{cmt.autor}</span>
                            {cmt.autorEmail && (
                              <span className="text-[10px] text-slate-400">({cmt.autorEmail})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {formatRadarDate(cmt.dataHora)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommentFromForm(cmt.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded-md"
                              title="Remover comentário"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{cmt.texto}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSaving ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar no Radar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {viewingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setViewingActivity(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-100 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                <Compass size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">
                  {viewingActivity.area_tematica || "Regulação (CORA)"} • {viewingActivity.assunto || "Geral"}
                </span>
                <h4 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
                  {viewingActivity.titulo}
                </h4>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(viewingActivity.status)}`}>
                  Status: {viewingActivity.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityBadge(viewingActivity.prioridade)}`}>
                  Prioridade: {viewingActivity.prioridade}
                </span>
              </div>

              {viewingActivity.descricao && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Descrição</h5>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{viewingActivity.descricao}</p>
                </div>
              )}

              {viewingActivity.resultado_esperado && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <h5 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2">Resultado Esperado</h5>
                  <p className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">{viewingActivity.resultado_esperado}</p>
                </div>
              )}

              {viewingActivity.justificativa && (
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                  <h5 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-2">Justificativa e Motivação Regulatória</h5>
                  <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">{viewingActivity.justificativa}</p>
                </div>
              )}

              {/* Comentários da Equipe no Modal de Visualização */}
              {(() => {
                const viewComments = parseRadarComments(viewingActivity.observacoes);
                return (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-indigo-600" />
                        Comentários da Equipe ({viewComments.length})
                      </h5>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Logado como: <strong className="text-slate-700">{loggedUserName}</strong>
                      </span>
                    </div>

                    {/* Caixa rápida para adicionar comentário */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={viewCommentText}
                        onChange={(e) => setViewCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleQuickAddCommentToView(viewingActivity.id);
                          }
                        }}
                        placeholder="Adicionar comentário rápido sobre esta proposta..."
                        className="flex-1 bg-white border border-slate-200 focus:border-indigo-500 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 outline-none transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddCommentToView(viewingActivity.id)}
                        disabled={!viewCommentText.trim()}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                      >
                        <Send size={12} />
                        Enviar
                      </button>
                    </div>

                    {/* Lista em ordem decrescente */}
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {viewComments.length === 0 ? (
                        <div className="text-center py-3 text-xs text-slate-400 bg-white/60 rounded-xl border border-slate-200/60 border-dashed">
                          Nenhum comentário registrado nesta proposta.
                        </div>
                      ) : (
                        viewComments.map((cmt) => (
                          <div key={cmt.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-100">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                                <User size={12} className="text-indigo-500" />
                                {cmt.autor}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatRadarDate(cmt.dataHora)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{cmt.texto}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
              <button
                onClick={() => {
                  const act = viewingActivity;
                  setViewingActivity(null);
                  handleOpenEdit(act);
                }}
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold"
              >
                <Edit2 size={14} /> Editar esta atividade
              </button>
              <button
                type="button"
                onClick={() => setViewingActivity(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h4 className="text-lg font-black text-slate-800 mb-1">Confirmar Exclusão</h4>
            <p className="text-xs text-slate-500 mb-6">
              Tem certeza que deseja remover esta proposta de atividade do radar? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Upload size={20} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 tracking-tight">
                  Importar Atividades do Radar via CSV
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Importação em massa de propostas de atividades com separador ponto-e-vírgula (;) ou vírgula (,).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="text-indigo-600 mb-2" size={32} />
                  <span className="text-xs font-bold text-slate-700">Clique para carregar arquivo .CSV</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">ou cole os dados brutos no campo abaixo</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Conteúdo CSV
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`titulo;descricao;area_tematica;assunto;resultado_esperado;prioridade;justificativa;status;observacoes
Revisão da Resolução n. 14/2011;Revisão da norma de condições gerais...;Regulação (CORA);Normas regulatórias;Melhoria da prestação...;Alta (1 a 2 anos);;Selecionado;OK`}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white text-slate-800 text-xs font-mono rounded-xl p-3 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportCsv}
                  disabled={isImporting || !csvText.trim()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isImporting ? "Importando..." : "Processar e Importar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
