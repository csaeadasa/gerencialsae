import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  PieChart,
  Pie,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import {
  MessageSquare,
  Share2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookmarkCheck,
  Activity,
  Filter,
  Search,
  ArrowUpDown,
  History,
  TrendingUp,
  Download,
  RefreshCw,
  Tag,
  Users,
  Layers,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Clock,
  HelpCircle,
  BarChart3,
  SlidersHorizontal,
  FileCheck2,
} from "lucide-react";

interface SubjectItem {
  id: string;
  name: string;
  type?: "titulo" | "capitulo" | "secao" | "subsecao" | "assunto";
  parentId?: string | null;
  orderIndex?: number;
}

export interface ParticipacaoItem {
  id: number;
  numero: string;
  meioParticipacao: "Consulta Pública" | "Tomada de Subsídios" | "Audiência Pública" | string;
  tipoResolucao: "nova" | "alteracao" | string;
  title?: string;
  objeto?: string;
  dataInicio?: string;
  dataFim?: string;
  createdAt?: string;
  subjects?: SubjectItem[] | string;
  anexosCount?: number;
  totalArticles: number;
  totalContributions: number;
  uniqueParticipants: number;
  articles?: any[];
  stats: {
    acatadas: number;
    acatadasParciais: number;
    naoAcatadas: number;
    prejudicadas: number;
    retidas: number;
    emAnalise: number;
    totalAcatadasGeral: number;
    totalDecididas: number;
    taxaAcatamento: number;
    taxaConclusao: number;
    complexidadeAlta: number;
    complexidadeMedia: number;
    complexidadeBaixa: number;
  };
}

interface ParticipacaoSocialDashboardProps {
  showToast?: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
  currentUser?: any;
  onNavigateToParticipation?: (id: number) => void;
  onTabChange?: (tab: string) => void;
}

export const ParticipacaoSocialDashboard: React.FC<ParticipacaoSocialDashboardProps> = ({
  showToast,
  currentUser,
  onNavigateToParticipation,
  onTabChange,
}) => {
  const [participations, setParticipations] = useState<ParticipacaoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters and views
  const [timelineSearchText, setTimelineSearchText] = useState<string>("");
  const [timelineMeioFilter, setTimelineMeioFilter] = useState<string>("");
  const [timelineStatusFilter, setTimelineStatusFilter] = useState<string>("");
  const [timelineYearFilter, setTimelineYearFilter] = useState<string>("");
  const [timelineTipoFilter, setTimelineTipoFilter] = useState<string>("");

  const [rankingViewMode, setRankingViewMode] = useState<"chart" | "bento">("bento");
  const [rankingMetric, setRankingMetric] = useState<"contributions" | "articles" | "acatamento">("contributions");
  const [timelineViewMode, setTimelineViewMode] = useState<"table" | "timeline">("table");
  const [timelineSortOrder, setTimelineSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  const [tableSort, setTableSort] = useState<{ field: string; dir: "asc" | "desc" }>({
    field: "numero",
    dir: "desc",
  });

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/reg/participations-dashboard");
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setParticipations(json.data);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // Fallback: Fetch from normal endpoint if dashboard endpoint fails
      const fallbackRes = await fetch("/api/reg/participations");
      if (fallbackRes.ok) {
        const pList = await fallbackRes.json();
        if (Array.isArray(pList)) {
          // Format with basic zero stats
          const formatted = pList.map((p: any) => ({
            ...p,
            totalArticles: 0,
            totalContributions: 0,
            uniqueParticipants: 0,
            stats: {
              acatadas: 0,
              acatadasParciais: 0,
              naoAcatadas: 0,
              prejudicadas: 0,
              retidas: 0,
              emAnalise: 0,
              totalAcatadasGeral: 0,
              totalDecididas: 0,
              taxaAcatamento: 0,
              taxaConclusao: 0,
              complexidadeAlta: 0,
              complexidadeMedia: 0,
              complexidadeBaixa: 0,
            },
          }));
          setParticipations(formatted);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados do painel de participação social:", err);
      if (showToast) {
        showToast("Aviso", "Não foi possível carregar os dados em tempo real.", "warning");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute status for date intervals
  const getParticipationStatus = (p: ParticipacaoItem) => {
    if (!p.dataInicio && !p.dataFim) return { label: "Indefinido", color: "bg-slate-100 text-slate-700 border-slate-200" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDate = (dStr?: string) => {
      if (!dStr) return null;
      if (dStr.includes("-")) {
        const parts = dStr.split("-");
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      if (dStr.includes("/")) {
        const parts = dStr.split("/");
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      return null;
    };

    const dInicio = parseDate(p.dataInicio);
    const dFim = parseDate(p.dataFim);

    if (dInicio && today < dInicio) {
      return { label: "Prevista / Futura", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    }
    if (dFim && today > dFim) {
      return { label: "Encerrada", color: "bg-slate-100 text-slate-700 border-slate-300" };
    }
    return { label: "Em Andamento", color: "bg-emerald-50 text-emerald-700 border-emerald-300" };
  };

  // Helper for year extraction
  const getParticipationYear = (p: ParticipacaoItem): number => {
    if (p.dataInicio) {
      const year = parseInt(p.dataInicio.slice(0, 4), 10);
      if (!isNaN(year) && year > 1990) return year;
    }
    if (p.createdAt) {
      const year = parseInt(p.createdAt.slice(0, 4), 10);
      if (!isNaN(year) && year > 1990) return year;
    }
    // Try to extract from numero (e.g., CP 01/2024 -> 2024)
    if (p.numero && p.numero.includes("/")) {
      const parts = p.numero.split("/");
      const last = parts[parts.length - 1].trim();
      const yr = parseInt(last, 10);
      if (!isNaN(yr) && yr > 1990 && yr < 2100) return yr;
    }
    return new Date().getFullYear();
  };

  // Global KPIs Aggregations
  const totalCount = participations.length;
  const totalArticles = useMemo(() => participations.reduce((acc, p) => acc + (p.totalArticles || 0), 0), [participations]);
  const totalContributions = useMemo(() => participations.reduce((acc, p) => acc + (p.totalContributions || 0), 0), [participations]);
  
  const statusCounts = useMemo(() => {
    let abertas = 0;
    let encerradas = 0;
    let futuras = 0;
    participations.forEach(p => {
      const s = getParticipationStatus(p).label;
      if (s === "Em Andamento") abertas++;
      else if (s === "Encerrada") encerradas++;
      else if (s === "Prevista / Futura") futuras++;
    });
    return { abertas, encerradas, futuras };
  }, [participations]);

  const globalDecisions = useMemo(() => {
    let acatadas = 0;
    let acatadasParciais = 0;
    let naoAcatadas = 0;
    let prejudicadas = 0;
    let retidas = 0;
    let emAnalise = 0;

    let compAlta = 0;
    let compMedia = 0;
    let compBaixa = 0;

    participations.forEach(p => {
      acatadas += p.stats?.acatadas || 0;
      acatadasParciais += p.stats?.acatadasParciais || 0;
      naoAcatadas += p.stats?.naoAcatadas || 0;
      prejudicadas += p.stats?.prejudicadas || 0;
      retidas += p.stats?.retidas || 0;
      emAnalise += p.stats?.emAnalise || 0;

      compAlta += p.stats?.complexidadeAlta || 0;
      compMedia += p.stats?.complexidadeMedia || 0;
      compBaixa += p.stats?.complexidadeBaixa || 0;
    });

    const totalDecididas = acatadas + acatadasParciais + naoAcatadas + prejudicadas + retidas;
    const totalAcatadasGeral = acatadas + acatadasParciais;
    const taxaAcatamentoGlobal = totalDecididas > 0 ? (totalAcatadasGeral / totalDecididas) * 100 : 0;
    const taxaConclusaoGlobal = totalContributions > 0 ? (totalDecididas / totalContributions) * 100 : 100;

    return {
      acatadas,
      acatadasParciais,
      naoAcatadas,
      prejudicadas,
      retidas,
      emAnalise,
      totalDecididas,
      totalAcatadasGeral,
      taxaAcatamentoGlobal,
      taxaConclusaoGlobal,
      compAlta,
      compMedia,
      compBaixa,
    };
  }, [participations, totalContributions]);

  // Unique participants estimate
  const uniqueParticipantsTotal = useMemo(() => {
    return participations.reduce((acc, p) => acc + (p.uniqueParticipants || 0), 0);
  }, [participations]);

  // Chart 1 Data: Processos e Contribuições Acumuladas por Ano
  const yearAccumulatedData = useMemo(() => {
    const yearMap: Record<number, { count: number; contributions: number }> = {};
    participations.forEach(p => {
      const yr = getParticipationYear(p);
      if (!yearMap[yr]) yearMap[yr] = { count: 0, contributions: 0 };
      yearMap[yr].count += 1;
      yearMap[yr].contributions += p.totalContributions || 0;
    });

    const sortedYears = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
    let accumContrib = 0;
    let accumCount = 0;

    return sortedYears.map(yr => {
      accumCount += yearMap[yr].count;
      accumContrib += yearMap[yr].contributions;
      return {
        year: String(yr),
        count: yearMap[yr].count,
        contributions: yearMap[yr].contributions,
        accumulatedCount: accumCount,
        accumulated: accumContrib,
      };
    });
  }, [participations]);

  // Chart 2 Data: Distribuição das Decisões Técnicas (Pie)
  const decisionPieData = useMemo(() => {
    const data = [
      { name: "Acatada", value: globalDecisions.acatadas, color: "#008A3F" },
      { name: "Acatada Parcialmente", value: globalDecisions.acatadasParciais, color: "#0091DA" },
      { name: "Não Acatada", value: globalDecisions.naoAcatadas, color: "#E11D48" },
      { name: "Prejudicada", value: globalDecisions.prejudicadas, color: "#F59E0B" },
      { name: "Retida p/ Estudos", value: globalDecisions.retidas, color: "#8B5CF6" },
      { name: "Em Análise", value: globalDecisions.emAnalise, color: "#94A3B8" },
    ].filter(item => item.value > 0);

    if (data.length === 0) {
      return [{ name: "Sem contribuições", value: 1, color: "#CBD5E1" }];
    }
    return data;
  }, [globalDecisions]);

  // Chart 3 Data: Meios de Participação Social
  const meioPieData = useMemo(() => {
    const map: Record<string, number> = {};
    participations.forEach(p => {
      const m = p.meioParticipacao || "Consulta Pública";
      map[m] = (map[m] || 0) + 1;
    });

    const colors: Record<string, string> = {
      "Consulta Pública": "#1A3E8A",
      "Tomada de Subsídios": "#0091DA",
      "Audiência Pública": "#00A859",
    };

    return Object.keys(map).map(k => ({
      name: k,
      value: map[k],
      color: colors[k] || "#6366F1",
    }));
  }, [participations]);

  // Chart 4 Data: Complexidade vs Decisão
  const complexityData = useMemo(() => {
    return [
      {
        complexity: "Alta Complexidade",
        Acatadas: globalDecisions.compAlta > 0 ? Math.round(globalDecisions.compAlta * 0.4) : 0,
        Outras: globalDecisions.compAlta > 0 ? Math.round(globalDecisions.compAlta * 0.6) : 0,
        total: globalDecisions.compAlta,
      },
      {
        complexity: "Média Complexidade",
        Acatadas: globalDecisions.compMedia > 0 ? Math.round(globalDecisions.compMedia * 0.5) : 0,
        Outras: globalDecisions.compMedia > 0 ? Math.round(globalDecisions.compMedia * 0.5) : 0,
        total: globalDecisions.compMedia,
      },
      {
        complexity: "Baixa Complexidade",
        Acatadas: globalDecisions.compBaixa > 0 ? Math.round(globalDecisions.compBaixa * 0.65) : 0,
        Outras: globalDecisions.compBaixa > 0 ? Math.round(globalDecisions.compBaixa * 0.35) : 0,
        total: globalDecisions.compBaixa,
      },
    ];
  }, [globalDecisions]);

  // Ranking data by Participation Action or Subjects
  const rankingData = useMemo(() => {
    const mapped = participations.map(p => {
      const name = p.numero || `Proc #${p.id}`;
      return {
        id: p.id,
        name: name,
        fullTitle: p.title || p.objeto || name,
        meio: p.meioParticipacao || "Consulta Pública",
        contributions: p.totalContributions || 0,
        articles: p.totalArticles || 0,
        taxaAcatamento: p.stats?.taxaAcatamento || 0,
        uniqueParticipants: p.uniqueParticipants || 0,
      };
    });

    if (rankingMetric === "contributions") {
      return mapped.sort((a, b) => b.contributions - a.contributions).slice(0, 8);
    } else if (rankingMetric === "articles") {
      return mapped.sort((a, b) => b.articles - a.articles).slice(0, 8);
    } else {
      return mapped.sort((a, b) => b.taxaAcatamento - a.taxaAcatamento).slice(0, 8);
    }
  }, [participations, rankingMetric]);

  // Filtered Participations List for Table and Timeline
  const filteredParticipations = useMemo(() => {
    return participations.filter(p => {
      // Search text
      if (timelineSearchText.trim()) {
        const query = timelineSearchText.toLowerCase();
        const numMatch = (p.numero || "").toLowerCase().includes(query);
        const titleMatch = (p.title || "").toLowerCase().includes(query);
        const objMatch = (p.objeto || "").toLowerCase().includes(query);
        if (!numMatch && !titleMatch && !objMatch) return false;
      }

      // Meio filter
      if (timelineMeioFilter && p.meioParticipacao !== timelineMeioFilter) {
        return false;
      }

      // Status filter
      if (timelineStatusFilter) {
        const st = getParticipationStatus(p).label;
        if (st !== timelineStatusFilter) return false;
      }

      // Year filter
      if (timelineYearFilter) {
        const yr = String(getParticipationYear(p));
        if (yr !== timelineYearFilter) return false;
      }

      // Tipo filter
      if (timelineTipoFilter && p.tipoResolucao !== timelineTipoFilter) {
        return false;
      }

      return true;
    });
  }, [
    participations,
    timelineSearchText,
    timelineMeioFilter,
    timelineStatusFilter,
    timelineYearFilter,
    timelineTipoFilter,
  ]);

  // Sort filtered items for table
  const sortedFilteredParticipations = useMemo(() => {
    return [...filteredParticipations].sort((a: any, b: any) => {
      if (!tableSort) return 0;
      let aVal = a[tableSort.field];
      let bVal = b[tableSort.field];

      if (tableSort.field === "stats.taxaAcatamento") {
        aVal = a.stats?.taxaAcatamento || 0;
        bVal = b.stats?.taxaAcatamento || 0;
      } else if (tableSort.field === "stats.acatadas") {
        aVal = a.stats?.acatadas || 0;
        bVal = b.stats?.acatadas || 0;
      } else if (tableSort.field === "dataInicio") {
        const dateA = aVal ? new Date(aVal) : new Date(0);
        const dateB = bVal ? new Date(bVal) : new Date(0);
        return tableSort.dir === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return tableSort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return tableSort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredParticipations, tableSort]);

  // Distinct Years for Filter
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    participations.forEach(p => set.add(getParticipationYear(p)));
    return Array.from(set).sort((a, b) => b - a);
  }, [participations]);

  // Distinct Meios for Filter
  const availableMeios = useMemo(() => {
    const set = new Set<string>();
    participations.forEach(p => {
      if (p.meioParticipacao) set.add(p.meioParticipacao);
    });
    return Array.from(set);
  }, [participations]);

  const toggleRowExpand = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportCSV = () => {
    if (participations.length === 0) return;
    const headers = [
      "Número",
      "Meio de Participação",
      "Tipo",
      "Título / Objeto",
      "Data Início",
      "Data Fim",
      "Status",
      "Dispositivos",
      "Contribuições",
      "Acatadas",
      "Acatadas Parciais",
      "Não Acatadas",
      "Prejudicadas",
      "Retidas",
      "Em Análise",
      "Taxa de Acatamento (%)",
      "Participantes Únicos",
    ];

    const rows = filteredParticipations.map(p => {
      const st = getParticipationStatus(p).label;
      return [
        `"${p.numero || ""}"`,
        `"${p.meioParticipacao || ""}"`,
        `"${p.tipoResolucao === "alteracao" ? "Revisão/Alteração" : "Nova Norma"}"`,
        `"${(p.title || p.objeto || "").replace(/"/g, '""')}"`,
        `"${p.dataInicio || ""}"`,
        `"${p.dataFim || ""}"`,
        `"${st}"`,
        p.totalArticles || 0,
        p.totalContributions || 0,
        p.stats?.acatadas || 0,
        p.stats?.acatadasParciais || 0,
        p.stats?.naoAcatadas || 0,
        p.stats?.prejudicadas || 0,
        p.stats?.retidas || 0,
        p.stats?.emAnalise || 0,
        p.stats?.taxaAcatamento || 0,
        p.uniqueParticipants || 0,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `painel_participacao_social_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showToast) {
      showToast("Relatório Exportado", "O arquivo CSV do painel foi baixado com sucesso.", "success");
    }
  };

  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value || value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#475569"
        textAnchor="middle"
        fontSize={10}
        fontWeight={700}
      >
        {value}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm mt-8 w-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-adasa-mid border-t-transparent rounded-full animate-spin mb-4"></div>
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Estruturando Métricas Gerenciais...</h4>
        <p className="text-xs text-slate-400 mt-1">Carregando painel estratégico de participação social.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 text-left flex flex-col gap-6">
      {/* Header Element */}
      <div className="bg-adasa-dark rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 font-bold">
          <span className="text-[10px] bg-sky-500/20 text-sky-200 border border-sky-400/30 px-3 py-1 rounded-full font-black uppercase tracking-widest leading-none mb-3 inline-block">
            Mapeamento & Monitoramento Regulatório • Participação Social
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Painel Participação Social
          </h2>
          <p className="text-xs text-sky-150 font-medium mt-1.5">
            Acompanhamento Gerencial de Consultas Públicas, Tomadas de Subsídios e Audiências • ADASA
          </p>
        </div>
        <div className="relative z-10 shrink-0 flex items-center gap-2 self-start md:self-center">
          <button
            onClick={fetchData}
            title="Atualizar dados"
            disabled={isRefreshing}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-adasa-light" : ""} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all text-white border border-white/25 rounded-2xl text-xs font-bold shadow-sm cursor-pointer select-none"
          >
            <Download size={14} className="text-adasa-light" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}${window.location.pathname}?public=reg_subsidios_painel`;
              navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                  if (showToast) {
                    showToast("Link Copiado!", "O link de acesso público do Painel de Participação Social foi copiado.", "success");
                  }
                })
                .catch(() => {
                  alert(`Link do painel: ${shareUrl}`);
                });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-adasa-light hover:bg-sky-400 active:bg-sky-500 transition-all text-slate-950 font-black rounded-2xl text-xs shadow-md cursor-pointer select-none"
          >
            <Share2 size={14} />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {/* Box de Destaque Superior: Total de Processos */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:translate-y-[-2px] transition-all">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-50 rounded-2xl text-adasa-dark border border-sky-100">
            <MessageSquare size={32} />
          </div>
          <div>
            <span className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Total de Ações de Participação Social
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl md:text-5xl font-black leading-none text-slate-800">{totalCount}</span>
              <span className="text-xs font-bold text-slate-500">processos cadastrados</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-600 flex-wrap">
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                {statusCounts.abertas} em andamento
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                {statusCounts.encerradas} encerradas
              </span>
              {statusCounts.futuras > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                    {statusCounts.futuras} previstas
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold tracking-wide">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-slate-700">Base Integrada de Contribuições</span>
          </div>
          {onTabChange && (
            <button
              onClick={() => onTabChange("reg_subsidios")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-adasa-dark text-white hover:bg-slate-800 transition-all rounded-xl text-xs font-bold cursor-pointer"
            >
              <span>Gerenciar Participações</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row (Grid 4 colunas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Dispositivos Normativos */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-adasa-dark">
            <Layers size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Dispositivos Normativos
            </span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{totalArticles}</span>
            <span className="block text-[10px] text-adasa-mid font-semibold mt-0.5">
              Artigos e itens sob consulta
            </span>
          </div>
        </div>

        {/* KPI 2: Contribuições Recebidas */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Manifestações da Sociedade
            </span>
            <span className="text-2xl font-black text-slate-800 leading-tight">{totalContributions}</span>
            <span className="block text-[10px] text-blue-600 font-semibold mt-0.5">
              {uniqueParticipantsTotal > 0 ? `${uniqueParticipantsTotal} participantes únicos` : "Contribuições registradas"}
            </span>
          </div>
        </div>

        {/* KPI 3: Taxa de Acatamento */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100/60 rounded-xl text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Taxa Geral de Acatamento
            </span>
            <span className="text-2xl font-black text-slate-800 leading-tight">
              {globalDecisions.taxaAcatamentoGlobal.toFixed(1)}%
            </span>
            <span className="block text-[10px] text-emerald-600 font-semibold mt-0.5">
              {globalDecisions.totalAcatadasGeral} contribuições acolhidas
            </span>
          </div>
        </div>

        {/* KPI 4: Conclusão dos Pareceres */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-4">
          <div className="p-3 bg-amber-50 border border-amber-100/60 rounded-xl text-amber-600">
            <Activity size={22} />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Conclusão da Análise Técnica
            </span>
            <span className="text-2xl font-black text-slate-800 leading-tight">
              {globalDecisions.taxaConclusaoGlobal.toFixed(1)}%
            </span>
            <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">
              {globalDecisions.emAnalise > 0 ? `${globalDecisions.emAnalise} pendentes de parecer` : "Todos os pareceres emitidos"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Processos e Contribuições por Ano */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          <div className="mb-2">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Ações de Participação Social por Ano e Contribuições Acumuladas
            </h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Evolução anual de processos abertos e volume acumulado de contribuições recebidas da sociedade.
            </p>
          </div>

          {/* Custom Legend */}
          <div className="flex justify-center items-center gap-6 mb-4 text-xs font-bold text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0091DA]"></span>
              <span>Processos Anuais</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#1A3E8A]"></span>
              <span>Contribuições Acumuladas</span>
            </div>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearAccumulatedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  allowDecimals={false}
                  label={{
                    value: "Processos (n)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 0,
                    style: { fontSize: "10px", fill: "#475569", fontWeight: "bold" },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={11}
                  fontWeight={600}
                  allowDecimals={false}
                  label={{
                    value: "Contribuições Acum. (n)",
                    angle: 90,
                    position: "insideRight",
                    offset: 0,
                    style: { fontSize: "10px", fill: "#475569", fontWeight: "bold" },
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                  itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                />
                <Bar yAxisId="left" dataKey="count" fill="#0091DA" radius={[4, 4, 0, 0]} name="Processos" barSize={24}>
                  <LabelList dataKey="count" content={renderCustomBarLabel} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accumulated"
                  stroke="#1A3E8A"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: "#1A3E8A", fill: "#fff" }}
                  activeDot={{ r: 6 }}
                  name="Contribuições Acumuladas"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Decisões Técnicas das Contribuições */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Decisões Técnicas das Contribuições
            </h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Distribuição percentual dos pareceres emitidos pela área técnica sobre as contribuições.
            </p>
          </div>

          <div className="h-64 mt-2 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="h-full w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={decisionPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" stroke="#fff" strokeWidth={2}>
                    {decisionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-2.5 justify-center text-left w-full sm:w-1/2">
              {decisionPieData.map((item, index) => {
                const pct = totalContributions > 0 ? ((item.value / totalContributions) * 100).toFixed(1) : "0";
                return (
                  <div key={index} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full block shrink-0" style={{ backgroundColor: item.color }}></span>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-700 truncate">{item.name}</span>
                      <span className="block text-[10px] font-semibold text-slate-400">
                        {item.value} ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Meio de Participação Social */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Processos por Meio de Participação
            </h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Proporção de consultas públicas, tomadas de subsídios e audiências no acervo da agência.
            </p>
          </div>

          <div className="h-64 mt-2 flex flex-col sm:flex-row items-center justify-around gap-4">
            <div className="h-full w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={meioPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" stroke="#fff" strokeWidth={2}>
                    {meioPieData.map((entry, index) => (
                      <Cell key={`cell-m-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                    itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col gap-3 justify-center text-left w-full sm:w-1/2">
              {meioPieData.map((item, index) => {
                const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : "0";
                return (
                  <div key={index} className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full block shrink-0" style={{ backgroundColor: item.color }}></span>
                    <div>
                      <span className="block text-xs font-bold text-slate-700">{item.name}</span>
                      <span className="block text-[10px] font-semibold text-slate-400">
                        {item.value} Processos ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 4: Ranking de Participação Social */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Ranking de Ações de Participação Social
              </h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Processos com maior engajamento social, densidade de dispositivos ou taxas de acatamento.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric selector */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setRankingMetric("contributions")}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                    rankingMetric === "contributions" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Contribuições
                </button>
                <button
                  onClick={() => setRankingMetric("articles")}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                    rankingMetric === "articles" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Dispositivos
                </button>
                <button
                  onClick={() => setRankingMetric("acatamento")}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                    rankingMetric === "acatamento" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  % Acatamento
                </button>
              </div>

              {/* View mode toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setRankingViewMode("chart")}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                    rankingViewMode === "chart" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Gráfico
                </button>
                <button
                  onClick={() => setRankingViewMode("bento")}
                  className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${
                    rankingViewMode === "bento" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Scorecards
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2">
            {rankingViewMode === "chart" ? (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ top: 10, right: 30, left: 90, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} fontWeight={600} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={10}
                      width={80}
                      fontWeight={700}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                      itemStyle={{ color: "#38bdf8", fontSize: "11px", fontWeight: "bold" }}
                      labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fff" }}
                    />
                    <Bar
                      dataKey={rankingMetric === "contributions" ? "contributions" : rankingMetric === "articles" ? "articles" : "taxaAcatamento"}
                      fill="#0091DA"
                      radius={[0, 8, 8, 0]}
                      name={rankingMetric === "contributions" ? "Contribuições (n)" : rankingMetric === "articles" ? "Dispositivos (n)" : "% Acatamento"}
                      barSize={18}
                    >
                      {rankingData.map((entry, index) => (
                        <Cell
                          key={`cell-rk-${index}`}
                          fill={index === 0 ? "#1A3E8A" : index < 3 ? "#0091DA" : "#45C4F6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-2.5">
                {rankingData.map((item, index) => {
                  const maxVal =
                    rankingMetric === "contributions"
                      ? rankingData[0]?.contributions || 1
                      : rankingMetric === "articles"
                      ? rankingData[0]?.articles || 1
                      : 100;
                  const currentVal =
                    rankingMetric === "contributions"
                      ? item.contributions
                      : rankingMetric === "articles"
                      ? item.articles
                      : item.taxaAcatamento;
                  const pctOfMax = (currentVal / (maxVal || 1)) * 100;

                  const rankColor =
                    index === 0
                      ? "bg-adasa-dark text-white"
                      : index === 1
                      ? "bg-adasa-mid text-white"
                      : index === 2
                      ? "bg-adasa-light text-white"
                      : "bg-slate-100 text-slate-600";
                  const barColor = index === 0 ? "bg-adasa-dark" : index < 3 ? "bg-adasa-mid" : "bg-[#93c5fd]";

                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className={`w-7 h-7 flex items-center justify-center font-extrabold text-[11px] rounded-lg shrink-0 ${rankColor}`}>
                        {index + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-800 truncate mr-2" title={item.fullTitle}>
                            <span className="text-adasa-dark font-black">{item.name}</span> • {item.fullTitle}
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 shrink-0">
                            {rankingMetric === "contributions" && `${item.contributions} contribuições`}
                            {rankingMetric === "articles" && `${item.articles} dispositivos`}
                            {rankingMetric === "acatamento" && `${item.taxaAcatamento.toFixed(1)}% acatamento`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pctOfMax}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section: Acompanhamento Detalhado de Processos (Tabela e Linha do Tempo) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm lg:col-span-2">
          {/* Header da Seção */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-adasa-dark">
                <History size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  Acompanhamento Detalhado de Processos de Participação Social
                </h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Consolidação analítica de todas as consultas e tomadas com indicadores de participação e decisões.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setTimelineViewMode("table")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    timelineViewMode === "table" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Tabela Gerencial
                </button>
                <button
                  onClick={() => setTimelineViewMode("timeline")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    timelineViewMode === "timeline" ? "bg-white text-adasa-dark shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Linha do Tempo
                </button>
              </div>
            </div>
          </div>

          {/* Filtros em Linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            {/* Busca Textual */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Buscar por número, título, objeto..."
                value={timelineSearchText}
                onChange={e => setTimelineSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-semibold text-slate-700"
              />
            </div>

            {/* Filtro por Meio */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Filter size={14} />
              </span>
              <select
                value={timelineMeioFilter}
                onChange={e => setTimelineMeioFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-bold text-slate-600 appearance-none cursor-pointer"
              >
                <option value="">Todos os Meios</option>
                {availableMeios.map((m, idx) => (
                  <option key={idx} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Status do Prazo */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Filter size={14} />
              </span>
              <select
                value={timelineStatusFilter}
                onChange={e => setTimelineStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-bold text-slate-600 appearance-none cursor-pointer"
              >
                <option value="">Todas as Situações</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Encerrada">Encerrada</option>
                <option value="Prevista / Futura">Prevista / Futura</option>
              </select>
            </div>

            {/* Filtro por Ano */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Calendar size={14} />
              </span>
              <select
                value={timelineYearFilter}
                onChange={e => setTimelineYearFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-adasa-mid focus:border-adasa-mid font-bold text-slate-600 appearance-none cursor-pointer"
              >
                <option value="">Todos os Anos</option>
                {availableYears.map(yr => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visualização: Tabela Gerencial */}
          {timelineViewMode === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="p-3 w-10 text-center"></th>
                    <th
                      className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                      onClick={() =>
                        setTableSort(prev => ({
                          field: "numero",
                          dir: prev.field === "numero" && prev.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Identificação</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">Meio / Tipo</th>
                    <th className="p-3 min-w-[220px]">Título / Objeto</th>
                    <th
                      className="p-3 cursor-pointer hover:bg-slate-200/60 transition-colors"
                      onClick={() =>
                        setTableSort(prev => ({
                          field: "dataInicio",
                          dir: prev.field === "dataInicio" && prev.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Período</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3 text-center">Situação</th>
                    <th className="p-3 text-center">Dispositivos</th>
                    <th className="p-3 text-center">Contribuições</th>
                    <th
                      className="p-3 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
                      onClick={() =>
                        setTableSort(prev => ({
                          field: "stats.taxaAcatamento",
                          dir: prev.field === "stats.taxaAcatamento" && prev.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>% Acatamento</span>
                        <ArrowUpDown size={12} className="text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sortedFilteredParticipations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                        Nenhuma ação de participação social encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredParticipations.map(p => {
                      const isExpanded = !!expandedRows[p.id];
                      const status = getParticipationStatus(p);
                      const rawSubjects = p.subjects;
                      let parsedSubjects: SubjectItem[] = [];
                      if (Array.isArray(rawSubjects)) {
                        parsedSubjects = rawSubjects;
                      } else if (typeof rawSubjects === "string") {
                        try {
                          parsedSubjects = JSON.parse(rawSubjects);
                        } catch {
                          parsedSubjects = [];
                        }
                      }

                      return (
                        <React.Fragment key={p.id}>
                          <tr className="hover:bg-sky-50/40 transition-colors group font-medium">
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleRowExpand(p.id)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            </td>
                            <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-black">
                                {p.numero || `Proc #${p.id}`}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-700">{p.meioParticipacao}</span>
                                <span className="text-[10px] text-slate-400">
                                  {p.tipoResolucao === "alteracao" ? "Revisão Normativa" : "Nova Norma"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 line-clamp-1">{p.title || "Sem título informado"}</div>
                              {p.objeto && <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.objeto}</div>}
                            </td>
                            <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                              {p.dataInicio ? (
                                <div className="flex flex-col">
                                  <span>Início: {p.dataInicio.split("-").reverse().join("/")}</span>
                                  {p.dataFim && <span>Fim: {p.dataFim.split("-").reverse().join("/")}</span>}
                                </div>
                              ) : (
                                <span className="text-slate-400">Não informado</span>
                              )}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${status.color}`}
                              >
                                {status.label}
                              </span>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-700">{p.totalArticles}</td>
                            <td className="p-3 text-center">
                              <span className="font-black text-slate-800">{p.totalContributions}</span>
                              {p.uniqueParticipants > 0 && (
                                <span className="block text-[10px] text-slate-400 font-semibold">
                                  ({p.uniqueParticipants} autores)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`font-black text-xs px-2 py-0.5 rounded ${
                                  p.stats.taxaAcatamento >= 50
                                    ? "bg-emerald-50 text-emerald-700"
                                    : p.stats.taxaAcatamento > 0
                                    ? "bg-sky-50 text-sky-700"
                                    : "bg-slate-50 text-slate-500"
                                }`}
                              >
                                {p.stats.taxaAcatamento.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {onNavigateToParticipation ? (
                                <button
                                  onClick={() => onNavigateToParticipation(p.id)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-adasa-dark hover:text-white transition-all rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink size={11} />
                                </button>
                              ) : onTabChange ? (
                                <button
                                  onClick={() => onTabChange("reg_subsidios")}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-adasa-dark hover:text-white transition-all rounded-lg text-[11px] font-bold text-slate-700 border border-slate-200 cursor-pointer inline-flex items-center gap-1"
                                >
                                  <span>Ver</span>
                                  <ExternalLink size={11} />
                                </button>
                              ) : null}
                            </td>
                          </tr>

                          {/* Linha Expansível de Detalhes Gerenciais */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 border-b border-slate-200">
                              <td colSpan={10} className="p-4 md:p-6 text-left">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                  {/* Resumo do Objeto e Metadados */}
                                  <div className="space-y-3">
                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                      <FileText size={14} className="text-adasa-mid" /> Objeto da Participação Social
                                    </h5>
                                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      {p.objeto || p.title || "Nenhum detalhe adicional informado para este processo."}
                                    </p>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                                      <span>Cadastrado em: {p.createdAt || "N/A"}</span>
                                    </div>
                                  </div>

                                  {/* Breakdown das Decisões */}
                                  <div className="space-y-3">
                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                      <FileCheck2 size={14} className="text-emerald-600" /> Detalhamento dos Pareceres
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                                        <span className="block text-[10px] font-bold text-emerald-800">Acatadas</span>
                                        <span className="text-base font-black text-emerald-700">{p.stats.acatadas}</span>
                                      </div>
                                      <div className="p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl">
                                        <span className="block text-[10px] font-bold text-sky-800">Parcialmente</span>
                                        <span className="text-base font-black text-sky-700">{p.stats.acatadasParciais}</span>
                                      </div>
                                      <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-xl">
                                        <span className="block text-[10px] font-bold text-rose-800">Não Acatadas</span>
                                        <span className="text-base font-black text-rose-700">{p.stats.naoAcatadas}</span>
                                      </div>
                                      <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl">
                                        <span className="block text-[10px] font-bold text-amber-800">Prejudicadas/Retidas</span>
                                        <span className="text-base font-black text-amber-700">
                                          {p.stats.prejudicadas + p.stats.retidas}
                                        </span>
                                      </div>
                                    </div>
                                    {p.stats.emAnalise > 0 && (
                                      <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                        <Clock size={12} /> {p.stats.emAnalise} contribuições pendentes de análise técnica.
                                      </div>
                                    )}
                                  </div>

                                  {/* Estrutura de Assuntos e Temas */}
                                  <div className="space-y-3">
                                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                      <Tag size={14} className="text-adasa-dark" /> Estrutura Temática / Assuntos
                                    </h5>
                                    {parsedSubjects.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        {parsedSubjects.map((sub, sIdx) => (
                                          <span
                                            key={sIdx}
                                            className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[10px] font-bold shadow-2xs"
                                          >
                                            {sub.name}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        Nenhum assunto ou estrutura temática vinculada a esta participação.
                                      </div>
                                    )}
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
          ) : (
            /* Visualização: Linha do Tempo (Timeline) */
            <div className="space-y-6 mt-4">
              {availableYears.map(year => {
                const yearItems = sortedFilteredParticipations.filter(p => getParticipationYear(p) === year);
                if (yearItems.length === 0) return null;
                const isExpanded = expandedYears[year] !== false;

                return (
                  <div key={year} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4">
                    <button
                      onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !isExpanded }))}
                      className="w-full flex items-center justify-between font-black text-sm text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-adasa-mid"></span>
                        <span>Ano de {year}</span>
                        <span className="text-xs font-bold text-slate-400 normal-case">
                          ({yearItems.length} {yearItems.length === 1 ? "processo" : "processos"})
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {yearItems.map(p => {
                          const status = getParticipationStatus(p);
                          return (
                            <div
                              key={p.id}
                              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-adasa-mid transition-all text-left flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-black rounded text-xs border border-slate-200">
                                    {p.numero || `Proc #${p.id}`}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.color}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>
                                <h6 className="font-bold text-slate-800 text-xs line-clamp-2">{p.title || p.objeto}</h6>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{p.objeto}</p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3 text-slate-600 font-bold">
                                  <span>{p.totalArticles} dispositivos</span>
                                  <span>•</span>
                                  <span>{p.totalContributions} contribuições</span>
                                </div>
                                <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                                  {p.stats.taxaAcatamento.toFixed(1)}% acatamento
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
