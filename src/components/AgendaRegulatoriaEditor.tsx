import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Layers, Target, Link2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { AgendaRegulatoriaData, TEMAS_AGENDA_REGULATORIA, AGENDA_REGULATORIA_ETAPAS } from '../types';

interface Props {
  data?: AgendaRegulatoriaData;
  onChange: (data: AgendaRegulatoriaData) => void;
}

interface AgendaOption {
  id: number;
  nome: string;
  tema?: string;
}

export const AgendaRegulatoriaEditor: React.FC<Props> = ({ data, onChange }) => {
  const STAGES = AGENDA_REGULATORIA_ETAPAS;
  const debounceTimer = useRef<NodeJS.Timeout>();
  const [agendas, setAgendas] = useState<AgendaOption[]>([]);
  const [isLoadingAgendas, setIsLoadingAgendas] = useState(false);

  const [localData, setLocalData] = useState<AgendaRegulatoriaData>(() => ({
    agendaId: data?.agendaId || null,
    agendaVinculada: data?.agendaVinculada || "Agenda Regulatória 2025-2026",
    temaRegulatorio: data?.temaRegulatorio || "Qualidade da Prestação de Serviços",
    entregaMeta: data?.entregaMeta || "",
    linkArquivoEntrega: data?.linkArquivoEntrega || "",
    etapa: data?.etapa || "Minuta do Normativo",
    datasEtapas: data?.datasEtapas || { "Minuta do Normativo": new Date().toISOString().split('T')[0] }
  }));

  // Synchronize when data prop changes externally
  useEffect(() => {
    if (data) {
      let currentDates = data.datasEtapas;
      const currentStage = data.etapa || "Minuta do Normativo";

      if (!currentDates || Object.keys(currentDates).length === 0) {
        const generated: Record<string, string> = {};
        const today = new Date();
        const currentIdx = STAGES.indexOf(currentStage as any) === -1 ? 0 : STAGES.indexOf(currentStage as any);
        
        let cursor = new Date(today);
        cursor.setDate(cursor.getDate() - (currentIdx * 20));
        for (let i = 0; i <= currentIdx; i++) {
          generated[STAGES[i]] = cursor.toISOString().split('T')[0];
          cursor.setDate(cursor.getDate() + 20);
        }
        currentDates = generated;
      }

      setLocalData({
        agendaId: data.agendaId || null,
        agendaVinculada: data.agendaVinculada || "Agenda Regulatória 2025-2026",
        temaRegulatorio: data.temaRegulatorio || "Qualidade da Prestação de Serviços",
        entregaMeta: data.entregaMeta || "",
        linkArquivoEntrega: data.linkArquivoEntrega || "",
        etapa: currentStage,
        datasEtapas: currentDates
      });
    }
  }, [data?.agendaVinculada, data?.temaRegulatorio, data?.entregaMeta, data?.linkArquivoEntrega, data?.agendaId, data?.etapa, data?.datasEtapas]);

  // Load available agendas from /api/agendas
  useEffect(() => {
    let isMounted = true;
    const fetchAgendas = async () => {
      setIsLoadingAgendas(true);
      try {
        const res = await fetch('/api/agendas');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            setAgendas(json.data);
            if (!localData.agendaId && localData.agendaVinculada) {
              const matched = json.data.find((a: AgendaOption) => a.nome === localData.agendaVinculada);
              if (matched) {
                setLocalData(prev => ({ ...prev, agendaId: matched.id }));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de agendas regulatórias:', err);
      } finally {
        if (isMounted) setIsLoadingAgendas(false);
      }
    };
    fetchAgendas();
    return () => { isMounted = false; };
  }, []);

  const updateData = (newData: AgendaRegulatoriaData) => {
    setLocalData(newData);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(newData);
    }, 300);
  };

  const updateField = (field: keyof AgendaRegulatoriaData, value: any) => {
    let updated = { ...localData, [field]: value };
    if (field === 'etapa') {
      const newStage = value;
      const currentDates = { ...(localData.datasEtapas || {}) };
      currentDates[newStage] = new Date().toISOString().split('T')[0];
      if (!currentDates[STAGES[0]]) {
        currentDates[STAGES[0]] = new Date().toISOString().split('T')[0];
      }
      updated.datasEtapas = currentDates;
    }
    updateData(updated);
  };

  const updateStageDate = (stage: string, newDateStr: string) => {
    const currentDates = { ...(localData.datasEtapas || {}) };
    if (newDateStr) {
      currentDates[stage] = newDateStr;
    } else {
      delete currentDates[stage];
    }
    updateData({
      ...localData,
      datasEtapas: currentDates
    });
  };

  const handleAgendaSelect = (selectedName: string) => {
    const matched = agendas.find(a => a.nome === selectedName);
    const updated: AgendaRegulatoriaData = {
      ...localData,
      agendaVinculada: selectedName,
      agendaId: matched ? matched.id : localData.agendaId
    };
    updateData(updated);
  };

  const currentStage = localData.etapa || STAGES[0];
  const activeIndex = STAGES.indexOf(currentStage as any) === -1 ? 0 : STAGES.indexOf(currentStage as any);

  // Exact stage duration calculation in days
  const getStageDuration = (index: number) => {
    const dates = localData.datasEtapas || {};
    const stage = STAGES[index];
    if (stage === ("Finalizada" as string) || stage === ("Finalizado" as string)) return 0;
    const nextStage = STAGES[index + 1];

    if (!dates[stage]) return 0;

    const start = new Date(dates[stage]);
    const end = dates[nextStage] ? new Date(dates[nextStage]) : new Date();

    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffTime = endMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Process Flow Timeline - Agenda Regulatória */}
      <div className="bg-slate-50/70 border border-slate-200/60 rounded-3xl p-4 sm:p-5 w-full">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center justify-between">
          <span>📍 Fluxo do Processo (Tempo de Permanência Exato)</span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
            Etapa Atual: {currentStage}
          </span>
        </div>
        <div className="w-full">
          <div className="flex items-center justify-between w-full relative">
            {STAGES.map((stage, index) => {
              const isActive = currentStage === stage;
              const isCompleted = activeIndex >= index;
              const isLineCompleted = activeIndex > index;
              const duration = getStageDuration(index);

              return (
                <React.Fragment key={stage}>
                  {/* Step Node */}
                  <div 
                    className="flex flex-col items-center relative group cursor-pointer z-10 shrink-0" 
                    onClick={() => updateField('etapa', stage)}
                    title={`Clique para avançar/retroceder para a etapa: ${stage}`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all shadow-sm ${
                      isActive ? 'bg-[#1A3E8A] text-white ring-4 ring-blue-100 scale-105 font-black' :
                      isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                      'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}>
                      {isCompleted && !isActive ? '✓' : index + 1}
                    </div>
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-center mt-1.5 w-18 sm:w-24 md:w-28 leading-tight transition-colors line-clamp-2 ${
                      isActive ? 'text-[#1A3E8A]' : isCompleted ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {stage}
                    </span>
                  </div>

                  {/* Connecting Line with exact days duration badge */}
                  {index < STAGES.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-200 relative mx-1 sm:mx-2 -mt-5 min-w-[20px]">
                      <div 
                        className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: isLineCompleted ? '100%' : '0%' }}
                      />
                      {/* Exact days circle badge */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className={`h-4.5 min-w-7 sm:min-w-8 px-1 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-extrabold shadow-sm transition-all border ${
                          isLineCompleted 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 scale-105' 
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`} title={`Tempo exato que a atividade ficou nesta etapa: ${duration} dias`}>
                          {duration}d
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seletor de Etapa */}
      <div className="space-y-1 text-left">
        <label className="text-xs font-bold text-slate-600">Etapa Atual do Fluxo Normativo</label>
        <select
          value={currentStage}
          onChange={e => updateField('etapa', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-adasa-mid outline-none font-bold text-slate-700 bg-white cursor-pointer shadow-2xs"
        >
          {STAGES.map((etapa) => (
            <option key={etapa} value={etapa}>
              {etapa}
            </option>
          ))}
        </select>
        <p className="text-[10px] font-medium text-slate-400">
          Selecione em qual fase de elaboração e aprovação regulatória esta ação se encontra.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Campo 1: Agenda Regulatória Vinculada */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={14} className="text-indigo-600" />
            Agenda Regulatória Vinculada <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={localData.agendaVinculada || "Agenda Regulatória 2025-2026"}
              onChange={(e) => handleAgendaSelect(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:border-adasa-mid focus:ring-2 focus:ring-adasa-mid/20 outline-none transition-all cursor-pointer shadow-2xs"
            >
              {agendas.length > 0 ? (
                agendas.map(ag => (
                  <option key={ag.id} value={ag.nome}>
                    {ag.nome}
                  </option>
                ))
              ) : (
                <>
                  <option value="Agenda Regulatória 2025-2026">Agenda Regulatória 2025-2026</option>
                  <option value="Agenda Regulatória 2023-2024">Agenda Regulatória 2023-2024</option>
                  <option value="Agenda Regulatória 2021-2022">Agenda Regulatória 2021-2022</option>
                  <option value="Agenda Regulatória 2018-2020">Agenda Regulatória 2018-2020</option>
                </>
              )}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 font-medium pl-1">
            Selecione a qual biênio ou ciclo regulatório este item pertence.
          </p>
        </div>

        {/* Campo 2: Tema Regulatório (Exatamente um tema) */}
        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-indigo-600" />
            Tema Regulatório Estratégico <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              value={localData.temaRegulatorio || "Qualidade da Prestação de Serviços"}
              onChange={(e) => updateField('temaRegulatorio', e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-white focus:border-adasa-mid focus:ring-2 focus:ring-adasa-mid/20 outline-none transition-all cursor-pointer shadow-2xs"
            >
              {TEMAS_AGENDA_REGULATORIA.map(tema => (
                <option key={tema} value={tema}>
                  {tema}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-slate-400 font-medium pl-1">
            Cada atividade fica vinculada a exatamente um tema da Agenda.
          </p>
        </div>
      </div>

      {/* Campo 3: Entrega / Meta do Item (Campo de Texto Comum) */}
      <div className="space-y-1.5 text-left">
        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Target size={14} className="text-indigo-600" />
          Entrega / Meta do Item <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={localData.entregaMeta || ""}
          onChange={(e) => updateField('entregaMeta', e.target.value)}
          placeholder="Ex: Resolução que estabelece metas de universalização; Relatório de ARR; Manual Técnico..."
          className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-adasa-mid focus:ring-2 focus:ring-adasa-mid/20 outline-none transition-all shadow-2xs bg-white"
        />
        <p className="text-[11px] text-slate-400 font-medium pl-1">
          Identificação da meta ou produto normativo final gerado por esta atividade regulatória.
        </p>
      </div>

      {/* Campo 4: Hiperlink do Arquivo da Entrega (Opcional) */}
      <div className="space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 size={14} className="text-indigo-600" />
            Hiperlink do Arquivo da Entrega <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          {localData.linkArquivoEntrega && localData.linkArquivoEntrega.trim() !== "" && (
            <a
              href={localData.linkArquivoEntrega.startsWith('http') ? localData.linkArquivoEntrega : `https://${localData.linkArquivoEntrega}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors cursor-pointer"
              title="Abrir documento em nova guia"
            >
              <ExternalLink size={12} /> Testar Link
            </a>
          )}
        </div>
        <div className="relative">
          <input
            type="url"
            value={localData.linkArquivoEntrega || ""}
            onChange={(e) => updateField('linkArquivoEntrega', e.target.value)}
            placeholder="https://www.adasa.df.gov.br/.../Resolucao.pdf ou processo SEI..."
            className="w-full border-2 border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-adasa-mid focus:ring-2 focus:ring-adasa-mid/20 outline-none transition-all shadow-2xs bg-white"
          />
          {localData.linkArquivoEntrega && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-medium pl-1">
          Link direto para o PDF da Resolução, publicação no DODF ou documento oficial comprobatório da entrega.
        </p>
      </div>

      {/* Table: Histórico de Tempos por Etapa (Posicionada ao Final) */}
      <div className="border border-slate-200/80 bg-slate-50/50 rounded-2xl p-4 text-left">
        <div className="mb-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            📋 HISTÓRICO DE PERMANÊNCIA POR ETAPA
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
            Detalhamento exato de datas e tempos de cada etapa
          </p>
        </div>
        <div className="overflow-hidden border border-slate-200/60 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 font-bold">ETAPA</th>
                <th className="px-4 py-2.5 font-bold text-center">DATA DE ENTRADA</th>
                <th className="px-4 py-2.5 font-bold text-right">TEMPO DE PERMANÊNCIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {STAGES.map((stage, index) => {
                const dates = localData.datasEtapas || {};
                const entryDate = dates[stage];
                const isActive = currentStage === stage;
                const isCompleted = activeIndex >= index;
                const nextStage = STAGES[index + 1];
                const duration = getStageDuration(index);

                const formattedDate = entryDate 
                  ? entryDate.split('-').reverse().join('/') 
                  : '-';

                return (
                  <tr 
                    key={stage} 
                    className={`transition-colors ${
                      isActive 
                        ? 'bg-blue-50/40 hover:bg-blue-50/60 font-semibold' 
                        : 'hover:bg-slate-50/40'
                    }`}
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-blue-600 animate-pulse' :
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      }`} />
                      <span className={isActive ? 'text-[#1A3E8A] font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'}>
                        {stage}
                      </span>
                      {isActive && (
                        <span className="inline-block text-[9px] bg-blue-100 text-[#1A3E8A] font-bold px-1.5 py-0.5 rounded ml-1 uppercase tracking-wide">
                          ATUAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="date"
                        value={entryDate || ''}
                        onChange={(e) => updateStageDate(stage, e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center shadow-2xs hover:border-slate-300 transition-colors"
                        title="Clique para alterar a data de entrada nesta etapa"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-800">
                      {!entryDate || stage === ("Finalizada" as string) || stage === ("Finalizado" as string) ? (
                        <span className="text-slate-300 font-normal">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className={isActive ? 'text-[#1A3E8A]' : 'text-emerald-600'}>
                            {duration}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {duration === 1 ? 'Dia' : 'Dias'}
                          </span>
                          {isActive && (!nextStage || !dates[nextStage]) && (
                            <span className="text-[9px] text-blue-500 font-normal normal-case italic ml-1">
                              (em andamento)
                            </span>
                          )}
                        </div>
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
  );
};
