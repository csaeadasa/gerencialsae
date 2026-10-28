import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Presentation,
  CheckCircle2,
  Image as ImageIcon,
  Edit3,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Building,
  Upload
} from "lucide-react";
import { Task, Area, Category, Plan } from "../types";
import { cn } from "../lib/utils";

export interface BoletimTrimestralModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  areas: Area[];
  categories: Category[];
  plans: Plan[];
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
}

export type SlideLayout = "timeline" | "photos" | "indicators";

export interface BulletinSlide {
  id: string;
  type: "cover" | "toc" | "content" | "institutional" | "backcover";
  layout?: SlideLayout;
  orderNumber?: number; // 1, 2, 3 for numbered items
  title: string;
  subtitle?: string;
  areaId?: number | null;
  areaName?: string;
  categoryName?: string;
  seiProcess?: string;
  statusBadge?: string;
  progress?: number;
  narrative?: string;
  timelineCards?: {
    id: string;
    month: string;
    title: string;
    description: string;
    badge?: string;
    completed?: boolean;
  }[];
  photos?: {
    id: string;
    url: string;
    caption: string;
  }[];
  indicators?: {
    label: string;
    value: string;
    sublabel?: string;
    color?: string;
  }[];
  deliveries?: string[];
  notes?: string;
  taskId?: number;
}

const QUARTERS = [
  { id: 1, label: "1º Trimestre", months: "Janeiro / Fevereiro / Março", monthNumbers: [0, 1, 2], name: "1º Trimestre" },
  { id: 2, label: "2º Trimestre", months: "Abril / Maio / Junho", monthNumbers: [3, 4, 5], name: "2º Trimestre" },
  { id: 3, label: "3º Trimestre", months: "Julho / Agosto / Setembro", monthNumbers: [6, 7, 8], name: "3º Trimestre" },
  { id: 4, label: "4º Trimestre", months: "Outubro / Novembro / Dezembro", monthNumbers: [9, 10, 11], name: "4º Trimestre" },
];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Helper to determine if a date falls in a given quarter and year
function isDateInQuarter(dateStr: string | null | undefined, quarter: number, year: number): boolean {
  if (!dateStr) return false;
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length < 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // 0-indexed
    if (y !== year) return false;
    const qData = QUARTERS.find(q => q.id === quarter);
    return qData ? qData.monthNumbers.includes(m) : false;
  } catch {
    return false;
  }
}

// Format date to BR format
function formatBR(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    const clean = d.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  } catch {
    return d;
  }
}

export const BoletimTrimestralModal: React.FC<BoletimTrimestralModalProps> = ({
  isOpen,
  onClose,
  tasks,
  areas,
  categories,
  plans,
  showToast,
}) => {
  // Filters State
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(3);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [parentTasksOnly, setParentTasksOnly] = useState<boolean>(true);
  const [includeOnlyCompleted, setIncludeOnlyCompleted] = useState<boolean>(false);

  // Presentation / Editor State
  const [slides, setSlides] = useState<BulletinSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEditingActive, setIsEditingActive] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(2024);
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);

    tasks.forEach(t => {
      [t.startDate, t.endDate, t.completedAt, t.createdAt].forEach(d => {
        if (d) {
          const y = parseInt(d.split("-")[0], 10);
          if (!isNaN(y) && y >= 2020 && y <= 2035) yearsSet.add(y);
        }
      });
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [tasks]);

  // Current Quarter Info
  const quarterInfo = useMemo(() => {
    return QUARTERS.find(q => q.id === selectedQuarter) || QUARTERS[2];
  }, [selectedQuarter]);

  // Map tasks by parent
  const childTasksByParentId = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach(t => {
      if (t.parentId !== null && t.parentId !== undefined) {
        const pId = Number(t.parentId);
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  // Generate initial slides from tasks according to filters
  const generateSlides = () => {
    const qData = QUARTERS.find(q => q.id === selectedQuarter) || QUARTERS[2];

    // Filter candidate tasks
    const relevantTasks = tasks.filter(task => {
      // 1. Parent Task filter
      if (parentTasksOnly && task.parentId !== null && task.parentId !== undefined) {
        return false;
      }

      // 2. Area Filter
      if (selectedAreaId !== "all") {
        const aId = Number(selectedAreaId);
        const matchesArea = task.areaId === aId || (task.areaIds && task.areaIds.includes(aId));
        if (!matchesArea) return false;
      }

      // 3. Category Filter
      if (selectedCategoryId !== "all") {
        const cId = Number(selectedCategoryId);
        const matchesCategory = task.categoryIds && task.categoryIds.includes(cId);
        if (!matchesCategory) return false;
      }

      // 4. Activity in Quarter:
      // A task is active in quarter if:
      // - It was completed in quarter
      // - Its start date or end date falls in quarter
      // - OR any of its children were completed / active in quarter
      const completedInQ = isDateInQuarter(task.completedAt, selectedQuarter, selectedYear);
      const endInQ = isDateInQuarter(task.endDate, selectedQuarter, selectedYear);
      const startInQ = isDateInQuarter(task.startDate, selectedQuarter, selectedYear);

      let childrenActiveInQ = false;
      const children = childTasksByParentId.get(task.id) || [];
      for (const child of children) {
        if (
          isDateInQuarter(child.completedAt, selectedQuarter, selectedYear) ||
          isDateInQuarter(child.endDate, selectedQuarter, selectedYear) ||
          isDateInQuarter(child.startDate, selectedQuarter, selectedYear)
        ) {
          childrenActiveInQ = true;
          break;
        }
      }

      const isActiveInQ = completedInQ || endInQ || startInQ || childrenActiveInQ;
      if (!isActiveInQ) return false;

      // 5. Concluded filter if requested
      if (includeOnlyCompleted) {
        const isDone = (task.status || "").toLowerCase().includes("conclu") || task.progress === 100;
        if (!isDone) return false;
      }

      return true;
    });

    // Sort tasks: completed first, then by area
    relevantTasks.sort((a, b) => {
      const aDone = (a.status || "").toLowerCase().includes("conclu") || a.progress === 100 ? 1 : 0;
      const bDone = (b.status || "").toLowerCase().includes("conclu") || b.progress === 100 ? 1 : 0;
      if (bDone !== aDone) return bDone - aDone;
      const aArea = a.areaId || (a.areaIds && a.areaIds[0]) || 0;
      const bArea = b.areaId || (b.areaIds && b.areaIds[0]) || 0;
      return aArea - bArea;
    });

    const newSlides: BulletinSlide[] = [];

    // Slide 1: Cover
    newSlides.push({
      id: "slide-cover",
      type: "cover",
      title: "BOLETIM INFORMATIVO",
      subtitle: `${qData.name} de ${selectedYear} • ${qData.months}`,
      notes: "Superintendência de Abastecimento de Água e Esgoto - SAE / ADASA",
    });

    // Content Slides (one per task)
    let itemNumber = 1;
    relevantTasks.forEach(task => {
      const aId = task.areaId || (task.areaIds && task.areaIds[0]);
      const areaObj = areas.find(a => a.id === aId);
      const areaName = areaObj ? `${areaObj.abbreviation ? areaObj.abbreviation + " - " : ""}${areaObj.name}` : "Coordenação Técnica";
      
      const cId = task.categoryIds && task.categoryIds[0];
      const catObj = categories.find(c => c.id === cId);
      const categoryName = catObj?.name || "Processo Geral";

      const isCompleted = (task.status || "").toLowerCase().includes("conclu") || task.progress === 100;
      const statusBadge = isCompleted ? "Concluída no Trimestre" : `${task.progress || 0}% Concluído`;

      // Build timeline cards from child tasks or checklist or milestone dates
      const children = childTasksByParentId.get(task.id) || [];
      const timelineCards: {
        id: string;
        month: string;
        title: string;
        description: string;
        badge?: string;
        completed?: boolean;
      }[] = [];

      if (children.length > 0) {
        children.slice(0, 4).forEach((child, idx) => {
          let monthLabel = "Trimestre";
          const dStr = child.completedAt || child.endDate || child.startDate;
          if (dStr) {
            try {
              const mIdx = parseInt(dStr.split("-")[1], 10) - 1;
              if (mIdx >= 0 && mIdx < 12) monthLabel = MONTH_NAMES[mIdx];
            } catch {
              // fallback
            }
          }
          const childDone = (child.status || "").toLowerCase().includes("conclu") || child.progress === 100;
          timelineCards.push({
            id: `tc-${child.id}`,
            month: monthLabel,
            title: child.title,
            description: child.description || (childDone ? "Entrega concluída com êxito." : "Etapa técnica em andamento."),
            badge: childDone ? "Concluída" : `${child.progress || 0}%`,
            completed: childDone,
          });
        });
      } else if (task.checklist && task.checklist.length > 0) {
        task.checklist.slice(0, 4).forEach((chk, idx) => {
          const qMonths = qData.monthNumbers.map(m => MONTH_NAMES[m]);
          const mLabel = qMonths[idx % qMonths.length];
          timelineCards.push({
            id: `chk-${chk.id}`,
            month: mLabel,
            title: chk.text,
            description: chk.completed ? "Requisito verificado e finalizado." : "Fase do procedimento em execução.",
            badge: chk.completed ? "Entregue" : "Em curso",
            completed: chk.completed,
          });
        });
      } else {
        // Fallback milestones based on quarter months
        const qMonths = qData.monthNumbers.map(m => MONTH_NAMES[m]);
        timelineCards.push({
          id: `card-1`,
          month: qMonths[0],
          title: "Instrução Técnica e Planejamento",
          description: task.startDate ? `Início formalizado em ${formatBR(task.startDate)}.` : "Início das análises regulatórias e documentais.",
          badge: "Fase 1",
          completed: true,
        });
        timelineCards.push({
          id: `card-2`,
          month: qMonths[1],
          title: "Execução e Consolidação",
          description: "Desenvolvimento dos estudos técnicos, relatórios de conformidade e minutas deliberativas.",
          badge: "Fase 2",
          completed: task.progress ? task.progress >= 50 : false,
        });
        timelineCards.push({
          id: `card-3`,
          month: qMonths[2],
          title: isCompleted ? "Conclusão e Homologação" : "Consolidação e Encaminhamentos",
          description: isCompleted
            ? `Atividade finalizada em ${formatBR(task.completedAt || task.endDate)}.`
            : "Avanço das etapas finais para deliberação.",
          badge: isCompleted ? "Finalizado" : "Em curso",
          completed: isCompleted,
        });
      }

      // Photos from fiscalizacaoData if present
      const photos: { id: string; url: string; caption: string }[] = [];
      if (task.fiscalizacaoData && Array.isArray(task.fiscalizacaoData.imagens) && task.fiscalizacaoData.imagens.length > 0) {
        task.fiscalizacaoData.imagens.slice(0, 3).forEach((url, pIdx) => {
          photos.push({
            id: `photo-${pIdx}`,
            url,
            caption: `Registro fotográfico de fiscalização in loco #${pIdx + 1}`,
          });
        });
      }

      // Default layout choice:
      // If task is fiscalização with photos -> "photos"
      // If task has child tasks / timeline -> "timeline"
      // Otherwise -> "indicators" or "timeline"
      let defaultLayout: SlideLayout = "timeline";
      if (photos.length > 0 || task.taskType === "fiscalizacao") {
        defaultLayout = "photos";
      }

      // Narrative text
      const narrative = task.description ||
        `Ação coordenada para aprimoramento dos serviços públicos delegados de saneamento básico, visando a segurança hídrica, a sustentabilidade econômico-financeira e a garantia dos direitos dos usuários do Distrito Federal.`;

      // Deliveries checklist
      const deliveries = (task.checklist || []).map(c => c.text);
      if (deliveries.length === 0) {
        deliveries.push("Instrução processual completa no SEI");
        deliveries.push("Elaboração de Nota Técnica e Parecer de Conformidade");
        if (isCompleted) deliveries.push("Publicação do ato regulatório e arquivamento");
      }

      // Indicators
      const indicators = [
        { label: "Progresso Consolidado", value: `${task.progress || 0}%`, color: isCompleted ? "text-emerald-500" : "text-sky-500" },
        { label: "Data de Início", value: formatBR(task.startDate), color: "text-slate-700" },
        { label: "Previsão / Término", value: formatBR(task.completedAt || task.endDate), color: "text-slate-700" },
        { label: "Responsável", value: task.assignedTo || "Equipe Técnica SAE", color: "text-slate-800" },
      ];

      newSlides.push({
        id: `slide-task-${task.id}`,
        type: "content",
        layout: defaultLayout,
        orderNumber: itemNumber++,
        title: task.title,
        subtitle: task.seiProcess ? `Processo SEI: ${task.seiProcess}` : undefined,
        areaId: aId,
        areaName,
        categoryName,
        seiProcess: task.seiProcess,
        statusBadge,
        progress: task.progress || 0,
        narrative,
        timelineCards,
        photos,
        indicators,
        deliveries,
        taskId: task.id,
      });
    });

    // Slide 2: Table of Contents (Inserted right after Cover)
    const tocSlide: BulletinSlide = {
      id: "slide-toc",
      type: "toc",
      title: "NESTE BOLETIM INFORMATIVO",
      subtitle: `Resumo das atividades regulatórias e operacionais reportadas no ${qData.name} de ${selectedYear}.`,
      notes: `Total de ${newSlides.length - 1} entregas estruturadas na Superintendência de Abastecimento de Água e Esgoto.`,
    };
    newSlides.splice(1, 0, tocSlide);

    // Slide: Institutional Panel Highlight (divulgando canais 115, Ouvidoria, etc.)
    newSlides.push({
      id: "slide-institutional",
      type: "institutional",
      title: "PAINÉIS DE MONITORAMENTO & PARTICIPAÇÃO SOCIAL",
      subtitle: "Acompanhe os dados operacionais e o estoque regulatório em tempo real.",
      notes: "Canais oficiais de transparência e atendimento da ADASA",
    });

    // Slide: Back Cover
    newSlides.push({
      id: "slide-backcover",
      type: "backcover",
      title: "SUPERINTENDÊNCIA DE ABASTECIMENTO DE ÁGUA E ESGOTO",
      subtitle: "ADASA • Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal",
      notes: "Setor Ferroviário, Parque Ferroviário de Brasília • www.adasa.df.gov.br",
    });

    setSlides(newSlides);
    setCurrentSlideIndex(0);
  };

  // Run initial generation when modal opens
  useEffect(() => {
    if (isOpen) {
      generateSlides();
    }
  }, [isOpen]);

  // Keyboard navigation in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === "Space") {
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        prevSlide();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, slides.length, currentSlideIndex]);

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  // Slide Layout Switcher for active slide
  const changeCurrentSlideLayout = (layout: SlideLayout) => {
    setSlides(prev =>
      prev.map((s, idx) => (idx === currentSlideIndex ? { ...s, layout } : s))
    );
    showToast("Layout Alterado", `Layout alterado para "${layout === "timeline" ? "Linha do Tempo" : layout === "photos" ? "Fotográfico" : "Indicadores"}"`, "info");
  };

  // Update text of current slide
  const updateSlideField = (field: keyof BulletinSlide, value: any) => {
    setSlides(prev =>
      prev.map((s, idx) => (idx === currentSlideIndex ? { ...s, [field]: value } : s))
    );
  };

  // Print / Export to PDF
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Aviso", "Permita pop-ups no seu navegador para exportar o PDF.", "warning");
      return;
    }

    // Build standalone HTML for all slides with exact 16:9 page dimensions
    let slidesHtml = "";
    slides.forEach((slide, idx) => {
      slidesHtml += renderSlideToHtml(slide, idx, slides.length, quarterInfo, selectedYear);
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Boletim_Trimestral_${selectedQuarter}T_${selectedYear}_ADASA</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          @page {
            size: 297mm 167mm; /* 16:9 widescreen landscape */
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #ffffff;
            color: #0f172a;
          }
          
          .slide-page {
            width: 297mm;
            height: 167mm;
            page-break-after: always;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            background: #ffffff;
          }
          
          .slide-page:last-child {
            page-break-after: avoid;
          }
          
          /* Utility Classes */
          .bg-dark { background-color: #0b1e36; color: #ffffff; }
          .bg-slate-light { background-color: #f8fafc; }
          .text-cyan { color: #0284c7; }
          .text-emerald { color: #059669; }
          .text-muted { color: #64748b; }
          
          @media print {
            body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${slidesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  };

  // Helper to render static HTML for print
  const renderSlideToHtml = (
    slide: BulletinSlide,
    index: number,
    total: number,
    qInfo: typeof QUARTERS[0],
    year: number
  ): string => {
    // 1. Cover Slide
    if (slide.type === "cover") {
      return `
        <div class="slide-page bg-dark" style="padding: 30mm 25mm 20mm 25mm; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid rgba(255,255,255,0.15); padding-bottom: 15px;">
            <div>
              <div style="font-size: 13px; font-weight: 800; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">GOVERNO DO DISTRITO FEDERAL</div>
              <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); margin-top: 4px;">ADASA • AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO</div>
            </div>
            <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 6px 14px; font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">
              SAE - Superintendência de Água e Esgoto
            </div>
          </div>

          <div style="margin: 20mm 0 10mm 0;">
            <div style="display: inline-block; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 6px; margin-bottom: 12px;">
              INFORMATIVO REGULATÓRIO & OPERACIONAL
            </div>
            <h1 style="font-size: 42px; font-weight: 900; line-height: 1.05; letter-spacing: -1px; text-transform: uppercase; color: #ffffff;">
              ${slide.title}
            </h1>
            <h2 style="font-size: 20px; font-weight: 700; color: #94a3b8; margin-top: 10px;">
              ${slide.subtitle || `${qInfo.name} de ${year} • ${qInfo.months}`}
            </h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 10mm;">
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px;">
              <div style="font-size: 10px; font-weight: 900; color: #38bdf8; text-transform: uppercase;">CORA</div>
              <div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 4px;">Regulação Econômica</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Revisões, tarifas e normas</div>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px;">
              <div style="font-size: 10px; font-weight: 900; color: #34d399; text-transform: uppercase;">COFA</div>
              <div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 4px;">Fiscalização Operacional</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Vistorias de campo e não conformidades</div>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px;">
              <div style="font-size: 10px; font-weight: 900; color: #fbbf24; text-transform: uppercase;">COQA</div>
              <div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 4px;">Qualidade do Atendimento</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Demandas da Ouvidoria e recursos</div>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 14px;">
              <div style="font-size: 10px; font-weight: 900; color: #c084fc; text-transform: uppercase;">GESTÃO</div>
              <div style="font-size: 12px; font-weight: 700; color: #ffffff; margin-top: 4px;">Estoque & Estratégia</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Agenda regulatória e publicações</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px; font-size: 10px; color: #94a3b8;">
            <span>ADASA - Setor Ferroviário, Parque Ferroviário de Brasília • www.adasa.df.gov.br</span>
            <span>Edição Trimestral Oficial • Superintendência SAE</span>
          </div>
        </div>
      `;
    }

    // 2. Table of Contents Slide
    if (slide.type === "toc") {
      const contentSlides = slides.filter(s => s.type === "content");
      const col1 = contentSlides.slice(0, Math.ceil(contentSlides.length / 2));
      const col2 = contentSlides.slice(Math.ceil(contentSlides.length / 2));

      const renderTocCol = (items: BulletinSlide[]) => items.map(it => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 8px;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            ${String(it.orderNumber || 0).padStart(2, "0")}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 11px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${it.title}</div>
            <div style="font-size: 9px; font-weight: 600; color: #64748b;">${it.areaName || "Coordenação SAE"}</div>
          </div>
          <span style="font-size: 9px; font-weight: 800; color: #0284c7; background: #f0f9ff; padding: 2px 8px; border-radius: 6px;">Pág. ${it.orderNumber ? it.orderNumber + 2 : ""}</span>
        </div>
      `).join("");

      return `
        <div class="slide-page bg-slate-light" style="padding: 15mm 20mm; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;">
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #0284c7; letter-spacing: 1.5px; text-transform: uppercase;">ÍNDICE EXECUTIVO</div>
              <h2 style="font-size: 26px; font-weight: 900; color: #0b1e36; text-transform: uppercase; margin-top: 2px;">${slide.title}</h2>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b;">${qInfo.name} de ${year}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; overflow: hidden;">
            <div>${renderTocCol(col1)}</div>
            <div>${renderTocCol(col2)}</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8;">
            <span>BOLETIM INFORMATIVO TRIMESTRAL • SAE / ADASA</span>
            <span>Página ${index + 1} de ${total}</span>
          </div>
        </div>
      `;
    }

    // 3. Content Slide
    if (slide.type === "content") {
      const orderBadge = String(slide.orderNumber || index).padStart(2, "0");
      let bodyContent = "";

      // Layout A: Timeline / Cards
      if (slide.layout === "timeline" || !slide.layout) {
        const cardsHtml = (slide.timelineCards || []).map(c => `
          <div style="flex: 1; background: #ffffff; border: 1px solid ${c.completed ? "#86efac" : "#cbd5e1"}; border-top: 4px solid ${c.completed ? "#10b981" : "#0284c7"}; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0284c7;">${c.month}</span>
                <span style="font-size: 9px; font-weight: 800; background: ${c.completed ? "#dcfce7" : "#f1f5f9"}; color: ${c.completed ? "#15803d" : "#475569"}; padding: 2px 6px; border-radius: 4px;">${c.badge || ""}</span>
              </div>
              <h4 style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; line-height: 1.25;">${c.title}</h4>
              <p style="font-size: 10px; color: #475569; line-height: 1.35;">${c.description}</p>
            </div>
            <div style="margin-top: 10px; font-size: 9px; font-weight: 700; color: ${c.completed ? "#16a34a" : "#64748b"};">
              ${c.completed ? "✓ Marco Concluído" : "⏳ Em Andamento"}
            </div>
          </div>
        `).join("");

        bodyContent = `
          <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between; gap: 15px;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
              <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Síntese Executiva da Atividade</h4>
              <p style="font-size: 12px; color: #334155; line-height: 1.5;">${slide.narrative || ""}</p>
            </div>

            <div style="display: flex; gap: 14px; flex: 1;">
              ${cardsHtml}
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
              <div><strong>Coordenação Responsável:</strong> ${slide.areaName || "-"}</div>
              <div><strong>Processo SEI:</strong> ${slide.seiProcess || "Não informado"}</div>
              <div><strong>Status:</strong> <span style="font-weight: 800; color: #0284c7;">${slide.statusBadge || "-"}</span></div>
            </div>
          </div>
        `;
      } else if (slide.layout === "photos") {
        // Layout B: Photos & Narrative
        const photosHtml = (slide.photos || []).map(p => `
          <div style="flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
            <div style="height: 110px; background: #e2e8f0; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="${p.url}" style="width: 100%; height: 100%; object-fit: cover;" alt="${p.caption}" onerror="this.style.display='none';" />
            </div>
            <div style="padding: 6px 10px; font-size: 9px; color: #475569; font-weight: 600;">${p.caption}</div>
          </div>
        `).join("");

        bodyContent = `
          <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; height: 100%;">
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0284c7; margin-bottom: 8px;">Relatório Técnico Operacional</h4>
                <p style="font-size: 12px; color: #334155; line-height: 1.5; margin-bottom: 12px;">${slide.narrative || ""}</p>
                <div style="margin-top: 10px;">
                  <h5 style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Principais Constatações / Ações:</h5>
                  <ul style="font-size: 11px; color: #475569; padding-left: 16px; line-height: 1.4;">
                    ${(slide.deliveries || []).slice(0, 4).map(d => `<li>${d}</li>`).join("")}
                  </ul>
                </div>
              </div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #64748b;">
                <strong>Área:</strong> ${slide.areaName || "-"} • <strong>SEI:</strong> ${slide.seiProcess || "-"}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; height: 100%;">
              ${photosHtml || `
                <div style="flex: 1; background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; text-align: center; padding: 20px;">
                  <span>Nenhum registro fotográfico anexado.</span>
                  <span style="font-size: 9px; margin-top: 4px;">(Fotos da fiscalização ou vistoria podem ser adicionadas no modo de edição)</span>
                </div>
              `}
            </div>
          </div>
        `;
      } else {
        // Layout C: Indicators & Metas
        const indHtml = (slide.indicators || []).map(ind => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">${ind.label}</div>
            <div style="font-size: 24px; font-weight: 900; margin-top: 4px; color: #0284c7;">${ind.value}</div>
          </div>
        `).join("");

        bodyContent = `
          <div style="display: flex; flex-direction: column; gap: 16px; height: 100%;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              ${indHtml}
            </div>

            <div style="flex: 1; display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Detalhamento da Execução</h4>
                <p style="font-size: 12px; color: #334155; line-height: 1.5;">${slide.narrative || ""}</p>
              </div>

              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
                <h4 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">Entregas Programadas</h4>
                <ul style="font-size: 11px; color: #475569; padding-left: 16px; line-height: 1.5;">
                  ${(slide.deliveries || []).map(d => `<li>${d}</li>`).join("")}
                </ul>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="slide-page bg-slate-light" style="padding: 12mm 20mm; justify-content: space-between;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: #0b1e36; color: #ffffff; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ${orderBadge}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 10px; font-weight: 900; background: #0284c7; color: #ffffff; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                    ${slide.areaName || "Coordenação SAE"}
                  </span>
                  ${slide.categoryName ? `<span style="font-size: 10px; font-weight: 700; color: #64748b;">${slide.categoryName}</span>` : ""}
                </div>
                <h3 style="font-size: 17px; font-weight: 900; color: #0b1e36; text-transform: uppercase; margin-top: 3px; line-height: 1.2;">
                  ${slide.title}
                </h3>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 4px 10px; border-radius: 6px; display: inline-block;">
                ${slide.statusBadge || "Atividade Ativa"}
              </span>
              <div style="font-size: 9px; font-weight: 700; color: #94a3b8; margin-top: 4px;">${qInfo.name} de ${year}</div>
            </div>
          </div>

          <!-- Body -->
          <div style="flex: 1; margin: 15px 0; overflow: hidden;">
            ${bodyContent}
          </div>

          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 9px; color: #94a3b8;">
            <span>BOLETIM INFORMATIVO TRIMESTRAL • SAE / ADASA</span>
            <span>Página ${index + 1} de ${total}</span>
          </div>
        </div>
      `;
    }

    // 4. Institutional Slide
    if (slide.type === "institutional") {
      return `
        <div class="slide-page bg-dark" style="padding: 15mm 20mm; justify-content: space-between;">
          <div style="border-bottom: 2px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
            <div style="font-size: 10px; font-weight: 900; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase;">CANAIS INSTITUCIONAIS & PARTICIPAÇÃO SOCIAL</div>
            <h2 style="font-size: 26px; font-weight: 900; color: #ffffff; text-transform: uppercase; margin-top: 2px;">${slide.title}</h2>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 15px 0;">
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 900; color: #38bdf8; text-transform: uppercase;">Central 115 & Ouvidoria</div>
              <h4 style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 6px;">Qualidade dos Serviços</h4>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 6px; line-height: 1.4;">
                Acompanhamento rigoroso das reclamações de falta d'água, extravasamento de esgoto e prazos de atendimento da Caesb.
              </p>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 900; color: #34d399; text-transform: uppercase;">Estoque Regulatório</div>
              <h4 style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 6px;">Transparência Normativa</h4>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 6px; line-height: 1.4;">
                Catálogo consolidado e simplificado das resoluções da SAE em vigor, revogadas e em processo de revisão pública.
              </p>
            </div>
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 18px;">
              <div style="font-size: 12px; font-weight: 900; color: #fbbf24; text-transform: uppercase;">Consumo per Capita</div>
              <h4 style="font-size: 14px; font-weight: 800; color: #ffffff; margin-top: 6px;">Monitoramento do DF</h4>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 6px; line-height: 1.4;">
                Indicadores mensais de consumo médio de água no Distrito Federal, apoiando o uso racional e a sustentabilidade dos mananciais.
              </p>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; font-size: 9px; color: #94a3b8;">
            <span>ADASA - Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal</span>
            <span>Página ${index + 1} de ${total}</span>
          </div>
        </div>
      `;
    }

    // 5. Back Cover Slide
    return `
      <div class="slide-page bg-dark" style="padding: 25mm 25mm 20mm 25mm; justify-content: space-between; text-align: center;">
        <div style="border-bottom: 2px solid rgba(255,255,255,0.15); padding-bottom: 15px;">
          <div style="font-size: 12px; font-weight: 900; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase;">GOVERNO DO DISTRITO FEDERAL</div>
          <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); margin-top: 4px;">AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL - ADASA</div>
        </div>

        <div style="margin: 15mm auto;">
          <h2 style="font-size: 28px; font-weight: 900; color: #ffffff; text-transform: uppercase;">
            ${slide.title}
          </h2>
          <p style="font-size: 14px; font-weight: 600; color: #94a3b8; margin-top: 10px; max-width: 600px; margin-left: auto; margin-right: auto;">
            Trabalhando continuamente pela excelência regulatória, garantia da segurança hídrica e universalização do saneamento no Distrito Federal.
          </p>
        </div>

        <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; padding: 15px 25px; display: inline-flex; justify-content: center; gap: 40px; margin: 0 auto; font-size: 11px; color: #e2e8f0;">
          <div><strong>Endereço:</strong> Setor Ferroviário, Parque Ferroviário de Brasília</div>
          <div><strong>Ouvidoria:</strong> 162 ou 115</div>
          <div><strong>Portal:</strong> www.adasa.df.gov.br</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 10px; font-size: 10px; color: #94a3b8;">
          <span>${qInfo.name} de ${year}</span>
          <span>Boletim Informativo Trimestral • SAE / ADASA</span>
        </div>
      </div>
    `;
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[120] flex flex-col bg-slate-950/80 backdrop-blur-md transition-all duration-300",
      isFullscreen ? "p-0" : "p-2 sm:p-4 md:p-6"
    )}>
      {/* Top Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 rounded-t-3xl flex items-center justify-between gap-3 text-white shadow-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 text-sky-400 border border-sky-400/30 rounded-xl">
            <Presentation size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                Boletim Informativo Trimestral de Atividades
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 hidden sm:inline-block">
                16:9 Widescreen
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {quarterInfo.name} de {selectedYear} • {slides.length} slides gerados
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Filters Toggle Button */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
              isFiltersOpen
                ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
            )}
            title="Configurar Trimestre, Ano e Filtros"
          >
            <Filter size={14} />
            <span className="hidden md:inline">Filtros & Período</span>
            {isFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Regenerate Button */}
          <button
            onClick={generateSlides}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Recarregar e regerar slides com os filtros atuais"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Regerar</span>
          </button>

          {/* Toggle Edit Mode */}
          <button
            onClick={() => setIsEditingActive(!isEditingActive)}
            className={cn(
              "p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
              isEditingActive
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
            )}
            title="Editar textos e títulos diretamente nos slides"
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">{isEditingActive ? "Modo Edição Ativo" : "Editar Conteúdo"}</span>
          </button>

          {/* Export PDF / Print */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-emerald-900/30"
            title="Exportar para PDF em formato de slides 16:9 sem margens"
          >
            <Printer size={14} />
            <span>Exportar PDF</span>
          </button>

          {/* Fullscreen Mode */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia (ESC)" : "Apresentar em Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 hover:border-rose-500 rounded-xl transition-all cursor-pointer"
            title="Fechar Boletim"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Expandable Filter & Configuration Bar */}
      {isFiltersOpen && (
        <div className="bg-slate-850 border-b border-slate-750 p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Ano de Referência
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Quarter Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Trimestre de Apuração
              </label>
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500"
              >
                {QUARTERS.map(q => (
                  <option key={q.id} value={q.id}>
                    {q.label} ({q.months.split(" / ")[0]} a {q.months.split(" / ")[2]})
                  </option>
                ))}
              </select>
            </div>

            {/* Area Filter */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Área / Coordenação
              </label>
              <select
                value={selectedAreaId}
                onChange={e => setSelectedAreaId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500"
              >
                <option value="all">Todas as Áreas da SAE</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.abbreviation ? `${a.abbreviation} - ` : ""}{a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkbox Options */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={parentTasksOnly}
                  onChange={e => setParentTasksOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-sky-500"
                />
                <span>Apenas Tarefas Pai (Padrão)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={includeOnlyCompleted}
                  onChange={e => setIncludeOnlyCompleted(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span>Apenas Entregas Concluídas</span>
              </label>
            </div>

            {/* Apply & Regenerate */}
            <div>
              <button
                onClick={() => {
                  generateSlides();
                  setIsFiltersOpen(false);
                  showToast("Boletim Atualizado", `Slides gerados para o ${quarterInfo.name} de ${selectedYear}.`, "success");
                }}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-wider text-xs py-2 px-4 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Aplicar e Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Slide Workspace */}
      <div 
        ref={containerRef}
        className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative"
      >
        {/* Navigation Arrow Left */}
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white disabled:opacity-20 disabled:hover:bg-slate-900/80 flex items-center justify-center transition shadow-lg cursor-pointer border border-slate-700"
          title="Slide Anterior (Seta Esquerda)"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Navigation Arrow Right */}
        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white disabled:opacity-20 disabled:hover:bg-slate-900/80 flex items-center justify-center transition shadow-lg cursor-pointer border border-slate-700"
          title="Próximo Slide (Seta Direita / Espaço)"
        >
          <ChevronRight size={24} />
        </button>

        {/* Slide Stage: 16:9 Aspect Ratio Container */}
        <div className="w-full max-w-6xl aspect-[16/9] max-h-[75vh] bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col border border-slate-700/60 select-text">
          {currentSlide && renderInteractiveSlide(
            currentSlide,
            currentSlideIndex,
            slides.length,
            quarterInfo,
            selectedYear,
            isEditingActive,
            updateSlideField,
            changeCurrentSlideLayout
          )}
        </div>

        {/* Slide Layout Switcher Bar for Content slides */}
        {currentSlide && currentSlide.type === "content" && (
          <div className="mt-2 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Layout do Slide:</span>
            <button
              onClick={() => changeCurrentSlideLayout("timeline")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                currentSlide.layout === "timeline" ? "bg-sky-600 text-white" : "hover:bg-slate-800 text-slate-400"
              )}
            >
              Linha do Tempo
            </button>
            <button
              onClick={() => changeCurrentSlideLayout("photos")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                currentSlide.layout === "photos" ? "bg-sky-600 text-white" : "hover:bg-slate-800 text-slate-400"
              )}
            >
              Fotográfico / Vistoria
            </button>
            <button
              onClick={() => changeCurrentSlideLayout("indicators")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer",
                currentSlide.layout === "indicators" ? "bg-sky-600 text-white" : "hover:bg-slate-800 text-slate-400"
              )}
            >
              Metas & Indicadores
            </button>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 rounded-b-3xl flex items-center gap-2.5 overflow-x-auto scrollbar-thin flex-shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
          Slide {currentSlideIndex + 1} de {slides.length}
        </span>
        
        <div className="flex items-center gap-2 flex-1 overflow-x-auto py-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={cn(
                "h-12 aspect-[16/9] rounded-lg border text-left p-1 text-[9px] font-bold flex flex-col justify-between shrink-0 transition-all cursor-pointer overflow-hidden",
                idx === currentSlideIndex
                  ? "border-sky-500 ring-2 ring-sky-500/50 bg-slate-800 text-white shadow-md scale-105"
                  : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              )}
              title={s.title}
            >
              <span className="truncate w-full block">
                {s.type === "cover" ? "00 • Capa" : s.type === "toc" ? "00 • Índice" : `${String(s.orderNumber || idx).padStart(2, "0")} • ${s.areaName?.split(" - ")[0] || s.title}`}
              </span>
              <span className="text-[8px] opacity-75 truncate">{s.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Interactive Slide Renderer for On-Screen View
function renderInteractiveSlide(
  slide: BulletinSlide,
  index: number,
  total: number,
  qInfo: typeof QUARTERS[0],
  year: number,
  isEditing: boolean,
  updateField: (field: keyof BulletinSlide, value: any) => void,
  changeLayout: (layout: SlideLayout) => void
) {
  // 1. Cover Slide
  if (slide.type === "cover") {
    return (
      <div className="w-full h-full bg-[#0b1e36] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden select-text">
        {/* Decorative glowing gradient backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-white/15 pb-4 relative z-10">
          <div>
            <span className="text-xs font-black tracking-widest text-sky-400 uppercase block">
              GOVERNO DO DISTRITO FEDERAL
            </span>
            <span className="text-xs font-semibold text-white/70 block mt-0.5">
              ADASA • AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO
            </span>
          </div>
          <div className="bg-sky-500/20 border border-sky-400/40 rounded-xl px-3.5 py-1.5 text-xs font-black text-sky-300 uppercase tracking-wider">
            SAE - Superintendência de Água e Esgoto
          </div>
        </div>

        {/* Center Title Block */}
        <div className="my-auto relative z-10 space-y-3">
          <div className="inline-block bg-sky-600 text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm">
            INFORMATIVO REGULATÓRIO & OPERACIONAL
          </div>

          {isEditing ? (
            <input
              type="text"
              value={slide.title}
              onChange={e => updateField("title", e.target.value)}
              className="text-3xl md:text-5xl font-black uppercase text-white bg-white/10 border border-white/20 rounded-xl px-3 py-1 w-full outline-none focus:border-sky-400"
            />
          ) : (
            <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase leading-tight text-white">
              {slide.title}
            </h1>
          )}

          {isEditing ? (
            <input
              type="text"
              value={slide.subtitle || ""}
              onChange={e => updateField("subtitle", e.target.value)}
              className="text-lg md:text-xl font-bold text-sky-200 bg-white/10 border border-white/20 rounded-xl px-3 py-1 w-full outline-none focus:border-sky-400"
            />
          ) : (
            <h2 className="text-lg md:text-2xl font-bold text-slate-300">
              {slide.subtitle || `${qInfo.name} de ${year} • ${qInfo.months}`}
            </h2>
          )}
        </div>

        {/* Bottom Area Feature Ribbon */}
        <div className="grid grid-cols-4 gap-3 relative z-10 mb-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
            <span className="text-[10px] font-black uppercase text-sky-400 block">CORA</span>
            <span className="text-xs font-bold text-white block mt-0.5">Regulação Econômica</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Revisões, tarifas e normas</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
            <span className="text-[10px] font-black uppercase text-emerald-400 block">COFA</span>
            <span className="text-xs font-bold text-white block mt-0.5">Fiscalização Operacional</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Vistorias técnicas e sanções</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
            <span className="text-[10px] font-black uppercase text-amber-400 block">COQA</span>
            <span className="text-xs font-bold text-white block mt-0.5">Qualidade do Atendimento</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Demandas e ouvidoria</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
            <span className="text-[10px] font-black uppercase text-purple-400 block">GESTÃO</span>
            <span className="text-xs font-bold text-white block mt-0.5">Estoque & Estratégia</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Agenda regulatória e metas</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-white/15 pt-3 text-[10px] text-slate-400 relative z-10">
          <span>ADASA - Setor Ferroviário, Parque Ferroviário de Brasília • www.adasa.df.gov.br</span>
          <span>Edição Trimestral Oficial • Superintendência SAE</span>
        </div>
      </div>
    );
  }

  // 2. Table of Contents Slide
  if (slide.type === "toc") {
    return (
      <div className="w-full h-full bg-slate-50 text-slate-900 p-8 md:p-12 flex flex-col justify-between select-text">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3">
          <div>
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">
              ÍNDICE EXECUTIVO
            </span>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-0.5">
              {slide.title}
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {qInfo.name} de ${year}
          </span>
        </div>

        {/* Content Notice / Guide */}
        <div className="my-auto py-4">
          <p className="text-xs text-slate-600 mb-4 font-medium">
            {slide.subtitle || `Resumo de entregas e acompanhamento por coordenação da SAE.`}
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
              Estrutura Organizacional do Boletim
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl">
                <span className="text-lg font-black text-sky-700 block">CORA</span>
                <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Regulação Econômica & Contratual</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-lg font-black text-emerald-700 block">COFA</span>
                <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Fiscalização dos Serviços de Água e Esgoto</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-lg font-black text-amber-700 block">COQA</span>
                <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Qualidade, Recursos e Ouvidoria</span>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                <span className="text-lg font-black text-purple-700 block">ESTRATÉGIA</span>
                <span className="text-[11px] font-semibold text-slate-600 mt-1 block">Agenda Regulatória e Participação Social</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          <span>BOLETIM INFORMATIVO TRIMESTRAL • SAE / ADASA</span>
          <span>Página {index + 1} de {total}</span>
        </div>
      </div>
    );
  }

  // 3. Content Slide
  if (slide.type === "content") {
    const orderBadge = String(slide.orderNumber || index).padStart(2, "0");

    return (
      <div className="w-full h-full bg-slate-50 text-slate-900 p-6 md:p-8 flex flex-col justify-between select-text overflow-hidden">
        {/* Slide Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white text-lg font-black flex items-center justify-center shrink-0 shadow-md">
              {orderBadge}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white px-2.5 py-0.5 rounded-md">
                  {slide.areaName || "Coordenação SAE"}
                </span>
                {slide.categoryName && (
                  <span className="text-[10px] font-bold text-slate-500 truncate">
                    • {slide.categoryName}
                  </span>
                )}
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={slide.title}
                  onChange={e => updateField("title", e.target.value)}
                  className="text-base font-black uppercase text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-0.5 w-full mt-1 outline-none focus:border-sky-500"
                />
              ) : (
                <h3 className="text-base font-black text-slate-900 uppercase leading-snug truncate mt-0.5">
                  {slide.title}
                </h3>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full">
              {slide.statusBadge || "Ativa"}
            </span>
            <span className="text-[10px] text-slate-400 block font-bold mt-1">
              {qInfo.name} de {year}
            </span>
          </div>
        </div>

        {/* Slide Body */}
        <div className="flex-1 py-3 overflow-hidden">
          {/* Layout A: Timeline Cards */}
          {(slide.layout === "timeline" || !slide.layout) && (
            <div className="h-full flex flex-col justify-between gap-3">
              {/* Narrative Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Síntese Executiva da Atividade
                </span>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={slide.narrative || ""}
                    onChange={e => updateField("narrative", e.target.value)}
                    className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-sky-500"
                  />
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {slide.narrative}
                  </p>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1">
                {(slide.timelineCards || []).map((card, cIdx) => (
                  <div
                    key={card.id || cIdx}
                    className={cn(
                      "bg-white border rounded-2xl p-3 flex flex-col justify-between shadow-xs transition-all",
                      card.completed
                        ? "border-emerald-200 border-t-4 border-t-emerald-500"
                        : "border-slate-200 border-t-4 border-t-sky-500"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase text-sky-600">
                          {card.month}
                        </span>
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full",
                          card.completed ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                        )}>
                          {card.badge || (card.completed ? "Entregue" : "Em curso")}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-snug">
                        {card.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold flex items-center justify-between">
                      <span className={card.completed ? "text-emerald-600" : "text-sky-600"}>
                        {card.completed ? "✓ Marco Concluído" : "⏳ Em Andamento"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Meta Bar */}
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-slate-600 shadow-2xs">
                <span><strong>Coordenação:</strong> {slide.areaName || "-"}</span>
                <span><strong>Processo SEI:</strong> {slide.seiProcess || "Não informado"}</span>
                <span><strong>Progresso Geral:</strong> <strong className="text-sky-600">{slide.progress || 0}%</strong></span>
              </div>
            </div>
          )}

          {/* Layout B: Photos & Narrative */}
          {slide.layout === "photos" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider block mb-1">
                    Relatório Técnico Operacional
                  </span>
                  {isEditing ? (
                    <textarea
                      rows={5}
                      value={slide.narrative || ""}
                      onChange={e => updateField("narrative", e.target.value)}
                      className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-sky-500"
                    />
                  ) : (
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {slide.narrative}
                    </p>
                  )}

                  <div className="mt-4">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                      Constatações & Recomendações
                    </span>
                    <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                      {(slide.deliveries || []).slice(0, 4).map((d, dIdx) => (
                        <li key={dIdx} className="leading-snug">{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span><strong>Área:</strong> {slide.areaName}</span>
                  <span><strong>SEI:</strong> {slide.seiProcess || "-"}</span>
                </div>
              </div>

              {/* Photos Column */}
              <div className="flex flex-col gap-3 h-full">
                {slide.photos && slide.photos.length > 0 ? (
                  slide.photos.map((photo, pIdx) => (
                    <div key={photo.id || pIdx} className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-xs">
                      <div className="flex-1 bg-slate-100 overflow-hidden relative">
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="p-2 text-[10px] font-semibold text-slate-600 bg-slate-50 border-t border-slate-100 truncate">
                        📷 {photo.caption}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-white">
                    <ImageIcon size={36} className="text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Nenhum registro fotográfico anexado</span>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Atividades do tipo fiscalização com imagens cadastradas exibem as fotos automaticamente aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Layout C: Indicators */}
          {slide.layout === "indicators" && (
            <div className="h-full flex flex-col justify-between gap-3">
              <div className="grid grid-cols-4 gap-3">
                {(slide.indicators || []).map((ind, iIdx) => (
                  <div key={iIdx} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {ind.label}
                    </span>
                    <span className="text-2xl font-black text-sky-600 block mt-1">
                      {ind.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                    Detalhamento da Execução
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {slide.narrative}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                    Entregas do Trimestre
                  </span>
                  <ul className="text-xs text-slate-700 space-y-2 pl-4 list-disc font-medium">
                    {(slide.deliveries || []).map((d, dIdx) => (
                      <li key={dIdx}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Slide Footer */}
        <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-[10px] text-slate-400 flex-shrink-0">
          <span>BOLETIM INFORMATIVO TRIMESTRAL • SAE / ADASA</span>
          <span>Página {index + 1} de {total}</span>
        </div>
      </div>
    );
  }

  // 4. Institutional Slide
  if (slide.type === "institutional") {
    return (
      <div className="w-full h-full bg-[#0b1e36] text-white p-8 md:p-12 flex flex-col justify-between select-text">
        <div className="border-b border-white/15 pb-3">
          <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase block">
            CANAIS INSTITUCIONAIS & PARTICIPAÇÃO SOCIAL
          </span>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mt-0.5">
            {slide.title}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 my-auto py-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-xs font-black uppercase text-sky-400 block">Central 115 & Ouvidoria</span>
            <h4 className="text-sm font-bold text-white mt-1">Qualidade dos Serviços</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Acompanhamento tempestivo de demandas dos usuários do DF relativas ao abastecimento de água e esgotamento sanitário.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-xs font-black uppercase text-emerald-400 block">Estoque Regulatório</span>
            <h4 className="text-sm font-bold text-white mt-1">Transparência Normativa</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Consulta pública completa e simplificada das resoluções vigentes e consolidadas da SAE.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-xs font-black uppercase text-amber-400 block">Consumo per Capita</span>
            <h4 className="text-sm font-bold text-white mt-1">Monitoramento Hídrico</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Indicadores de consumo médio e segurança dos reservatórios operados pela Caesb no Distrito Federal.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-white/15 pt-3 text-[10px] text-slate-400">
          <span>ADASA - Agência Reguladora de Águas, Energia e Saneamento Básico do DF</span>
          <span>Página {index + 1} de {total}</span>
        </div>
      </div>
    );
  }

  // 5. Back Cover Slide
  return (
    <div className="w-full h-full bg-[#0b1e36] text-white p-8 md:p-12 flex flex-col justify-between text-center select-text">
      <div className="border-b border-white/15 pb-4">
        <span className="text-xs font-black tracking-widest text-sky-400 uppercase block">
          GOVERNO DO DISTRITO FEDERAL
        </span>
        <span className="text-xs font-semibold text-white/70 block mt-0.5">
          AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL - ADASA
        </span>
      </div>

      <div className="my-auto py-6 max-w-xl mx-auto space-y-3">
        <h2 className="text-2xl md:text-3xl font-black uppercase text-white leading-tight">
          {slide.title}
        </h2>
        <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
          Trabalhando continuamente pela excelência regulatória, garantia da segurança hídrica e universalização do saneamento no Distrito Federal.
        </p>
      </div>

      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 max-w-2xl mx-auto flex justify-center gap-8 text-xs text-slate-300">
        <div><strong>Endereço:</strong> Setor Ferroviário, Brasília/DF</div>
        <div><strong>Ouvidoria:</strong> 162 ou 115</div>
        <div><strong>Portal:</strong> www.adasa.df.gov.br</div>
      </div>

      <div className="flex justify-between items-center border-t border-white/15 pt-3 text-[10px] text-slate-400">
        <span>{qInfo.name} de {year}</span>
        <span>Boletim Informativo Trimestral • SAE / ADASA</span>
      </div>
    </div>
  );
}
