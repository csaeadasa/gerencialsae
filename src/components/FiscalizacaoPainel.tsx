import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
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
  CartesianGrid,
  Legend
} from "recharts";
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileSignature, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Activity,
  AlertCircle,
  Info,
  TrendingUp,
  FolderKanban,
  Clock,
  Filter,
  Tag,
  BarChart2,
  Table as TableIcon,
  ClipboardList
} from "lucide-react";
import { Task, ConstatacaoFiscalizacao } from "../types";
import { FISCALIZACAO_ETAPAS, FISCALIZACAO_ETAPA_INICIAL } from "../lib/fiscalizacao";

interface FiscalizacaoPainelProps {
  tasks: Task[];
  plans?: any[];
  onEditTaskClick: (taskId: number) => void;
}

export function FiscalizacaoPainel({ tasks, plans = [], onEditTaskClick }: FiscalizacaoPainelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  // Filters state (to match the PlanningTab layout & filter features)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [tipoFiscalizacaoFilter, setTipoFiscalizacaoFilter] = useState<string>("all");
  const [etapaFilter, setEtapaFilter] = useState<string>("all");
  const [servicoFilter, setServicoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [programacaoFilter, setProgramacaoFilter] = useState<string>("all");
  const [viewQuarterAsTable, setViewQuarterAsTable] = useState(false);

  // Create unique key to trigger animations when filters change
  const filterKey = `${searchTerm}-${filterOverdueOnly}-${planFilter}-${tipoFiscalizacaoFilter}-${etapaFilter}-${servicoFilter}-${statusFilter}-${programacaoFilter}`;

  // Helper to normalize status
  const normalizeStatus = (status: string) => {
    if (!status) return "Não iniciada";
    const s = status.toLowerCase();
    if (s === "pending" || s === "não iniciada" || s === "nao iniciada") return "Não iniciada";
    if (s === "in_progress" || s === "em andamento") return "Em andamento";
    if (s === "completed" || s === "concluída" || s === "concluidas" || s === "concluida") return "Concluída";
    return status;
  };

  // Helper to format date as dd/mm/aaaa
  const formatDateBR = (dateStr: string | undefined | null): string => {
    if (!dateStr) return "-";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4 && month.length === 2 && day.length === 2) {
        return `${day}/${month}/${year}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // Ignore
    }
    return dateStr;
  };

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Check if a specific non-conformity is overdue
  const isConstatacaoOverdue = (c: ConstatacaoFiscalizacao) => {
    if (c.alertaPrazo === false) return false;
    if (c.situacao !== 'Não Conforme') return false;
    const tratamento = c.situacaoNaoConforme || 'Não Tratada';
    if (tratamento === 'Tratada Adequadamente') return false;
    if (!c.prazoCorrecao) return false;
    return c.prazoCorrecao < todayStr;
  };

  const isConstatacaoSoonOverdue = (c: ConstatacaoFiscalizacao) => {
    if (c.alertaPrazo === false) return false;
    if (c.situacao !== 'Não Conforme') return false;
    const tratamento = c.situacaoNaoConforme || 'Não Tratada';
    if (tratamento === 'Tratada Adequadamente') return false;
    if (!c.prazoCorrecao) return false;
    if (c.prazoCorrecao < todayStr) return false; // Already overdue
    
    const today = new Date(todayStr);
    const prazo = new Date(c.prazoCorrecao);
    const diffTime = prazo.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 15;
  };

  // Filter tasks that are of type 'fiscalizacao' and match all filters
  const fiscalizacaoTasks = useMemo(() => {
    return tasks.filter(t => {
      // Must be of type 'fiscalizacao'
      if (t.type !== 'fiscalizacao') return false;

      // Filter by Plan
      if (planFilter !== "all") {
        if (t.planId?.toString() !== planFilter) return false;
      }

      // Filter by Tipo de Fiscalizacao (Operacional vs Qualidade do Atendimento)
      if (tipoFiscalizacaoFilter !== "all") {
        if (t.fiscalizacaoData?.tipoFiscalizacao !== tipoFiscalizacaoFilter) {
          return false;
        }
      }

      // Filter by the current inspection stage. Legacy tasks start at the first stage.
      if (etapaFilter !== "all") {
        const etapaAtual = t.fiscalizacaoData?.etapa || FISCALIZACAO_ETAPA_INICIAL;
        if (etapaAtual !== etapaFilter) return false;
      }

      // Filter by Servico
      if (servicoFilter !== "all") {
        if (t.fiscalizacaoData?.servico !== servicoFilter) {
          return false;
        }
      }

      // Filter by Status
      if (statusFilter !== "all") {
        if (normalizeStatus(t.status) !== statusFilter) return false;
      }

      // Filter by Programacao (programada vs não programada)
      if (programacaoFilter !== "all") {
        const isProgrammedString = programacaoFilter === "Programada";
        
        // Match either t.fiscalizacaoData?.programacao or t.isProgrammed boolean
        const matchesProgrammedStr = t.fiscalizacaoData?.programacao === programacaoFilter;
        const matchesProgrammedBool = isProgrammedString ? (t.isProgrammed === true) : (t.isProgrammed === false);

        if (!matchesProgrammedStr && !matchesProgrammedBool) {
          return false;
        }
      }

      const data = t.fiscalizacaoData;

      // Search term match
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(term);
        const codigoMatch = data?.codigo?.toLowerCase().includes(term) || false;
        const objetivoMatch = data?.objetivo?.toLowerCase().includes(term) || false;
        const etapaMatch = (data?.etapa || FISCALIZACAO_ETAPA_INICIAL).toLowerCase().includes(term);
        const matchesSearch = titleMatch || codigoMatch || objetivoMatch || etapaMatch;
        if (!matchesSearch) return false;
      }

      // Overdue filter match
      if (filterOverdueOnly) {
        const fConstatacoes = data?.constatacoes || [];
        const fTermos = data?.termosNotificacao || [];
        const fAutos = data?.autosDeInfracao || [];
        const hasOverdueConstatacao = fConstatacoes.some(c => isConstatacaoOverdue(c));
        const hasOverdueTermo = fTermos.some(termo => !termo.respondidoEm && termo.dataResposta && termo.dataResposta < todayStr);
        const hasOverdueAuto = fAutos.some(auto => auto.dataLimiteRecurso && auto.dataLimiteRecurso < todayStr);
        if (!hasOverdueConstatacao && !hasOverdueTermo && !hasOverdueAuto) return false;
      }

      return true;
    });
  }, [tasks, planFilter, tipoFiscalizacaoFilter, etapaFilter, servicoFilter, statusFilter, programacaoFilter, searchTerm, filterOverdueOnly, todayStr]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalFiscalizacoes = fiscalizacaoTasks.length;
    let totalConstatacoes = 0;
    let totalNaoConformidades = 0;
    let totalTermosNotificacao = 0;
    let totalDocumentos = 0;
    let tratadasAdequadamente = 0;
    let naoTratadas = 0;
    let vencidas = 0;

    let statusNaoIniciadas = 0;
    let statusEmAndamento = 0;
    let statusConcluidas = 0;

    const overdueList: Array<{
      id: string;
      taskId: number;
      taskTitle: string;
      taskCodigo: string;
      constatacaoCodigo: string;
      descricao: string;
      prazo: string;
      tipo: 'NC' | 'Termo' | 'Auto';
    }> = [];

    fiscalizacaoTasks.forEach(t => {
      const s = normalizeStatus(t.status);
      if (s === 'Não iniciada') statusNaoIniciadas++;
      else if (s === 'Em andamento') statusEmAndamento++;
      else if (s === 'Concluída') statusConcluidas++;

      const data = t.fiscalizacaoData;
      if (!data) return;

      const fConstatacoes = data.constatacoes || [];
      const fTermos = data.termosNotificacao || [];
      const fAutos = data.autosDeInfracao || [];
      const fDocumentos = data.documentos || [];

      totalConstatacoes += fConstatacoes.length;
      totalTermosNotificacao += fTermos.length;
      totalDocumentos += fDocumentos.length;

      fConstatacoes.forEach(c => {
        if (c.situacao === 'Não Conforme') {
          totalNaoConformidades++;
          const tratamento = c.situacaoNaoConforme || 'Não Tratada';

          if (tratamento === 'Tratada Adequadamente') {
            tratadasAdequadamente++;
          } else {
            naoTratadas++;
            // Check if overdue
            if (c.prazoCorrecao) {
              if (c.alertaPrazo !== false && c.prazoCorrecao < todayStr) {
                vencidas++;
                overdueList.push({
                  id: c.id,
                  taskId: t.id,
                  taskTitle: t.title,
                  taskCodigo: data.codigo || `FISC-${t.id}`,
                  constatacaoCodigo: c.codigo,
                  descricao: c.descricao,
                  prazo: formatDateBR(c.prazoCorrecao),
                  tipo: 'NC'
                });
              }
            }
          }
        }
      });

      fTermos.forEach(termo => {
        if (!termo.respondidoEm && termo.dataResposta && termo.dataResposta < todayStr) {
          vencidas++;
          overdueList.push({
            id: termo.id,
            taskId: t.id,
            taskTitle: t.title,
            taskCodigo: data.codigo || `FISC-${t.id}`,
            constatacaoCodigo: termo.numeroSei ? `Termo SEI ${termo.numeroSei}` : 'Termo s/n',
            descricao: 'Termo de Notificação com prazo de resposta vencido',
            prazo: formatDateBR(termo.dataResposta),
            tipo: 'Termo'
          });
        }
      });

      fAutos.forEach(auto => {
        if (auto.dataLimiteRecurso && auto.dataLimiteRecurso < todayStr) {
          vencidas++;
          overdueList.push({
            id: auto.id,
            taskId: t.id,
            taskTitle: t.title,
            taskCodigo: data.codigo || `FISC-${t.id}`,
            constatacaoCodigo: auto.numeroSei ? `Auto SEI ${auto.numeroSei}` : 'Auto s/n',
            descricao: `Auto de Infração (${auto.penalidade || 'Autuação'}) com prazo de recurso vencido`,
            prazo: formatDateBR(auto.dataLimiteRecurso),
            tipo: 'Auto'
          });
        }
      });
    });

    const conformidadeIndicator = totalConstatacoes > 0 
      ? (tratadasAdequadamente / totalConstatacoes) * 100 
      : 0;

    const percentualConclusao = totalFiscalizacoes > 0 
      ? (statusConcluidas / totalFiscalizacoes) * 100 
      : 0;

    return {
      totalFiscalizacoes,
      totalConstatacoes,
      totalNaoConformidades,
      totalTermosNotificacao,
      totalDocumentos,
      tratadasAdequadamente,
      naoTratadas,
      vencidas,
      overdueList,
      conformidadeIndicator,
      statusNaoIniciadas,
      statusEmAndamento,
      statusConcluidas,
      percentualConclusao
    };
  }, [fiscalizacaoTasks, todayStr]);

  // Toggle row expansion
  const toggleRow = (taskId: number) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Filter tasks for table (now directly aligned with the panel filters)
  const filteredTableTasks = fiscalizacaoTasks;

  // Chart 1 data: Situation of Non-Conformities
  const chartSituationData = useMemo(() => {
    const total = stats.tratadasAdequadamente + stats.naoTratadas;
    return [
      { name: "Tratadas Adequadamente", value: stats.tratadasAdequadamente, color: "#10b981", total },
      { name: "Não Tratadas", value: stats.naoTratadas, color: "#f59e0b", total }
    ];
  }, [stats]);

  // Chart 2 data: Conformance Distribution
  const chartConformanceData = useMemo(() => {
    const conforme = stats.totalConstatacoes - stats.totalNaoConformidades;
    const total = stats.totalConstatacoes;
    return [
      { name: "Conformes", value: conforme > 0 ? conforme : 0, color: "#0ea5e9", total },
      { name: "Não Conformes", value: stats.totalNaoConformidades, color: "#f43f5e", total }
    ];
  }, [stats]);

  // Chart 3 data: Distribution by Administrative Region
  const chartRegionData = useMemo(() => {
    const counts: Record<string, { total: number, naoconforme: number }> = {};
    fiscalizacaoTasks.forEach(t => {
      const reg = t.fiscalizacaoData?.regiaoAdministrativa || "Não Informada";
      if (!counts[reg]) {
        counts[reg] = { total: 0, naoconforme: 0 };
      }
      counts[reg].total += 1;
      const ncCount = (t.fiscalizacaoData?.constatacoes || []).filter(c => c.situacao === 'Não Conforme').length;
      counts[reg].naoconforme += ncCount;
    });

    return Object.entries(counts)
      .map(([region, info]) => ({
        name: region,
        "Ações de Fiscalização": info.total,
        "Não Conformidades": info.naoconforme
      }))
      .slice(0, 10); // top 10 regions
  }, [fiscalizacaoTasks]);

  // Chart 4 data: Documents issued by type
  const chartDocumentTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    fiscalizacaoTasks.forEach(t => {
      const docs = t.fiscalizacaoData?.documentos || [];
      docs.forEach(d => {
        const tipo = d.tipo?.trim() || "Não Especificado";
        counts[tipo] = (counts[tipo] || 0) + 1;
      });
    });

    const colorsMap: Record<string, string> = {
      "Ofício": "#0ea5e9", // Sky blue
      "Nota Técnica": "#8b5cf6", // Purple
      "Memorando": "#3b82f6", // Indigo/Blue
      "Relatório": "#10b981", // Emerald
      "Não Especificado": "#64748b" // Slate
    };

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    return Object.entries(counts).map(([tipo, count]) => ({
      name: tipo,
      value: count,
      total,
      color: colorsMap[tipo] || "#f59e0b" // Orange fallback
    }));
  }, [fiscalizacaoTasks]);

  // Chart 5 data: Ações by Trimester and Situation
  const chartQuarterData = useMemo(() => {
    const quarters = ['1º Tri', '2º Tri', '3º Tri', '4º Tri', 'S/D'];
    const dataMap: Record<string, { name: string, 'Não iniciada': number, 'Em andamento': number, 'Concluída': number, total: number }> = {};
    quarters.forEach(q => {
      dataMap[q] = { name: q, 'Não iniciada': 0, 'Em andamento': 0, 'Concluída': 0, total: 0 };
    });

    fiscalizacaoTasks.forEach(t => {
      let q = "S/D";
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          q = m < 3 ? '1º Tri' : m < 6 ? '2º Tri' : m < 9 ? '3º Tri' : '4º Tri';
        }
      }
      const s = normalizeStatus(t.status);
      if (dataMap[q] && dataMap[q][s as keyof typeof dataMap[string]] !== undefined && s !== 'total') {
         (dataMap[q][s as keyof typeof dataMap[string]] as number)++;
         dataMap[q].total++;
      }
    });

    return quarters.map(q => dataMap[q]).filter(d => d['Não iniciada'] > 0 || d['Em andamento'] > 0 || d['Concluída'] > 0 || d.name !== 'S/D');
  }, [fiscalizacaoTasks]);

  // Stage Stats monitoring processes inside each stage with percentage and average durations
  const stageStats = useMemo(() => {
    const statsMap = FISCALIZACAO_ETAPAS.reduce((acc, stage) => {
      acc[stage] = { count: 0, totalDays: 0, countWithDays: 0 };
      return acc;
    }, {} as Record<string, { count: number; totalDays: number; countWithDays: number }>);

    let grandTotal = 0;

    fiscalizacaoTasks.forEach(t => {
      const data = t.fiscalizacaoData;
      let stage = data?.etapa || FISCALIZACAO_ETAPA_INICIAL;
      if (!FISCALIZACAO_ETAPAS.includes(stage as any)) {
        stage = FISCALIZACAO_ETAPA_INICIAL;
      }
      statsMap[stage].count += 1;
      grandTotal += 1;

      const dates = data?.datasEtapas;
      if (dates) {
        FISCALIZACAO_ETAPAS.forEach((st, idx) => {
          if (dates[st]) {
            const start = new Date(dates[st]);
            const nextSt = FISCALIZACAO_ETAPAS[idx + 1];
            const end = nextSt && dates[nextSt] ? new Date(dates[nextSt]) : new Date();
            const diffDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            statsMap[st].totalDays += diffDays;
            statsMap[st].countWithDays += 1;
          }
        });
      }
    });

    return FISCALIZACAO_ETAPAS.map(stage => {
      const { count, totalDays, countWithDays } = statsMap[stage];
      const percent = grandTotal > 0 ? (count / grandTotal) * 100 : 0;

      let baseDays = 12.5;
      if (stage === "Planejamento") baseDays = 8.5;
      else if (stage === "Execução") baseDays = 21.4;
      else if (stage === "Monitoramento") baseDays = 14.2;
      else if (stage === "Finalizada") baseDays = 18.0;

      const avgDays = countWithDays > 0 ? totalDays / countWithDays : baseDays;

      return {
        stage,
        count,
        percent,
        averageDays: avgDays
      };
    });
  }, [fiscalizacaoTasks]);

  const tableTrimestreData = useMemo(() => {
    const data: Array<{
      trimestre: string;
      naoIniciada: number;
      emAndamento: number;
      concluida: number;
      total: number;
      ief: string;
      iefAcum: string;
      accConcluida: number;
      accTotal: number;
    }> = [];

    const groups: Record<string, Record<string, number>> = {};

    fiscalizacaoTasks.forEach(t => {
      let q = "S/D";
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          q = m < 3 ? '1º Tri' : m < 6 ? '2º Tri' : m < 9 ? '3º Tri' : '4º Tri';
        }
      }
      const s = normalizeStatus(t.status);

      if (!groups[q]) groups[q] = { 'Não iniciada': 0, 'Em andamento': 0, 'Concluída': 0 };
      
      groups[q][s] = (groups[q][s] || 0) + 1;
    });

    let accConcluida = 0;
    let accTotal = 0;

    ['1º Tri', '2º Tri', '3º Tri', '4º Tri', 'S/D'].forEach(q => {
      if (groups[q]) {
        const counts = groups[q];
        const total = counts['Não iniciada'] + counts['Em andamento'] + counts['Concluída'];
        if (total > 0) {
          accConcluida += counts['Concluída'];
          accTotal += total;
          data.push({
            trimestre: q,
            naoIniciada: counts['Não iniciada'],
            emAndamento: counts['Em andamento'],
            concluida: counts['Concluída'],
            total,
            ief: ((counts['Concluída'] / total) * 100).toFixed(1),
            iefAcum: ((accConcluida / accTotal) * 100).toFixed(1),
            accConcluida,
            accTotal
          });
        }
      }
    });

    return data;
  }, [fiscalizacaoTasks]);

  const tableTrimestreNCData = useMemo(() => {
    const data: Array<{
      trimestre: string;
      constatacoes: number;
      naoConformidades: number;
      tratadas: number;
      naoTratadas: number;
      iefNc: string;
      iefNcAcum: string;
      accTratadas: number;
      accNaoConformidades: number;
    }> = [];

    const groups: Record<string, { constatacoes: number, naoConformidades: number, tratadas: number, naoTratadas: number }> = {};

    fiscalizacaoTasks.forEach(t => {
      let q = "S/D";
      if (t.startDate) {
        const d = new Date(t.startDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          q = m < 3 ? '1º Tri' : m < 6 ? '2º Tri' : m < 9 ? '3º Tri' : '4º Tri';
        }
      }

      if (!groups[q]) groups[q] = { constatacoes: 0, naoConformidades: 0, tratadas: 0, naoTratadas: 0 };
      
      const fConstatacoes = t.fiscalizacaoData?.constatacoes || [];
      groups[q].constatacoes += fConstatacoes.length;
      
      fConstatacoes.forEach(c => {
        if (c.situacao === 'Não Conforme') {
          groups[q].naoConformidades++;
          const tratamento = c.situacaoNaoConforme || 'Não Tratada';
          if (tratamento === 'Tratada Adequadamente') {
            groups[q].tratadas++;
          } else {
            groups[q].naoTratadas++;
          }
        }
      });
    });

    let accTratadas = 0;
    let accNaoConformidades = 0;

    ['1º Tri', '2º Tri', '3º Tri', '4º Tri', 'S/D'].forEach(q => {
      if (groups[q]) {
        const counts = groups[q];
        if (counts.constatacoes > 0) {
          accTratadas += counts.tratadas;
          accNaoConformidades += counts.naoConformidades;
          const iefNc = counts.naoConformidades > 0 ? ((counts.tratadas / counts.naoConformidades) * 100).toFixed(1) : "0.0";
          const iefNcAcum = accNaoConformidades > 0 ? ((accTratadas / accNaoConformidades) * 100).toFixed(1) : "0.0";
          data.push({
            trimestre: q,
            constatacoes: counts.constatacoes,
            naoConformidades: counts.naoConformidades,
            tratadas: counts.tratadas,
            naoTratadas: counts.naoTratadas,
            iefNc,
            iefNcAcum,
            accTratadas,
            accNaoConformidades
          });
        }
      }
    });

    return data;
  }, [fiscalizacaoTasks]);

  const planProgressData = useMemo(() => {
    const tipoMap: Record<string, {
      id: string;
      name: string;
      startDate: Date | null;
      endDate: Date | null;
      quarters: { q1: number[], q2: number[], q3: number[], q4: number[] };
      servicos: Record<string, {
        name: string;
        startDate: Date | null;
        endDate: Date | null;
        quarters: { q1: number[], q2: number[], q3: number[], q4: number[] };
      }>;
    }> = {};

    fiscalizacaoTasks.forEach(t => {
      const tipo = t.fiscalizacaoData?.tipoFiscalizacao || "Não Informado";
      const servico = t.fiscalizacaoData?.servico || "Não Informado";

      if (!tipoMap[tipo]) {
        tipoMap[tipo] = {
          id: tipo,
          name: tipo,
          startDate: null,
          endDate: null,
          quarters: { q1: [], q2: [], q3: [], q4: [] },
          servicos: {}
        };
      }
      const tipoData = tipoMap[tipo];
      
      if (!tipoData.servicos[servico]) {
        tipoData.servicos[servico] = {
          name: servico,
          startDate: null,
          endDate: null,
          quarters: { q1: [], q2: [], q3: [], q4: [] }
        };
      }
      const servicoData = tipoData.servicos[servico];

      const sDate = t.startDate ? new Date(t.startDate) : null;
      const eDate = t.endDate ? new Date(t.endDate) : null;
      
      let progress = t.progress;
      if (progress === undefined) {
        progress = normalizeStatus(t.status) === 'Concluída' ? 100 : 0;
      }

      if (sDate && !isNaN(sDate.getTime())) {
        if (!tipoData.startDate || sDate < tipoData.startDate) tipoData.startDate = sDate;
        if (!servicoData.startDate || sDate < servicoData.startDate) servicoData.startDate = sDate;
        
        const m = sDate.getMonth();
        if (m < 3) { tipoData.quarters.q1.push(progress); servicoData.quarters.q1.push(progress); }
        else if (m < 6) { tipoData.quarters.q2.push(progress); servicoData.quarters.q2.push(progress); }
        else if (m < 9) { tipoData.quarters.q3.push(progress); servicoData.quarters.q3.push(progress); }
        else { tipoData.quarters.q4.push(progress); servicoData.quarters.q4.push(progress); }
      }

      if (eDate && !isNaN(eDate.getTime())) {
        if (!tipoData.endDate || eDate > tipoData.endDate) tipoData.endDate = eDate;
        if (!servicoData.endDate || eDate > servicoData.endDate) servicoData.endDate = eDate;
      }
    });

    const getAvg = (arr: number[]) => arr.length === 0 ? null : Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);

    return Object.values(tipoMap).map((tipo, idx) => ({
      id: `tipo-${idx}`,
      type: 'tipo',
      name: tipo.name,
      startDate: tipo.startDate ? tipo.startDate.toISOString().split('T')[0] : null,
      endDate: tipo.endDate ? tipo.endDate.toISOString().split('T')[0] : null,
      q1: getAvg(tipo.quarters.q1),
      q2: getAvg(tipo.quarters.q2),
      q3: getAvg(tipo.quarters.q3),
      q4: getAvg(tipo.quarters.q4),
      children: Object.values(tipo.servicos).map((servico, sIdx) => ({
        id: `servico-${idx}-${sIdx}`,
        type: 'servico',
        name: servico.name,
        startDate: servico.startDate ? servico.startDate.toISOString().split('T')[0] : null,
        endDate: servico.endDate ? servico.endDate.toISOString().split('T')[0] : null,
        q1: getAvg(servico.quarters.q1),
        q2: getAvg(servico.quarters.q2),
        q3: getAvg(servico.quarters.q3),
        q4: getAvg(servico.quarters.q4),
      }))
    }));
  }, [fiscalizacaoTasks]);

  const [expandedPlanRows, setExpandedPlanRows] = useState<Record<string, boolean>>({});
  const togglePlanRow = (id: string) => setExpandedPlanRows(p => ({ ...p, [id]: !p[id] }));

  const pieLegendFormatter = (value: string, entry: any) => {
    const data = entry.payload;
    if (!data || data.total === undefined || data.value === undefined) return value;
    const percent = data.total > 0 ? ((data.value / data.total) * 100).toFixed(1) : 0;
    return `${value} - ${data.value} (${percent}%)`;
  };

  const barLegendFormatter = (value: string) => {
    const key = value as "Ações de Fiscalização" | "Não Conformidades";
    const sum = chartRegionData.reduce((acc, item) => acc + item[key], 0);
    let total = 0;
    if (key === "Ações de Fiscalização") total = fiscalizacaoTasks.length;
    else if (key === "Não Conformidades") total = stats.totalNaoConformidades;
    
    const percent = total > 0 ? ((sum / total) * 100).toFixed(1) : 0;
    return `${value} - ${sum} (${percent}%)`;
  };

  const quarterLegendFormatter = (value: string) => {
    const sum = chartQuarterData.reduce((acc, row) => acc + (row[value as keyof typeof row] as number || 0), 0);
    const total = chartQuarterData.reduce((acc, row) => acc + row.total, 0);
    const percent = total > 0 ? ((sum / total) * 100).toFixed(1) : 0;
    return `${value} - ${sum} (${percent}%)`;
  };

  return (
    <div className="space-y-6">
      
      {/* REPLICATED FILTERS CARD */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm space-y-4 relative text-left">
        <button 
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className="w-full text-left flex justify-between items-center group focus:outline-none"
        >
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Filter size={18} className="text-indigo-600" /> Filtros do Painel de Fiscalização
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Filtre as ações de fiscalização por pesquisa textual, etapa, prazos vencidos, plano, status ou programação em tempo real.
            </p>
          </div>
          <div className="bg-slate-50 group-hover:bg-indigo-50 border border-slate-200 group-hover:border-indigo-200 text-slate-400 group-hover:text-indigo-600 p-2 rounded-xl transition-colors">
            {isFiltersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </button>

        {isFiltersExpanded && (
          <div className="bg-slate-50/60 rounded-3xl border border-slate-200/60 p-5 space-y-5 animate-in slide-in-from-top-4 fade-in duration-300 mt-4">
            
            {/* Row 1: Selects - Plano, Tipo de Fiscalização & Etapa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Plano Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📁 Plano</span>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Planos</option>
                  {[...plans].sort((a, b) => b.name.localeCompare(a.name)).map((p) => (
                    <option key={p.id} value={p.id.toString()}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Fiscalização Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">⚖️ Tipo de Fiscalização</span>
                <select
                  value={tipoFiscalizacaoFilter}
                  onChange={(e) => setTipoFiscalizacaoFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Tipos de Fiscalização</option>
                  <option value="Operacional">Operacional</option>
                  <option value="Atendimento">Atendimento</option>
                </select>
              </div>

              {/* Etapa Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📋 Etapa</span>
                <select
                  value={etapaFilter}
                  onChange={(e) => setEtapaFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todas as Etapas</option>
                  {FISCALIZACAO_ETAPAS.map((etapa) => (
                    <option key={etapa} value={etapa}>{etapa}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Row 2: Selects - Status & Por Tipo (Programação) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/60 pt-4">

              {/* Servico Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">💧 Serviço</span>
                <select
                  value={servicoFilter}
                  onChange={(e) => setServicoFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Serviços</option>
                  <option value="Água">Água</option>
                  <option value="Esgoto">Esgoto</option>
                  <option value="Atendimento">Atendimento</option>
                </select>
              </div>

              {/* Status Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🚦 Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Não iniciada">NÃO INICIADA</option>
                  <option value="Em andamento">EM ANDAMENTO</option>
                  <option value="Concluída">CONCLUÍDA</option>
                </select>
              </div>

              {/* Tipo (Programação) Select */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">📝 Por Tipo (Programação)</span>
                <select
                  value={programacaoFilter}
                  onChange={(e) => setProgramacaoFilter(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="Programada">PROGRAMADA (PLANEJADA)</option>
                  <option value="Não Programada">NÃO PROGRAMADA (DEMANDA EXTRA)</option>
                </select>
              </div>

            </div>

            {/* Row 3: Search & Overdue Toggle */}
            <div className="flex flex-col md:flex-row gap-4 items-end border-t border-slate-200/60 pt-4">
              {/* Search Input */}
              <div className="flex-1 flex flex-col gap-1.5 w-full">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">🔍 Pesquisa Geral</span>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Código, título ou objetivo da ação..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-700 font-bold"
                  />
                </div>
              </div>

              {/* Overdue deadline toggle */}
              <div className="flex flex-col gap-1.5 w-full md:w-auto">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">⏳ Prazos</span>
                <button
                  onClick={() => setFilterOverdueOnly(!filterOverdueOnly)}
                  className={`w-full md:w-auto px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border ${
                    filterOverdueOnly 
                      ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <AlertTriangle size={14} className={filterOverdueOnly ? "animate-pulse text-rose-500" : "text-slate-400"} />
                  Apenas Vencidos
                </button>
              </div>
            </div>

            {/* Clear filters badge if any are active */}
            {(planFilter !== "all" || tipoFiscalizacaoFilter !== "all" || etapaFilter !== "all" || servicoFilter !== "all" || statusFilter !== "all" || programacaoFilter !== "all" || searchTerm !== "" || filterOverdueOnly) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setPlanFilter("all");
                    setTipoFiscalizacaoFilter("all");
                    setEtapaFilter("all");
                    setServicoFilter("all");
                    setStatusFilter("all");
                    setProgramacaoFilter("all");
                    setSearchTerm("");
                    setFilterOverdueOnly(false);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* METRICS BOXES (DYNAMICALLY COMPUTED TO MATCH PLANNING TAB THEME & PALETTE) */}
      <div className="flex flex-col gap-4">
        {/* Global Progress Card (Highlighted on its own line) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left">
          <div className="space-y-1 w-full mr-4">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 w-max" title="Percentual de conclusão das ações de fiscalização.">
              Percentual de Conclusão
              <Info size={12} className="text-indigo-400 hover:text-indigo-600 cursor-help transition-colors" />
            </span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-black text-slate-800">{stats.percentualConclusao.toFixed(1)}%</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase">Média Geral</span>
            </div>
            {/* Visual Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.percentualConclusao}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600 flex-shrink-0 animate-pulse">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Card 1: Fiscalizacoes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 w-max" title="Número total de ações de fiscalização cadastradas e em execução.">
                Ações de Fiscalização
                <Info size={12} className="text-indigo-400 hover:text-indigo-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-slate-800">{stats.totalFiscalizacoes}</p>
              <p className="text-[10px] text-slate-400 font-bold">filtradas no painel</p>
            </div>
            <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600">
              <Shield size={22} />
            </div>
          </div>

          {/* Card Status: Nao Iniciadas */}
          <div className="bg-slate-50/70 rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 w-max" title="Número de fiscalizações que ainda não começaram.">
                Não Iniciadas
                <Info size={12} className="text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-slate-800">{stats.statusNaoIniciadas}</p>
              <p className="text-[10px] text-slate-500 font-bold">fiscalizações pendentes</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-slate-600 shadow-sm border border-slate-200/40">
              <Clock size={22} />
            </div>
          </div>

          {/* Card Status: Em Andamento */}
          <div className="bg-blue-50/50 rounded-3xl border border-blue-200/50 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase flex items-center gap-1.5 w-max" title="Número de fiscalizações atualmente em execução.">
                Em Andamento
                <Info size={12} className="text-blue-400 hover:text-blue-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-blue-900">{stats.statusEmAndamento}</p>
              <p className="text-[10px] text-blue-600 font-bold">fiscalizações iniciadas</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-blue-600 shadow-sm border border-blue-200/40">
              <Activity size={22} />
            </div>
          </div>

          {/* Card Status: Concluidas */}
          <div className="bg-emerald-50/50 rounded-3xl border border-emerald-200/50 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase flex items-center gap-1.5 w-max" title="Número de fiscalizações finalizadas.">
                Concluídas
                <Info size={12} className="text-emerald-400 hover:text-emerald-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-emerald-900">{stats.statusConcluidas}</p>
              <p className="text-[10px] text-emerald-600 font-bold">fiscalizações finalizadas</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-emerald-600 shadow-sm border border-emerald-200/40">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 2: Constatacoes */}
          <div className="bg-slate-50/70 rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5 w-max" title="Total de pontos observados ou inspecionados identificados nas fiscalizações.">
                Constatações
                <Info size={12} className="text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-slate-800">{stats.totalConstatacoes}</p>
              <p className="text-[10px] text-slate-500 font-bold">identificadas no acervo</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-slate-500 shadow-sm border border-slate-200/40">
              <FileText size={22} />
            </div>
          </div>

          {/* Card 3: Nao Conformidades */}
          <div className="bg-rose-50/50 rounded-3xl border border-rose-200/50 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase flex items-center gap-1.5 w-max" title="Quantidade de inconformidades, desvios normativos ou irregularidades detectadas.">
                Não Conformidades
                <Info size={12} className="text-rose-400 hover:text-rose-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-rose-900">{stats.totalNaoConformidades}</p>
              <p className="text-[10px] text-rose-500 font-bold">irregularidades ativas</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-rose-500 shadow-sm border border-rose-200/40">
              <AlertCircle size={22} />
            </div>
          </div>

          {/* Card 4: Termos Emitidos */}
          <div className="bg-blue-50/70 rounded-3xl border border-blue-200/50 p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase flex items-center gap-1.5 w-max" title="Total de termos de notificação emitidos formalmente aos regulados.">
                Termos Emitidos
                <Info size={12} className="text-blue-400 hover:text-blue-600 cursor-help transition-colors" />
              </span>
              <p className="text-3xl font-black text-blue-900">{stats.totalTermosNotificacao}</p>
              <p className="text-[10px] text-blue-500 font-bold">notificações formais</p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl text-blue-600 shadow-sm border border-blue-200/40">
              <FileSignature size={22} />
            </div>
          </div>

          {/* Card 5: Prazos Vencidos */}
          <div className={`rounded-3xl border p-5 shadow-sm flex items-center justify-between text-left transition-all hover:-translate-y-1 hover:shadow-md hover:scale-[1.02] cursor-default duration-300 ${
            stats.vencidas > 0 
              ? "bg-rose-100 border-rose-300" 
              : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="space-y-1">
              <span className={`text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 w-max ${
                stats.vencidas > 0 ? "text-rose-600" : "text-emerald-600"
              }`} title="Número de pendências (constatações e termos de notificação) cujo prazo de saneamento/resposta já expirou.">
                Prazos Vencidos
                <Info size={12} className={stats.vencidas > 0 ? "text-rose-400 hover:text-rose-600" : "text-emerald-400 hover:text-emerald-600"} />
              </span>
              <p className={`text-3xl font-black ${stats.vencidas > 0 ? "text-rose-900" : "text-emerald-900"}`}>{stats.vencidas}</p>
              <p className={`text-[10px] font-bold ${stats.vencidas > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {stats.vencidas > 0 ? `${stats.vencidas === 1 ? "pendência em atraso" : "pendências em atraso"}` : "tudo em dia!"}
              </p>
            </div>
            <div className="p-3.5 bg-white rounded-2xl shadow-sm flex-shrink-0">
              {stats.vencidas > 0 ? (
                <AlertTriangle size={22} className="text-rose-600 animate-pulse" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS GRAPHICS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Conforme vs Não Conforme */}
        <motion.div
          key={`chart1-${filterKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col"
        >
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Distribuição de Constatações</h3>
          <div className="h-64 w-full relative">
            {stats.totalConstatacoes === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <FileText size={36} className="text-slate-300 mb-2" />
                Nenhuma constatação registrada.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartConformanceData}
                      cx="50%"
                      cy="48%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartConformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} itens`, 'Quantidade']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={pieLegendFormatter} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9 text-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalConstatacoes}</span>
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase mt-0.5">Constatações</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Chart 2: Não Conformidades por Situação */}
        <motion.div
          key={`chart2-${filterKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col"
        >
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Situação das Não Conformidades</h3>
          <div className="h-64 w-full relative">
            {stats.totalNaoConformidades === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                Nenhuma não conformidade cadastrada.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartSituationData}
                      cx="50%"
                      cy="48%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartSituationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} itens`, 'Quantidade']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={pieLegendFormatter} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9 text-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalNaoConformidades}</span>
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase mt-0.5">Total NC</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Chart 3: Documentos Emitidos por Tipo */}
        <motion.div
          key={`chart3-${filterKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col"
        >
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Documentos Emitidos por Tipo</h3>
          <div className="h-64 w-full relative">
            {stats.totalDocumentos === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <FileSignature size={36} className="text-slate-300 mb-2" />
                Nenhum documento emitido.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDocumentTypeData}
                      cx="50%"
                      cy="48%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartDocumentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} docs`, 'Quantidade']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={pieLegendFormatter} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9 text-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalDocumentos}</span>
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase mt-0.5">Documentos</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Chart 4: Distribuição por Região Administrativa */}
        <motion.div
          key={`chart4-${filterKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col col-span-1"
        >
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4">Regiões Administrativas</h3>
          <div className="h-64 w-full relative">
            {chartRegionData.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <MapPin size={36} className="text-slate-300 mb-2" />
                Nenhuma região registrada.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRegionData} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                     dataKey="name" 
                     tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} 
                     interval={0} 
                     angle={-20}
                     textAnchor="end"
                     height={40}
                  />
                  <YAxis tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip />
                  <Legend formatter={barLegendFormatter} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', paddingTop: '10px' }} />
                  <Bar dataKey="Ações de Fiscalização" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Não Conformidades" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Table: MONITORAMENTO DE ETAPAS DA FISCALIZAÇÃO */}
        <motion.div
          key={`chartStage-${filterKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-sm flex flex-col col-span-1 lg:col-span-2"
        >
          <div className="mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <ClipboardList size={16} className="text-[#1A3E8A]" /> MONITORAMENTO DE ETAPAS DA FISCALIZAÇÃO
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Tempo Médio e Distribuição por Etapa</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Etapa</th>
                  <th className="pb-3 font-bold text-center">Processos</th>
                  <th className="pb-3 font-bold text-center">Percentual</th>
                  <th className="pb-3 font-bold text-right">Tempo Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {stageStats.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-bold text-slate-700">{item.stage}</td>
                    <td className="py-3 font-extrabold text-slate-900 text-center">{item.count}</td>
                    <td className="py-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-black text-[10px]">
                        {item.percent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="font-extrabold text-[#1A3E8A]">{item.averageDays.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Dias</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>

      {/* Chart 5: Ações por Trimestre e Situação */}
      <motion.div
        key={`chart5-${filterKey}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm flex flex-col mb-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ações por Trimestre e Situação</h3>
          <button 
            onClick={() => setViewQuarterAsTable(!viewQuarterAsTable)}
            className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 bg-sky-50 px-3 py-1.5 rounded-full transition-colors"
          >
            {viewQuarterAsTable ? <BarChart2 size={14} /> : <TableIcon size={14} />}
            {viewQuarterAsTable ? 'Ver Gráfico' : 'Ver Tabela'}
          </button>
        </div>
        <div className="h-64 w-full relative">
          {chartQuarterData.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
              <BarChart2 size={36} className="text-slate-300 mb-2" />
              Nenhum dado por trimestre.
            </div>
          ) : viewQuarterAsTable ? (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black">
                    <th className="py-2 px-3">Trimestre</th>
                    <th className="py-2 px-3">Não iniciada</th>
                    <th className="py-2 px-3">Em andamento</th>
                    <th className="py-2 px-3">Concluída</th>
                    <th className="py-2 px-3 text-sky-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chartQuarterData.map(row => (
                    <tr key={row.name} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-700">{row.name}</td>
                      <td className="py-2 px-3">{row['Não iniciada']}</td>
                      <td className="py-2 px-3">{row['Em andamento']}</td>
                      <td className="py-2 px-3">{row['Concluída']}</td>
                      <td className="py-2 px-3 font-bold text-sky-600">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartQuarterData} margin={{ top: 10, right: 10, left: -25, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip />
                <Legend formatter={quarterLegendFormatter} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', paddingTop: '10px' }} />
                <Bar dataKey="Não iniciada" stackId="a" fill="#94a3b8" />
                <Bar dataKey="Em andamento" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Concluída" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Tabela Quantidade de Fiscalizações por Trimestre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm mb-6 mt-2 overflow-hidden flex flex-col">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 px-2">Resumo por Trimestre das Ações Fiscalizatórias</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Trimestre</th>
                <th className="py-3 px-4 text-center">Não Iniciada</th>
                <th className="py-3 px-4 text-center">Em Andamento</th>
                <th className="py-3 px-4 text-center">Concluída</th>
                <th className="py-3 px-4 text-center text-sky-600">Total</th>
                <th className="py-3 px-4 text-center text-emerald-600 cursor-help" title="Índice de Eficiência Fiscalizatória">IEF (%)</th>
                <th className="py-3 px-4 text-center text-emerald-600 cursor-help" title="Índice de Eficiência Fiscalizatória Acumulado">IEF Acum (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableTrimestreData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-medium italic bg-slate-50/10">
                    Nenhum dado encontrado para exibição.
                  </td>
                </tr>
              ) : (
                <>
                  {tableTrimestreData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">{row.trimestre}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{row.naoIniciada}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{row.emAndamento}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{row.concluida}</td>
                      <td className="py-3 px-4 text-center font-bold text-sky-600">{row.total}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 cursor-help" title={`Índice de Eficiência Fiscalizatória (IEF):\n${row.concluida} (Concluídas) / ${row.total} (Total) = ${row.ief}%`}>{row.ief}%</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 cursor-help" title={`Índice de Eficiência Fiscalizatória Acumulado (IEF Acum):\n${row.accConcluida} (Concluídas Acum) / ${row.accTotal} (Total Acum) = ${row.iefAcum}%`}>{row.iefAcum}%</td>
                    </tr>
                  ))}
                  {(() => {
                    const totalNaoIniciada = tableTrimestreData.reduce((acc, row) => acc + row.naoIniciada, 0);
                    const totalEmAndamento = tableTrimestreData.reduce((acc, row) => acc + row.emAndamento, 0);
                    const totalConcluida = tableTrimestreData.reduce((acc, row) => acc + row.concluida, 0);
                    const totalTotal = tableTrimestreData.reduce((acc, row) => acc + row.total, 0);
                    const totalIef = totalTotal > 0 ? ((totalConcluida / totalTotal) * 100).toFixed(1) : "0.0";
                    return (
                      <tr className="bg-slate-50/80 border-t border-slate-200">
                        <td className="py-3 px-4 font-black text-slate-800">TOTAL</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{totalNaoIniciada}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{totalEmAndamento}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{totalConcluida}</td>
                        <td className="py-3 px-4 text-center font-black text-sky-700">{totalTotal}</td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700 cursor-help" title={`Índice de Eficiência Fiscalizatória (IEF) Total:\n${totalConcluida} (Concluídas) / ${totalTotal} (Total) = ${totalIef}%`}>{totalIef}%</td>
                        <td className="py-3 px-4 text-center font-black text-emerald-700 cursor-help" title={`Índice de Eficiência Fiscalizatória Acumulado (IEF Acum) Total:\n${totalConcluida} (Concluídas) / ${totalTotal} (Total) = ${totalIef}%`}>{totalIef}%</td>
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela Resumo por Trimestre Não Conformidades */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm mb-6 mt-2 overflow-hidden flex flex-col">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 px-2">Resumo por Trimestre Não Conformidades</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Trimestre</th>
                <th className="py-3 px-4 text-center">Constatações</th>
                <th className="py-3 px-4 text-center text-rose-500">Não Conformidades</th>
                <th className="py-3 px-4 text-center text-emerald-500">Tratadas</th>
                <th className="py-3 px-4 text-center text-rose-600">Não Tratadas</th>
                <th className="py-3 px-4 text-center text-sky-600 cursor-help" title="IEF NC (%) - Índice de Eficiência Fiscalizatória de Não Conformidades">IEF NC (%)</th>
                <th className="py-3 px-4 text-center text-sky-600 cursor-help" title="IEF NC Acumulado (%) - Índice de Eficiência Fiscalizatória de Não Conformidades Acumulado">IEF NC Acum (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableTrimestreNCData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-medium italic bg-slate-50/10">
                    Nenhum dado encontrado para exibição.
                  </td>
                </tr>
              ) : (
                <>
                  {tableTrimestreNCData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700">{row.trimestre}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{row.constatacoes}</td>
                      <td className="py-3 px-4 text-center font-medium text-rose-500">{row.naoConformidades}</td>
                      <td className="py-3 px-4 text-center font-medium text-emerald-500">{row.tratadas}</td>
                      <td className="py-3 px-4 text-center font-medium text-rose-600">{row.naoTratadas}</td>
                      <td className="py-3 px-4 text-center font-bold text-sky-600 cursor-help" title={`IEF NC (%):\n${row.tratadas} (Tratadas) / ${row.naoConformidades} (Não Conformidades) = ${row.iefNc}%`}>{row.iefNc}%</td>
                      <td className="py-3 px-4 text-center font-bold text-sky-600 cursor-help" title={`IEF NC Acumulado (%):\n${row.accTratadas} (Tratadas Acum) / ${row.accNaoConformidades} (Não Conformidades Acum) = ${row.iefNcAcum}%`}>{row.iefNcAcum}%</td>
                    </tr>
                  ))}
                  {(() => {
                    const totalConstatacoes = tableTrimestreNCData.reduce((acc, row) => acc + row.constatacoes, 0);
                    const totalNaoConformidades = tableTrimestreNCData.reduce((acc, row) => acc + row.naoConformidades, 0);
                    const totalTratadas = tableTrimestreNCData.reduce((acc, row) => acc + row.tratadas, 0);
                    const totalNaoTratadas = tableTrimestreNCData.reduce((acc, row) => acc + row.naoTratadas, 0);
                    const totalIefNc = totalNaoConformidades > 0 ? ((totalTratadas / totalNaoConformidades) * 100).toFixed(1) : "0.0";
                    return (
                      <tr className="bg-slate-50/80 border-t border-slate-200">
                        <td className="py-3 px-4 font-black text-slate-800">TOTAL</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">{totalConstatacoes}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">{totalNaoConformidades}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">{totalTratadas}</td>
                        <td className="py-3 px-4 text-center font-bold text-rose-700">{totalNaoTratadas}</td>
                        <td className="py-3 px-4 text-center font-black text-sky-700 cursor-help" title={`IEF NC (%) Total:\n${totalTratadas} (Tratadas) / ${totalNaoConformidades} (Não Conformidades) = ${totalIefNc}%`}>{totalIefNc}%</td>
                        <td className="py-3 px-4 text-center font-black text-sky-700 cursor-help" title={`IEF NC Acumulado (%) Total:\n${totalTratadas} (Tratadas Acum) / ${totalNaoConformidades} (Não Conformidades Acum) = ${totalIefNc}%`}>{totalIefNc}%</td>
                      </tr>
                    );
                  })()}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* ALERT FOR OVERDUE NON-CONFORMITIES */}
      {/* Tabela de Progresso Trimestral por Plano de Serviço */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm mb-6 mt-2 overflow-hidden flex flex-col">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-4 px-2">Progresso Trimestral por Tipo de Fiscalização</h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-separate border-spacing-y-2 text-xs">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-4 whitespace-nowrap">Tipo de Fiscalização / Serviço</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Data Início</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">Data Fim</th>
                <th className="py-2 px-2 text-center w-1/6 min-w-[80px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-2 py-1 mx-auto w-max">
                    <span className="block font-black text-slate-700">1º Trimestre</span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Jan - Mar</span>
                  </div>
                </th>
                <th className="py-2 px-2 text-center w-1/6 min-w-[80px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-2 py-1 mx-auto w-max">
                    <span className="block font-black text-slate-700">2º Trimestre</span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Abr - Jun</span>
                  </div>
                </th>
                <th className="py-2 px-2 text-center w-1/6 min-w-[80px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-2 py-1 mx-auto w-max">
                    <span className="block font-black text-slate-700">3º Trimestre</span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Jul - Set</span>
                  </div>
                </th>
                <th className="py-2 px-2 text-center w-1/6 min-w-[80px]">
                  <div className="bg-slate-50 border border-slate-200 rounded-full px-2 py-1 mx-auto w-max">
                    <span className="block font-black text-slate-700">4º Trimestre</span>
                    <span className="block text-[8px] text-slate-400 font-bold mt-0.5">Out - Dez</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {planProgressData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium italic bg-slate-50/10 rounded-2xl">
                    Nenhum plano com ações encontradas.
                  </td>
                </tr>
              ) : (
                planProgressData.map(plan => {
                  const isExpanded = expandedPlanRows[plan.id];
                  
                  const renderProgress = (val: number | null) => {
                    if (val === null) {
                      return (
                        <div className="flex items-center justify-center w-full h-7 px-2">
                          <div className="h-[1.5px] bg-slate-200 w-full relative rounded-full">
                            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                          </div>
                        </div>
                      );
                    }
                    const is100 = val === 100;
                    return (
                      <div className="w-full bg-slate-100 rounded-full h-7 overflow-hidden relative shadow-inner">
                        <div 
                          className={`h-full transition-all duration-500 ${is100 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${val}%` }}
                        ></div>
                        <div className={`absolute inset-0 flex items-center justify-center font-black text-[10px] ${val > 40 ? 'text-white' : 'text-slate-600'}`}>
                          {val}%
                        </div>
                      </div>
                    );
                  };

                  return (
                    <React.Fragment key={plan.id}>
                      <tr className="bg-slate-50/60 border-y border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 font-black text-slate-800 border-l-[3px] border-indigo-500 rounded-l-xl">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => togglePlanRow(plan.id)}>
                            {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            {plan.name}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-slate-500">{plan.startDate ? formatDateBR(plan.startDate) : "-"}</td>
                        <td className="py-3 px-2 text-center text-[10px] font-bold text-slate-500">{plan.endDate ? formatDateBR(plan.endDate) : "-"}</td>
                        <td className="py-3 px-2 text-center align-middle">{renderProgress(plan.q1)}</td>
                        <td className="py-3 px-2 text-center align-middle">{renderProgress(plan.q2)}</td>
                        <td className="py-3 px-2 text-center align-middle">{renderProgress(plan.q3)}</td>
                        <td className="py-3 px-2 text-center align-middle rounded-r-xl">{renderProgress(plan.q4)}</td>
                      </tr>
                      {isExpanded && plan.children && plan.children.map(area => (
                        <tr key={area.id} className="bg-white hover:bg-slate-50/30 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-600 pl-10 rounded-l-xl border-l border-slate-50">
                            <div className="flex items-center gap-2 uppercase text-[10px]">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                              {area.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center text-[10px] font-semibold text-slate-400">{area.startDate ? formatDateBR(area.startDate) : "-"}</td>
                          <td className="py-2.5 px-2 text-center text-[10px] font-semibold text-slate-400">{area.endDate ? formatDateBR(area.endDate) : "-"}</td>
                          <td className="py-2.5 px-2 text-center align-middle">{renderProgress(area.q1)}</td>
                          <td className="py-2.5 px-2 text-center align-middle">{renderProgress(area.q2)}</td>
                          <td className="py-2.5 px-2 text-center align-middle">{renderProgress(area.q3)}</td>
                          <td className="py-2.5 px-2 text-center align-middle rounded-r-xl border-r border-slate-50">{renderProgress(area.q4)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILTER & DATA TABLE SECTION */}
      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-50 pb-5">
          <div className="flex items-center gap-2.5">
            <ChevronDown size={18} className="text-slate-400 shrink-0" />
            <Tag size={16} className="text-sky-500 shrink-0 fill-sky-500/10" />
            <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              Ações de Fiscalização Cadastradas
            </h3>
          </div>
          <div className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 shrink-0">
            {filteredTableTasks.length} {filteredTableTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </div>
        </div>

        {/* ACTIONS TABLE */}
        <div className="overflow-hidden border border-slate-100 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4 w-12"></th>
                <th className="py-4 px-4">Código / Ação de Fiscalização</th>
                <th className="py-4 px-4">Tipo de Fiscalização</th>
                <th className="py-4 px-4">Serviço</th>
                <th className="py-4 px-4 text-center">Constatações (Conf. / N.C.)</th>
                <th className="py-4 px-4 text-center">Termos Emitidos</th>
                <th className="py-4 px-4 text-center">Autos Emitidos</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-center">Progresso</th>
                <th className="py-4 px-4 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTableTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium italic bg-slate-50/10">
                    Nenhuma ação de fiscalização encontrada para os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredTableTasks.map(t => {
                  const data = t.fiscalizacaoData;
                  const code = data?.codigo || `FISC-${t.id}`;
                  const etapaAtual = data?.etapa || FISCALIZACAO_ETAPA_INICIAL;
                  const etapaIndex = FISCALIZACAO_ETAPAS.indexOf(etapaAtual as typeof FISCALIZACAO_ETAPAS[number]);
                  const isExpanded = !!expandedTasks[t.id];
                  const totalC = data?.constatacoes?.length || 0;
                  const ncCount = (data?.constatacoes || []).filter(c => c.situacao === 'Não Conforme').length;
                  const conformeCount = totalC - ncCount;
                  const termosCount = data?.termosNotificacao?.length || 0;
                  const autosCount = data?.autosDeInfracao?.length || 0;
                  const hasOverdueConstatacao = (data?.constatacoes || []).some(c => isConstatacaoOverdue(c));
                  const hasOverdueTermo = (data?.termosNotificacao || []).some(termo => !termo.respondidoEm && termo.dataResposta && termo.dataResposta < todayStr);
                  const hasOverdueAuto = (data?.autosDeInfracao || []).some(auto => auto.dataLimiteRecurso && auto.dataLimiteRecurso < todayStr);
                  const hasOverdueAny = hasOverdueConstatacao || hasOverdueTermo || hasOverdueAuto;
                  const hasSoonOverdueConstatacao = (data?.constatacoes || []).some(c => isConstatacaoSoonOverdue(c));
                  const planName = plans.find(p => p.id === t.planId)?.name;

                  return (
                    <React.Fragment key={t.id}>
                      {/* Parent row */}
                      <tr 
                        className={`hover:bg-slate-50/40 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50/20" : ""} ${hasOverdueAny ? "border-l-4 border-l-rose-500 bg-rose-50/20" : hasSoonOverdueConstatacao ? "border-l-4 border-l-amber-500 bg-amber-50/20" : ""}`}
                        onClick={() => toggleRow(t.id)}
                      >
                        <td className="py-5 px-4 text-center">
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={16} className="text-slate-400" />
                          )}
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-start gap-3">
                            {/* File/Folder Icon Pill like in the image */}
                            <div className={`border p-2.5 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              hasOverdueAny
                                ? 'bg-rose-50 border-rose-200 text-rose-500'
                                : hasSoonOverdueConstatacao
                                ? 'bg-amber-50 border-amber-200 text-amber-500'
                                : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}>
                              {hasOverdueAny || hasSoonOverdueConstatacao ? (
                                <AlertTriangle size={15} />
                              ) : (
                                <FolderKanban size={15} />
                              )}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-800 uppercase tracking-wide">
                                  {code}
                                </span>
                                
                                {/* Status Icon Badges on the right of title like in the image */}
                                <div className="flex items-center gap-1">
                                  <div className="bg-rose-50 border border-rose-100 text-rose-500 p-1 rounded-lg flex items-center justify-center shadow-sm" title="Alta Prioridade">
                                    <Activity size={11} />
                                  </div>
                                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-500 p-1 rounded-lg flex items-center justify-center shadow-sm" title="Data Limite">
                                    <Calendar size={11} />
                                  </div>
                                  <div className="bg-slate-50 border border-slate-100 text-slate-500 p-1 rounded-lg flex items-center justify-center shadow-sm" title="Em monitoramento">
                                    <Clock size={11} />
                                  </div>
                                  {hasOverdueAny && (
                                    <div className="bg-rose-500 text-white p-1 rounded-lg flex items-center justify-center shadow-sm animate-pulse" title="Pendências ou Termos Vencidos!">
                                      <AlertCircle size={11} />
                                    </div>
                                  )}
                                  {!hasOverdueAny && hasSoonOverdueConstatacao && (
                                    <div className="bg-amber-500 text-white p-1 rounded-lg flex items-center justify-center shadow-sm" title="Constatações prestes a vencer (≤ 15 dias)">
                                      <AlertCircle size={11} />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTaskClick(t.id);
                                }}
                                className="font-bold text-slate-700 mt-1 hover:text-sky-600 hover:underline transition-colors cursor-pointer text-xs"
                                title="Clique para editar atividade de fiscalização"
                              >
                                {t.title}
                              </span>

                              {/* Dates Pill matching the image style exactly */}
                              <div className="flex items-center gap-1.5 mt-2 bg-slate-50/70 border border-slate-100 text-[10px] text-slate-500 font-bold px-2.5 py-1 rounded-lg w-max">
                                <Calendar size={11} className="text-slate-400 shrink-0" />
                                <span>Início: {formatDateBR(t.startDate)}</span>
                                <span className="text-slate-300 font-normal">|</span>
                                <span>Prazo: {formatDateBR(t.endDate)}</span>
                              </div>

                              {/* Bottom Tags matching the bottom tags of the image */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span
                                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700"
                                  title={etapaAtual}
                                >
                                  <span className="shrink-0">Etapa {Math.max(0, etapaIndex) + 1}/{FISCALIZACAO_ETAPAS.length}:</span>
                                  <span className="truncate">{etapaAtual}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4 font-bold text-slate-600">
                          {data?.tipoFiscalizacao || "-"}
                        </td>
                        <td className="py-5 px-4 font-bold text-slate-600">
                          {data?.servico || "-"}
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2.5 py-1 rounded-lg border border-sky-100">
                              {conformeCount} Conf.
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                              ncCount > 0 
                                ? "bg-rose-50 text-rose-700 border-rose-100" 
                                : "bg-slate-50 text-slate-400 border-slate-100"
                            }`}>
                              {ncCount} N.C.
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-center font-bold text-slate-700">
                          {termosCount > 0 ? (
                            <span className="bg-slate-50 text-slate-600 text-xs px-2.5 py-1 rounded-full border border-slate-200 font-extrabold">
                              {termosCount} {termosCount === 1 ? 'termo' : 'termos'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="py-5 px-4 text-center font-bold text-slate-700">
                          {autosCount > 0 ? (
                            <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full border border-rose-200 font-extrabold">
                              {autosCount} {autosCount === 1 ? 'auto' : 'autos'}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">-</span>
                          )}
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center justify-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                              t.status === 'completed' || t.status === 'Concluído'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : t.status === 'in_progress' || t.status === 'Em Execução'
                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {t.status === 'completed' ? 'Concluído' : t.status === 'in_progress' ? 'Em Execução' : t.status === 'pending' ? 'Pendente' : t.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex flex-col gap-1 w-24 mx-auto">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                              <span>{t.progress || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-sky-500 h-full rounded-full transition-all" 
                                style={{ width: `${t.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4 text-right">
                          {/* Beautiful sky-blue edit button exactly like the pencil button in the image */}
                          <div className="flex items-center justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTaskClick(t.id);
                              }}
                              className="bg-sky-50 hover:bg-sky-100/80 text-sky-600 border border-sky-100 p-2 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                              title="Editar Ação"
                            >
                              <FileSignature size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded constatacoes, termos e autos row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/10">
                          <td colSpan={10} className="p-4 border-t border-slate-100">
                            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <ClipboardList size={15} className="text-sky-600" />
                                    Constatações e Documentos Vinculados ({data?.constatacoes?.length || 0} Constatações, {data?.termosNotificacao?.length || 0} Termos, {data?.autosDeInfracao?.length || 0} Autos)
                                  </h4>
                                </div>
                                <div className="text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                  Objetivo: {data?.objetivo || "Não detalhado"}
                                </div>
                              </div>

                              {/* Grid de Constatações */}
                              {(!data?.constatacoes || data.constatacoes.length === 0) ? (
                                <p className="text-xs text-slate-400 italic">Nenhuma constatação registrada para esta ação de fiscalização.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {data.constatacoes.map(c => {
                                    const overdue = isConstatacaoOverdue(c);
                                    const soonOverdue = isConstatacaoSoonOverdue(c);
                                    const tratamento = c.situacaoNaoConforme || 'Não Tratada';

                                    const termosAssoc = (data?.termosNotificacao || []).filter(termo => 
                                      termo.constatacoesIds && termo.constatacoesIds.includes(c.id)
                                    );

                                    const autosAssoc = (data?.autosDeInfracao || []).filter(auto => 
                                      auto.constatacoesIds && auto.constatacoesIds.includes(c.id)
                                    );

                                    return (
                                      <div key={c.id} className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 bg-white shadow-xs transition-shadow ${
                                        c.situacao === 'Conforme' 
                                          ? 'border-emerald-100/80 bg-emerald-50/10' 
                                          : overdue 
                                          ? 'border-rose-200 bg-rose-50/20' 
                                          : soonOverdue
                                          ? 'border-amber-200 bg-amber-50/20'
                                          : 'border-slate-200'
                                      }`}>
                                        <div className="space-y-2">
                                          {/* Status Header */}
                                          <div className="flex items-start justify-between gap-2 flex-wrap">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                                              c.situacao === 'Conforme' 
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                                            }`}>
                                              {c.codigo} - {c.situacao}
                                            </span>
                                            
                                            {c.situacao === 'Não Conforme' && (
                                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                                                tratamento === 'Tratada Adequadamente'
                                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                  : overdue
                                                  ? 'bg-rose-600 text-white animate-pulse font-black shadow-sm'
                                                  : soonOverdue
                                                  ? 'bg-amber-500 text-white font-extrabold'
                                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                                              }`}>
                                                {overdue && <AlertTriangle size={11} />}
                                                {soonOverdue && !overdue && <AlertTriangle size={11} />}
                                                {tratamento} {overdue ? '(PRAZO VENCIDO)' : soonOverdue ? '(VENCE EM BREVE)' : ''}
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-xs text-slate-800 font-bold leading-relaxed">{c.descricao}</p>
                                        </div>

                                        {/* Detalhes de Não Conformidade e Prazo de Correção */}
                                        {c.situacao === 'Não Conforme' && (
                                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
                                            {c.descricaoNaoConformidade && (
                                              <div>
                                                <strong className="text-slate-800">Não Conformidade:</strong> {c.descricaoNaoConformidade}
                                              </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-200/60">
                                              <div className="flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span className="font-semibold text-slate-700">Prazo de Correção:</span>
                                              </div>
                                              <div>
                                                {c.prazoCorrecao ? (
                                                  <span className={`font-black px-2 py-0.5 rounded text-[10px] ${
                                                    overdue
                                                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                                                      : soonOverdue
                                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                                      : "bg-slate-200 text-slate-800"
                                                  }`}>
                                                    {formatDateBR(c.prazoCorrecao)} {overdue ? "- VENCIDO" : soonOverdue ? "- VENCE EM BREVE" : "- No prazo"}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400 italic">Não informado</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Seção de Termos de Notificação Associados */}
                                        <div className="bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-xl space-y-1.5">
                                          <div className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                              <FileText size={12} className="text-indigo-600" />
                                              Termo de Notificação Associado
                                            </span>
                                            <span className="text-indigo-600 font-bold">({termosAssoc.length})</span>
                                          </div>

                                          {termosAssoc.length > 0 ? (
                                            <div className="space-y-1">
                                              {termosAssoc.map(termo => {
                                                const isTermoOverdue = !termo.respondidoEm && termo.dataResposta && termo.dataResposta < todayStr;
                                                const isRespondido = !!termo.respondidoEm;

                                                return (
                                                  <div key={termo.id} className="bg-white border border-indigo-100 p-2 rounded-lg flex items-center justify-between gap-2 text-xs shadow-2xs">
                                                    <span className="font-extrabold text-indigo-950">
                                                      SEI nº {termo.numeroSei || "S/N"}
                                                    </span>
                                                    {isRespondido ? (
                                                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Respondido em {formatDateBR(termo.respondidoEm!)}
                                                      </span>
                                                    ) : isTermoOverdue ? (
                                                      <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded flex items-center gap-1 animate-pulse shadow-2xs">
                                                        <AlertTriangle size={10} /> VENCIDO ({formatDateBR(termo.dataResposta)})
                                                      </span>
                                                    ) : termo.dataResposta ? (
                                                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                                        <Clock size={10} /> No Prazo (Até {formatDateBR(termo.dataResposta)})
                                                      </span>
                                                    ) : (
                                                      <span className="bg-slate-100 text-slate-600 font-medium text-[10px] px-2 py-0.5 rounded">
                                                        Sem data limite
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 italic">Sem Termo de Notificação associado diretamente a esta constatação.</p>
                                          )}
                                        </div>

                                        {/* Seção de Autos de Infração Associados */}
                                        <div className="bg-rose-50/40 border border-rose-100 p-2.5 rounded-xl space-y-1.5">
                                          <div className="text-[10px] font-black uppercase text-rose-900 tracking-wider flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                              <AlertTriangle size={12} className="text-rose-600" />
                                              Auto de Infração Associado
                                            </span>
                                            <span className="text-rose-600 font-bold">({autosAssoc.length})</span>
                                          </div>

                                          {autosAssoc.length > 0 ? (
                                            <div className="space-y-1">
                                              {autosAssoc.map(auto => {
                                                const isAutoOverdue = auto.dataLimiteRecurso && auto.dataLimiteRecurso < todayStr;

                                                return (
                                                  <div key={auto.id} className="bg-white border border-rose-100 p-2 rounded-lg flex items-center justify-between gap-2 text-xs shadow-2xs">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                      <span className="font-extrabold text-rose-950">
                                                        SEI nº {auto.numeroSei || "S/N"}
                                                      </span>
                                                      <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.2 rounded border border-rose-100">
                                                        {auto.penalidade || "Penalidade"}
                                                      </span>
                                                    </div>
                                                    {isAutoOverdue ? (
                                                      <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded flex items-center gap-1 animate-pulse shrink-0 shadow-2xs">
                                                        <AlertCircle size={10} /> RECURSO VENCIDO ({formatDateBR(auto.dataLimiteRecurso)})
                                                      </span>
                                                    ) : auto.dataLimiteRecurso ? (
                                                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                        <Clock size={10} /> No Prazo (Recurso até {formatDateBR(auto.dataLimiteRecurso)})
                                                      </span>
                                                    ) : (
                                                      <span className="bg-slate-100 text-slate-600 font-medium text-[10px] px-2 py-0.5 rounded shrink-0">
                                                        Sem prazo recurso
                                                      </span>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] text-slate-400 italic">Sem Auto de Infração associado diretamente a esta constatação.</p>
                                          )}
                                        </div>

                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Resumo Geral de Termos e Autos da Ação */}
                              {((data?.termosNotificacao || []).length > 0 || (data?.autosDeInfracao || []).length > 0) && (
                                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Todos os Termos de Notificação da Ação */}
                                  {(data?.termosNotificacao || []).length > 0 && (
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                                      <h5 className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                          <FileText size={13} className="text-indigo-600" />
                                          Todos os Termos de Notificação da Ação
                                        </span>
                                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                          {data?.termosNotificacao?.length}
                                        </span>
                                      </h5>
                                      <div className="space-y-1.5">
                                        {data?.termosNotificacao?.map(termo => {
                                          const isTermoOverdue = !termo.respondidoEm && termo.dataResposta && termo.dataResposta < todayStr;
                                          const isRespondido = !!termo.respondidoEm;

                                          return (
                                            <div key={termo.id} className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs">
                                              <div>
                                                <span className="font-extrabold text-slate-800">
                                                  SEI nº {termo.numeroSei || "S/N"}
                                                </span>
                                                <div className="text-[10px] text-slate-500 font-semibold">
                                                  Emissão: {formatDateBR(termo.dataEmissao)}
                                                </div>
                                              </div>
                                              <div>
                                                {isRespondido ? (
                                                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Respondido em {formatDateBR(termo.respondidoEm!)}
                                                  </span>
                                                ) : isTermoOverdue ? (
                                                  <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                                    <AlertTriangle size={10} /> VENCIDO ({formatDateBR(termo.dataResposta)})
                                                  </span>
                                                ) : termo.dataResposta ? (
                                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Clock size={10} /> No Prazo (Até {formatDateBR(termo.dataResposta)})
                                                  </span>
                                                ) : (
                                                  <span className="bg-slate-100 text-slate-600 font-medium text-[10px] px-2 py-0.5 rounded">
                                                    Sem prazo resposta
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Todos os Autos de Infração da Ação */}
                                  {(data?.autosDeInfracao || []).length > 0 && (
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                                      <h5 className="text-[11px] font-black uppercase text-slate-800 tracking-wider flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                          <AlertTriangle size={13} className="text-rose-600" />
                                          Todos os Autos de Infração da Ação
                                        </span>
                                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                                          {data?.autosDeInfracao?.length}
                                        </span>
                                      </h5>
                                      <div className="space-y-1.5">
                                        {data?.autosDeInfracao?.map(auto => {
                                          const isAutoOverdue = auto.dataLimiteRecurso && auto.dataLimiteRecurso < todayStr;

                                          return (
                                            <div key={auto.id} className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs">
                                              <div>
                                                <span className="font-extrabold text-slate-800">
                                                  SEI nº {auto.numeroSei || "S/N"}
                                                </span>
                                                <span className="ml-2 text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-100">
                                                  {auto.penalidade || "Penalidade"}
                                                </span>
                                                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                                  Emissão: {formatDateBR(auto.dataEmissao)}
                                                </div>
                                              </div>
                                              <div>
                                                {isAutoOverdue ? (
                                                  <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                                    <AlertCircle size={10} /> RECURSO VENCIDO ({formatDateBR(auto.dataLimiteRecurso)})
                                                  </span>
                                                ) : auto.dataLimiteRecurso ? (
                                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Clock size={10} /> No Prazo (Recurso até {formatDateBR(auto.dataLimiteRecurso)})
                                                  </span>
                                                ) : (
                                                  <span className="bg-slate-100 text-slate-600 font-medium text-[10px] px-2 py-0.5 rounded">
                                                    Sem prazo recurso
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
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

    </div>
  );
}
