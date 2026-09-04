import React, { useState } from "react";
import { 
  ArrowRight, 
  FolderKanban, 
  TrendingUp,
  FileText,
  Droplets,
  BookOpen,
  Globe,
  Shield,
  Scale,
  MessageSquare,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Code,
  X,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RequirePermission } from "../lib/auth";

interface ManagerialHubProps {
  onOpenPlanning: () => void;
  onOpenResolutions: () => void;
  onOpenWaterBalance: () => void;
  onOpenPublications: () => void;
  onOpenRegulatoryAgenda: () => void;
  onOpenParticipacaoSocialPainel?: () => void;
  onOpenFiscalizacao?: () => void;
  onOpenRecursoPainel?: () => void;
  isPublic?: boolean;
  showOnlyPublic?: boolean;
  showToast?: (title: string, message: string, type?: "success" | "error" | "warning" | "info") => void;
}

export function ManagerialHub({ 
  onOpenPlanning, 
  onOpenResolutions, 
  onOpenWaterBalance, 
  onOpenPublications,
  onOpenRegulatoryAgenda,
  onOpenParticipacaoSocialPainel,
  onOpenFiscalizacao,
  onOpenRecursoPainel,
  isPublic = false,
  showOnlyPublic = false,
  showToast
}: ManagerialHubProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeShareTab, setActiveShareTab] = useState<"links" | "embed">("links");

  const getBaseUrl = () => {
    return `${window.location.origin}${window.location.pathname}`;
  };

  const publicLinks = [
    {
      id: "hub",
      title: "Portal Geral de Painéis Públicos",
      desc: "Acesso externo com menu de todos os painéis públicos abertos da SAE.",
      param: "?public=publico_hub",
      icon: Globe,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100"
    },
    {
      id: "reg_painel",
      title: "Painel de Resoluções (Estoque Regulatório)",
      desc: "Consulta ao acervo de resoluções vigentes, atas e normas.",
      param: "?public=reg_painel",
      icon: FileText,
      color: "text-blue-600 bg-blue-50 border-blue-100"
    },
    {
      id: "reg_agenda_painel",
      title: "Painel da Agenda Regulatória",
      desc: "Metas, temas, indicadores gráficos e percentual de entregas.",
      param: "?public=reg_agenda_painel",
      icon: BookOpen,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100"
    },
    {
      id: "reg_subsidios_painel",
      title: "Painel de Participação Social",
      desc: "Acompanhamento de consultas públicas, audiências e contribuições.",
      param: "?public=reg_subsidios_painel",
      icon: MessageSquare,
      color: "text-cyan-600 bg-cyan-50 border-cyan-100"
    },
    {
      id: "pub_painel",
      title: "Painel de Publicações",
      desc: "Acervo bibliográfico, relatórios anuais, boletins e pesquisas.",
      param: "?public=pub_painel",
      icon: BookOpen,
      color: "text-purple-600 bg-purple-50 border-purple-100"
    }
  ];

  const handleCopy = (key: string, text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
      if (showToast) {
        showToast("Link Copiado!", `${label} foi copiado para a área de transferência.`, "success");
      }
    }).catch(() => {
      prompt("Copie o link abaixo:", text);
    });
  };

  return (
    <div className="space-y-10 w-full pb-16">
      {/* Dynamic Header Promo Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className={`inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10 text-xs font-bold uppercase tracking-widest ${showOnlyPublic ? "text-emerald-300" : "text-blue-300"}`}>
              {showOnlyPublic ? (
                <>
                  <Globe size={12} className="text-emerald-300 animate-pulse" />
                  ACESSO EXTERNO • PAINÉIS PÚBLICOS
                </>
              ) : (
                <>
                  <TrendingUp size={12} className="text-blue-300 animate-pulse" />
                  GERENCIAL SAE
                </>
              )}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              {showOnlyPublic ? (
                <>
                  Plataforma Pública <br className="hidden sm:block" />
                  de Transparência SAE
                </>
              ) : (
                <>
                  Plataforma de Planejamento <br className="hidden sm:block" />
                  e Gestão da SAE
                </>
              )}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium max-w-lg leading-relaxed">
              {showOnlyPublic 
                ? "Portal aberto de transparência para consulta ao estoque regulatório e acervo de publicações técnicas da Superintendência de Abastecimento de Água e Esgoto."
                : "Central de monitoramento e coordenação das atividades finalísticas e regulatórias da ADASA para superintendentes e técnicos."}
            </p>
          </div>

          {/* Action Buttons in Banner (Public Portal Only) */}
          {showOnlyPublic && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 transition-all rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
              >
                <Share2 size={16} className="text-adasa-dark" />
                <span>Compartilhar Links Públicos</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Module Group */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 px-4 rounded-xl text-sm sm:text-lg font-black uppercase tracking-wider border ${showOnlyPublic ? "bg-emerald-50 text-emerald-800 border-emerald-150" : "bg-blue-50 text-blue-700 border-blue-150"}`}>
              {showOnlyPublic ? "Painéis Externos (Públicos)" : "Painéis Gerenciais"}
            </div>
          </div>
          {showOnlyPublic && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="text-xs font-bold text-slate-600 hover:text-adasa-dark flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Link2 size={14} />
                <span>Links de Acesso Externo</span>
              </button>
            </div>
          )}
        </div>

        {/* Master Row with relevant cards depending on public mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Painel de Atividades Card - PRIVATE */}
          {!showOnlyPublic && (
            <RequirePermission moduleId="planning_dashboard" action="view">
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenPlanning}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
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
            </RequirePermission>
          )}

          {/* Painel de Resoluções Card - PUBLIC */}
          <RequirePermission moduleId="reg_painel" action="view">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full relative"
          >
            <div onClick={onOpenResolutions} className="cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <FileText size={24} />
                </div>
                {showOnlyPublic && (
                  <button
                    type="button"
                    title="Copiar Link Público"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy("card_reg_painel", `${getBaseUrl()}?public=reg_painel`, "Link do Painel de Resoluções");
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200 cursor-pointer"
                  >
                    {copiedKey === "card_reg_painel" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Resoluções</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Acompanhe as resoluções vigentes, atas de audiência, estoque regulatório, normas organizadas e monitoramentos das obrigações legais em formato agregador dinâmico.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
              <button 
                onClick={onOpenResolutions}
                className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
              >
                Abrir Painel de Resoluções <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
              {showOnlyPublic && (
                <button
                  onClick={() => handleCopy("card_reg_painel", `${getBaseUrl()}?public=reg_painel`, "Link do Painel de Resoluções")}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Share2 size={12} /> Compartilhar
                </button>
              )}
            </div>
          </motion.div>
          </RequirePermission>

          {/* Painel da Agenda Regulatória Card - PUBLIC */}
          <RequirePermission moduleId="reg_agenda_painel" action="view">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full relative"
          >
            <div onClick={onOpenRegulatoryAgenda} className="cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={24} className="text-blue-600" />
                </div>
                {showOnlyPublic && (
                  <button
                    type="button"
                    title="Copiar Link Público"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy("card_reg_agenda", `${getBaseUrl()}?public=reg_agenda_painel`, "Link da Agenda Regulatória");
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200 cursor-pointer"
                  >
                    {copiedKey === "card_reg_agenda" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel da Agenda Regulatória</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Acompanhamento estratégico, metas, indicadores gráficos e percentual de entregas dos itens da Agenda Regulatória de forma integrada e visual.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
              <button 
                onClick={onOpenRegulatoryAgenda}
                className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
              >
                Abrir Painel da Agenda <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
              {showOnlyPublic && (
                <button
                  onClick={() => handleCopy("card_reg_agenda", `${getBaseUrl()}?public=reg_agenda_painel`, "Link da Agenda Regulatória")}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Share2 size={12} /> Compartilhar
                </button>
              )}
            </div>
          </motion.div>
          </RequirePermission>

          {/* Painel de Participação Social Card - PUBLIC */}
          <RequirePermission moduleId="reg_subsidios_painel" action="view">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full relative"
          >
            <div onClick={onOpenParticipacaoSocialPainel} className="cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <MessageSquare size={24} className="text-blue-600" />
                </div>
                {showOnlyPublic && (
                  <button
                    type="button"
                    title="Copiar Link Público"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy("card_reg_subsidios", `${getBaseUrl()}?public=reg_subsidios_painel`, "Link de Participação Social");
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200 cursor-pointer"
                  >
                    {copiedKey === "card_reg_subsidios" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Participação Social</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Acompanhamento gerencial das ações de participação social, consultas públicas, tomadas de subsídios, audiências e análise de contribuições.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
              <button 
                onClick={onOpenParticipacaoSocialPainel}
                className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
              >
                Abrir Painel Participação Social <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
              {showOnlyPublic && (
                <button
                  onClick={() => handleCopy("card_reg_subsidios", `${getBaseUrl()}?public=reg_subsidios_painel`, "Link de Participação Social")}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Share2 size={12} /> Compartilhar
                </button>
              )}
            </div>
          </motion.div>
          </RequirePermission>

          {/* Painel do Balanço Hídrico Card - PRIVATE */}
          {!showOnlyPublic && (
            <RequirePermission moduleId="analyze" action="view">
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenWaterBalance}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Droplets size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel do Balanço Hídrico</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Visualize de forma isolada as projeções de oferta e demanda ao longo do tempo. Explore os subsistemas e mapas do Balanço Hídrico.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel do Balanço Hídrico <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
            </RequirePermission>
          )}

          {/* Painel de Fiscalização Card - PRIVATE */}
          {!showOnlyPublic && (
            <RequirePermission moduleId="fisc_operational" action="view">
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenFiscalizacao}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Shield size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Fiscalização</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Painel estratégico de monitoramento das ações de fiscalização, constatações, não conformidades e termos emitidos.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Fiscalização <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
            </RequirePermission>
          )}

          {/* Painel Demanda Ouvidoria Card - PRIVATE */}
          {!showOnlyPublic && (
            <RequirePermission moduleId="recurso_painel" action="view">
            <motion.div 
              whileHover={{ y: -2 }}
              onClick={onOpenRecursoPainel}
              className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <Scale size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Qualidade do Atendimento</h3>
                <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                  Painel estratégico de acompanhamento de demandas de ouvidoria, prazos, andamento e penalidades aplicadas.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-blue-700">
                Abrir Painel de Qualidade do Atendimento <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
            </RequirePermission>
          )}

          {/* Painel de Publicações Card - PUBLIC */}
          <RequirePermission moduleId="pub_painel" action="view">
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full relative"
          >
            <div onClick={onOpenPublications} className="cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 w-max border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={24} className="text-blue-600" />
                </div>
                {showOnlyPublic && (
                  <button
                    type="button"
                    title="Copiar Link Público"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy("card_pub_painel", `${getBaseUrl()}?public=pub_painel`, "Link do Painel de Publicações");
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200 cursor-pointer"
                  >
                    {copiedKey === "card_pub_painel" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-800 leading-tight mb-2">Painel de Publicações</h3>
              <p className="text-slate-600 text-xs font-medium leading-relaxed mb-6">
                Monitore o acervo bibliográfico e estatísticas gerais de publicações. Pesquise relatórios anuais de atividades, boletins informativos e artigos científicos.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
              <button 
                onClick={onOpenPublications}
                className="flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors cursor-pointer"
              >
                Abrir Painel de Publicações <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
              {showOnlyPublic && (
                <button
                  onClick={() => handleCopy("card_pub_painel", `${getBaseUrl()}?public=pub_painel`, "Link do Painel de Publicações")}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                >
                  <Share2 size={12} /> Compartilhar
                </button>
              )}
            </div>
          </motion.div>
          </RequirePermission>
        </div>
      </section>

      {/* Share Public Links Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-adasa-dark to-adasa-mid text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                    <Share2 size={20} className="text-adasa-light" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Compartilhar Links de Painéis Públicos</h3>
                    <p className="text-xs text-white/80 font-medium">Acesso direto e transparente para a sociedade e partes interessadas, sem necessidade de login.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-3">
                <button
                  onClick={() => setActiveShareTab("links")}
                  className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    activeShareTab === "links"
                      ? "border-adasa-dark text-adasa-dark"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Link2 size={14} />
                  Links Diretos
                </button>
                <button
                  onClick={() => setActiveShareTab("embed")}
                  className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    activeShareTab === "embed"
                      ? "border-adasa-dark text-adasa-dark"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Code size={14} />
                  Incorporar (iFrame)
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {activeShareTab === "links" ? (
                  <>
                    {/* Main Hub Link Spotlight */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <Globe size={14} className="text-emerald-600" />
                          Link Principal • Portal Público Consolidado
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Disponibiliza uma página unificada com acesso a todos os painéis públicos abertos (Estoque Regulatório, Agenda, Participação Social e Publicações).
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={`${getBaseUrl()}?public=publico_hub`}
                          className="flex-1 bg-white border border-emerald-300 px-3 py-2 rounded-xl text-xs font-mono text-slate-700 select-all outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button
                          onClick={() => handleCopy("hub_main", `${getBaseUrl()}?public=publico_hub`, "Link do Portal Público")}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                          {copiedKey === "hub_main" ? <Check size={14} /> : <Copy size={14} />}
                          <span>{copiedKey === "hub_main" ? "Copiado!" : "Copiar"}</span>
                        </button>
                        <a
                          href={`${getBaseUrl()}?public=publico_hub`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-800 rounded-xl transition-colors"
                          title="Abrir em Nova Aba"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>

                    {/* Individual Panel Links */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Links Específicos por Painel
                      </h4>

                      <div className="space-y-3">
                        {publicLinks.filter(l => l.id !== "hub").map((item) => {
                          const IconComp = item.icon;
                          const url = `${getBaseUrl()}${item.param}`;
                          const isCopied = copiedKey === item.id;

                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2.5 rounded-xl border ${item.color} shrink-0 mt-0.5`}>
                                  <IconComp size={18} />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-slate-800">{item.title}</h5>
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>
                                  <span className="text-[10px] font-mono text-slate-400 block mt-1 break-all">
                                    {url}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <button
                                  onClick={() => handleCopy(item.id, url, item.title)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                                    isCopied
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {isCopied ? <Check size={13} /> : <Copy size={13} />}
                                  <span>{isCopied ? "Copiado" : "Copiar"}</span>
                                </button>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                                  title="Testar Link Público"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Embed iFrame Code */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                      Utilize o código abaixo para incorporar o Portal de Painéis Públicos da ADASA diretamente no site oficial, intranet ou portais parceiros.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Código HTML para Incorporação (Portal Completo)</span>
                        <button
                          onClick={() => handleCopy("embed_code", `<iframe src="${getBaseUrl()}?public=publico_hub" width="100%" height="850" frameborder="0" style="border:0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" allowfullscreen></iframe>`, "Código de Incorporação")}
                          className="text-adasa-dark hover:underline flex items-center gap-1 font-extrabold"
                        >
                          {copiedKey === "embed_code" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          <span>{copiedKey === "embed_code" ? "Copiado!" : "Copiar Código"}</span>
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-900 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 select-all">
{`<iframe
  src="${getBaseUrl()}?public=publico_hub"
  width="100%"
  height="850"
  frameborder="0"
  style="border:0; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
  allowfullscreen>
</iframe>`}
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <span className="font-black block">Dica de Integração:</span>
                      <p>
                        Você pode substituir o parâmetro <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">?public=publico_hub</code> pelo identificador de qualquer painel específico (como <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">?public=reg_painel</code> para Resoluções ou <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">?public=reg_subsidios_painel</code> para Participação Social).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Links gerados com base na URL atual da aplicação.
                </span>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

