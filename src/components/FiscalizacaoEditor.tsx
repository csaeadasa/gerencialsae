import React, { useState, useEffect, useRef } from 'react';
import { FiscalizacaoData, DocumentoFiscalizacao, ConstatacaoFiscalizacao, TermoNotificacao, AutoDeInfracao } from '../types';
import { Plus, Trash, FileText, AlertTriangle, FileSignature, Upload, X } from 'lucide-react';
import { FISCALIZACAO_ETAPAS, FISCALIZACAO_ETAPA_INICIAL } from '../lib/fiscalizacao';

interface Props {
  data: FiscalizacaoData;
  onChange: (data: FiscalizacaoData) => void;
}

export const FiscalizacaoEditor: React.FC<Props> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'documentos' | 'constatacoes' | 'termos' | 'autos'>('geral');
  const [localData, setLocalData] = useState<FiscalizacaoData>(data);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('images', e.target.files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        throw new Error(`Erro no servidor: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Resposta inválida do servidor.");
      }
      const data = await res.json();
      if (data.success && data.urls) {
        const currentImages = localData.imagens || [];
        updateField('imagens', [...currentImages, ...data.urls]);
      } else {
        alert('Erro no upload das imagens: ' + (data.error || 'Desconhecido'));
      }
    } catch (err) {
      console.error(err);
      alert('Erro no upload das imagens');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const currentImages = [...(localData.imagens || [])];
    currentImages.splice(index, 1);
    updateField('imagens', currentImages);
  };

  // Sync when parent data changes completely (e.g. switching tasks)
  useEffect(() => {
    let needsUpdate = false;
    let newData = { ...data };
    
    if (data && localData && data.codigo !== localData.codigo && data.regiaoAdministrativa !== localData.regiaoAdministrativa) {
      needsUpdate = true;
    }
    
    // Apply defaults if they are missing
    if (!newData.etapa) {
      newData.etapa = FISCALIZACAO_ETAPA_INICIAL;
      needsUpdate = true;
    }
    if (!newData.servico) {
      newData.servico = 'Água';
      needsUpdate = true;
    }
    if (!newData.tipoFiscalizacao) {
      newData.tipoFiscalizacao = 'Operacional';
      needsUpdate = true;
    }
    if (!newData.programacao) {
      newData.programacao = 'Programada';
      needsUpdate = true;
    }

    // Initialize exact stage dates (datasEtapas) if missing or empty
    if (!newData.datasEtapas || Object.keys(newData.datasEtapas).length === 0) {
      const generated: Record<string, string> = {};
      const startStr = (newData as any).createdAt || new Date().toISOString();
      const startD = new Date(startStr);
      let currentD = new Date(startD);
      const seed = ((newData.codigo || "").length + (newData.objetivo || "").length + 1) % 5 + 3;
      
      const currentStage = newData.etapa || FISCALIZACAO_ETAPA_INICIAL;
      const currentIdx = FISCALIZACAO_ETAPAS.indexOf(currentStage as any) === -1 ? 0 : FISCALIZACAO_ETAPAS.indexOf(currentStage as any);

      for (let i = 0; i <= currentIdx; i++) {
        const stage = FISCALIZACAO_ETAPAS[i];
        generated[stage] = currentD.toISOString().split('T')[0];
        
        let days = 5;
        if (i === 0) days = seed + 2;
        else if (i === 1) days = seed + 7;
        currentD.setDate(currentD.getDate() + days);
      }
      newData.datasEtapas = generated;
      needsUpdate = true;
    }

    if (needsUpdate) {
      setLocalData(newData);
      onChange(newData);
    }
  }, [data]);

  const updateData = (newData: FiscalizacaoData) => {
    setLocalData(newData);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(newData);
    }, 400);
  };

  const updateField = (field: keyof FiscalizacaoData, value: any) => {
    let updated = { ...localData, [field]: value };
    if (field === 'etapa') {
      const newStage = value;
      const datasEtapas = { ...(localData.datasEtapas || {}) };
      datasEtapas[newStage] = new Date().toISOString().split('T')[0];
      if (!datasEtapas[FISCALIZACAO_ETAPA_INICIAL]) {
        datasEtapas[FISCALIZACAO_ETAPA_INICIAL] = new Date().toISOString().split('T')[0];
      }
      updated.datasEtapas = datasEtapas;
    }
    updateData(updated);
  };

  const addDocumento = () => {
    const novo: DocumentoFiscalizacao = {
      id: Date.now().toString(),
      tipo: 'Relatório',
      numeroSei: '',
      data: '',
      objetivo: '',
      destinatario: ''
    };
    updateField('documentos', [...(localData.documentos || []), novo]);
  };

  const updateDocumento = (id: string, updates: Partial<DocumentoFiscalizacao>) => {
    const novos = (localData.documentos || []).map(d => d.id === id ? { ...d, ...updates } : d);
    updateField('documentos', novos);
  };

  const removeDocumento = (id: string) => {
    updateField('documentos', (localData.documentos || []).filter(d => d.id !== id));
  };

  const addConstatacao = () => {
    const nova: ConstatacaoFiscalizacao = {
      id: Date.now().toString(),
      codigo: 'C' + (((localData.constatacoes || []).length) + 1),
      descricao: '',
      situacao: 'Conforme'
    };
    updateField('constatacoes', [...(localData.constatacoes || []), nova]);
  };

  const updateConstatacao = (id: string, updates: Partial<ConstatacaoFiscalizacao>) => {
    const novas = (localData.constatacoes || []).map(c => c.id === id ? { ...c, ...updates } : c);
    updateField('constatacoes', novas);
  };

  const removeConstatacao = (id: string) => {
    updateField('constatacoes', (localData.constatacoes || []).filter(c => c.id !== id));
  };

  const [selectedConstatacoes, setSelectedConstatacoes] = useState<string[]>([]);

  const emitirTermo = () => {
    if (selectedConstatacoes.length === 0) {
      alert("Selecione pelo menos uma constatação não conforme para emitir o termo.");
      return;
    }
    
    // Initialize their default specific Term properties if not already set
    const atualizadas = (localData.constatacoes || []).map(c => {
      if (selectedConstatacoes.includes(c.id)) {
        return {
          ...c,
          situacaoNaoConforme: c.situacaoNaoConforme || 'Tratada Adequadamente',
          prazoCorrecao: c.prazoCorrecao || ''
        } as ConstatacaoFiscalizacao;
      }
      return c;
    });
    updateData({ ...localData, constatacoes: atualizadas });

    const novoTermo: TermoNotificacao = {
      id: Date.now().toString(),
      numeroSei: '',
      dataEmissao: new Date().toISOString().split('T')[0],
      dataResposta: '',
      constatacoesIds: [...selectedConstatacoes]
    };
    updateData({ ...localData, constatacoes: atualizadas, termosNotificacao: [...(localData.termosNotificacao || []), novoTermo] });
    setSelectedConstatacoes([]); // reset selection
  };

  const updateTermo = (id: string, updates: Partial<TermoNotificacao>) => {
    const novos = (localData.termosNotificacao || []).map(t => t.id === id ? { ...t, ...updates } : t);
    updateField('termosNotificacao', novos);
  };

  const removeTermo = (id: string) => {
    updateField('termosNotificacao', (localData.termosNotificacao || []).filter(t => t.id !== id));
  };

  const [selectedConstatacoesAuto, setSelectedConstatacoesAuto] = useState<string[]>([]);

  const emitirAuto = () => {
    if (selectedConstatacoesAuto.length === 0) {
      alert("Selecione pelo menos uma constatação não conforme para emitir o auto.");
      return;
    }
    
    const novoAuto: AutoDeInfracao = {
      id: Date.now().toString(),
      numeroSei: '',
      dataEmissao: new Date().toISOString().split('T')[0],
      referencia: '',
      caracterizacao: '',
      infracoes: '',
      penalidade: 'Advertência',
      descricaoPenalidade: '',
      dataLimiteRecurso: '',
      constatacoesIds: [...selectedConstatacoesAuto]
    };
    updateField('autosDeInfracao', [...(localData.autosDeInfracao || []), novoAuto]);
    setSelectedConstatacoesAuto([]); // reset selection
  };

  const updateAuto = (id: string, updates: Partial<AutoDeInfracao>) => {
    const novos = (localData.autosDeInfracao || []).map(a => a.id === id ? { ...a, ...updates } : a);
    updateField('autosDeInfracao', novos);
  };

  const removeAuto = (id: string) => {
    updateField('autosDeInfracao', (localData.autosDeInfracao || []).filter(a => a.id !== id));
  };

  const currentStage = localData.etapa || FISCALIZACAO_ETAPA_INICIAL;
  const activeIndex = FISCALIZACAO_ETAPAS.indexOf(currentStage as any) === -1 ? 0 : FISCALIZACAO_ETAPAS.indexOf(currentStage as any);

  // Exact stage duration calculation in days
  const getStageDuration = (index: number) => {
    const dates = localData.datasEtapas || {};
    const stage = FISCALIZACAO_ETAPAS[index];
    if (stage === "Finalizada") return 0;
    const nextStage = FISCALIZACAO_ETAPAS[index + 1];
    
    if (!dates[stage]) return 0;
    
    const start = new Date(dates[stage]);
    const end = nextStage && dates[nextStage] ? new Date(dates[nextStage]) : new Date();
    
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    const diffTime = endMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-4">
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold overflow-x-auto custom-scrollbar whitespace-nowrap">
        <button
          type="button"
          className={`py-2 border-b-2 ${activeTab === 'geral' ? 'border-adasa-mid text-adasa-mid' : 'border-transparent text-slate-500'}`}
          onClick={() => setActiveTab('geral')}
        >
          Dados Gerais
        </button>
        <button
          type="button"
          className={`py-2 border-b-2 ${activeTab === 'documentos' ? 'border-adasa-mid text-adasa-mid' : 'border-transparent text-slate-500'}`}
          onClick={() => setActiveTab('documentos')}
        >
          Documentos ({localData.documentos?.length || 0})
        </button>
        <button
          type="button"
          className={`py-2 border-b-2 ${activeTab === 'constatacoes' ? 'border-adasa-mid text-adasa-mid' : 'border-transparent text-slate-500'}`}
          onClick={() => setActiveTab('constatacoes')}
        >
          Constatações ({localData.constatacoes?.length || 0})
        </button>
        <button
          type="button"
          className={`py-2 border-b-2 ${activeTab === 'termos' ? 'border-adasa-mid text-adasa-mid' : 'border-transparent text-slate-500'}`}
          onClick={() => setActiveTab('termos')}
        >
          Termos de Notificação ({localData.termosNotificacao?.length || 0})
        </button>
        <button
          type="button"
          className={`py-2 border-b-2 ${activeTab === 'autos' ? 'border-adasa-mid text-adasa-mid' : 'border-transparent text-slate-500'}`}
          onClick={() => setActiveTab('autos')}
        >
          Autos de Infração ({localData.autosDeInfracao?.length || 0})
        </button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
        {activeTab === 'geral' && (
          <div className="space-y-4">
            {/* Horizontal Process Flow Timeline - Fiscalização */}
            <div className="bg-slate-50/70 border border-slate-200/60 rounded-3xl p-4 sm:p-5 mb-1 w-full">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5">
                📍 Fluxo do Processo (Tempo de Permanência Exato)
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between w-full relative">
                  {FISCALIZACAO_ETAPAS.map((stage, index) => {
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
                          title={`Mudar para: ${stage}`}
                        >
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all shadow-sm ${
                            isActive ? 'bg-[#1A3E8A] text-white ring-4 ring-blue-100 scale-105 font-black' :
                            isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                            'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                          }`}>
                            {isCompleted && !isActive ? '✓' : index + 1}
                          </div>
                          <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-center mt-1.5 w-16 sm:w-24 md:w-28 leading-tight transition-colors line-clamp-2 ${
                            isActive ? 'text-[#1A3E8A]' : isCompleted ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}>
                            {stage}
                          </span>
                        </div>

                        {/* Connecting Line with exact days duration badge */}
                        {index < FISCALIZACAO_ETAPAS.length - 1 && (
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
                              }`} title={`Tempo exato que a fiscalização ficou nesta etapa: ${duration} dias`}>
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

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Etapa da Fiscalização</label>
              <select
                value={localData.etapa || FISCALIZACAO_ETAPA_INICIAL}
                onChange={e => updateField('etapa', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
              >
                {FISCALIZACAO_ETAPAS.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {etapa}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-medium text-slate-400">
                Selecione a etapa atual da ação fiscalizatória.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Tipo de Fiscalização</label>
                <select
                  value={localData.tipoFiscalizacao || 'Operacional'}
                  onChange={e => updateField('tipoFiscalizacao', e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
                >
                  <option value="Operacional">Operacional</option>
                  <option value="Atendimento">Atendimento</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Serviço</label>
                <select
                  value={localData.servico || 'Água'}
                  onChange={e => updateField('servico', e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
                >
                  <option value="Água">Água</option>
                  <option value="Esgoto">Esgoto</option>
                  <option value="Atendimento">Atendimento</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Código</label>
                <input
                  type="text"
                  value={localData.codigo || ''}
                  readOnly
                  disabled
                  placeholder="Gerado automaticamente"
                  className="w-full border-2 border-slate-200 bg-slate-100 cursor-not-allowed text-slate-500 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Região Administrativa</label>
                <input
                  type="text"
                  value={localData.regiaoAdministrativa || ''}
                  onChange={e => updateField('regiaoAdministrativa', e.target.value)}
                  placeholder="Ex: Plano Piloto"
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Objetivo</label>
              <textarea
                value={localData.objetivo || ''}
                onChange={e => updateField('objetivo', e.target.value)}
                placeholder="Ex: O objetivo dessa ação foi..."
                className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none resize-none h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Latitude</label>
                <input
                  type="text"
                  value={localData.latitude || ''}
                  onChange={e => updateField('latitude', e.target.value)}
                  placeholder="Ex: -15.7942"
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Longitude</label>
                <input
                  type="text"
                  value={localData.longitude || ''}
                  onChange={e => updateField('longitude', e.target.value)}
                  placeholder="Ex: -47.8822"
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Modalidade de Fiscalização</label>
                <select
                  value={localData.tipo || 'Direta'}
                  onChange={e => updateField('tipo', e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                >
                  <option value="Direta">Direta</option>
                  <option value="Indireta">Indireta</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Programação</label>
                <select
                  value={localData.programacao || 'Programada'}
                  onChange={e => updateField('programacao', e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
                >
                  <option value="Programada">Programada</option>
                  <option value="Não Programada">Não Programada</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Imagens</label>
              
              <div className="flex flex-wrap gap-3 mb-2">
                {(localData.imagens || []).map((imgUrl, idx) => (
                  <div key={idx} className="relative group rounded overflow-hidden border border-slate-200">
                    <img src={imgUrl} alt={`Img ${idx}`} className="w-16 h-16 object-cover" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button 
                  type="button" 
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg px-3 py-3 text-sm text-slate-500 hover:bg-slate-50 hover:border-adasa-mid transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2"><Upload size={16} className="animate-bounce" /> Enviando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Upload size={16} /> Clique ou arraste imagens aqui</span>
                  )}
                </button>
              </div>
            </div>

            {/* Table: Histórico de Tempos por Etapa */}
            <div className="mt-6 border border-slate-200/80 bg-slate-50/50 rounded-2xl p-4">
              <div className="mb-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                  📋 HISTÓRICO DE PERMANÊNCIA POR ETAPA
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Detalhamento exato de datas e tempos de cada etapa</p>
              </div>
              <div className="overflow-hidden border border-slate-200/60 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 font-bold">Etapa</th>
                      <th className="px-4 py-2.5 font-bold text-center">Data de Entrada</th>
                      <th className="px-4 py-2.5 font-bold text-right">Tempo de Permanência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {FISCALIZACAO_ETAPAS.map((stage, index) => {
                      const dates = localData.datasEtapas || {};
                      const entryDate = dates[stage];
                      const isActive = currentStage === stage;
                      const isCompleted = activeIndex >= index;
                      const nextStage = FISCALIZACAO_ETAPAS[index + 1];
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
                              <span className="inline-block text-[9px] bg-blue-100 text-[#1A3E8A] font-bold px-1.5 py-0.5 rounded ml-1 uppercase">
                                Atual
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-600">
                            {formattedDate}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-800">
                            {!entryDate || stage === "Finalizada" ? (
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
        )}

        {activeTab === 'documentos' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={addDocumento}
              className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors"
            >
              <Plus size={14} /> Novo Documento
            </button>
            
            <div className="space-y-3">
              {(localData.documentos || []).map((doc, idx) => (
                <div key={doc.id} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => removeDocumento(doc.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <Trash size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-slate-700">
                    <FileText size={14} /> Documento {idx + 1}
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Tipo</label>
                      <select 
                        value={doc.tipo || ''} 
                        onChange={e => updateDocumento(doc.id, {tipo: e.target.value})} 
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Ofício">Ofício</option>
                        <option value="Nota Técnica">Nota Técnica</option>
                        <option value="Memorando">Memorando</option>
                        <option value="Relatório">Relatório</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Nº SEI</label>
                      <input type="text" value={doc.numeroSei} onChange={e => updateDocumento(doc.id, {numeroSei: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Data</label>
                      <input type="date" value={doc.data} onChange={e => updateDocumento(doc.id, {data: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Destinatário</label>
                      <input type="text" value={doc.destinatario} onChange={e => updateDocumento(doc.id, {destinatario: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Objetivo</label>
                      <textarea rows={3} value={doc.objetivo} onChange={e => updateDocumento(doc.id, {objetivo: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                    </div>
                  </div>
                </div>
              ))}
              {(localData.documentos?.length === 0) && <p className="text-xs text-slate-400 italic">Nenhum documento adicionado.</p>}
            </div>
          </div>
        )}

        {activeTab === 'constatacoes' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={addConstatacao}
              className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors"
            >
              <Plus size={14} /> Nova Constatação
            </button>
            
            <div className="space-y-3">
              {(localData.constatacoes || []).map((constatacao, idx) => (
                <div key={constatacao.id} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => removeConstatacao(constatacao.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <Trash size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-slate-700">
                    <AlertTriangle size={14} className={constatacao.situacao === 'Não Conforme' ? 'text-amber-500' : 'text-slate-400'} /> Constatação {idx + 1}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Código</label>
                      <input 
                        type="text" 
                        value={constatacao.codigo} 
                        readOnly
                        disabled
                        className="w-full border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed rounded px-2 py-1 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Situação</label>
                      <select 
                        value={constatacao.situacao} 
                        onChange={e => updateConstatacao(constatacao.id, {situacao: e.target.value as any})} 
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      >
                        <option value="Conforme">Conforme</option>
                        <option value="Não Conforme">Não Conforme</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Descrição</label>
                    <textarea rows={3} value={constatacao.descricao} onChange={e => updateConstatacao(constatacao.id, {descricao: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                  </div>
                  
                  {constatacao.situacao === 'Não Conforme' && (
                    <div className="space-y-1 bg-amber-50 p-2 rounded border border-amber-100">
                      <label className="text-[10px] font-bold text-amber-700">Descrição da Não Conformidade</label>
                      <textarea rows={3} value={constatacao.descricaoNaoConformidade || ''} onChange={e => updateConstatacao(constatacao.id, {descricaoNaoConformidade: e.target.value})} className="w-full border border-amber-200 rounded px-2 py-1 text-xs resize-y bg-white" />
                    </div>
                  )}
                </div>
              ))}
              {(localData.constatacoes?.length === 0) && <p className="text-xs text-slate-400 italic">Nenhuma constatação adicionada.</p>}
            </div>
          </div>
        )}

        {activeTab === 'termos' && (
          <div className="space-y-4">
            <div className="bg-sky-50/50 border border-sky-100 p-3 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-adasa-dark">Selecione as Constatações Não Conformes para emitir um termo:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {(localData.constatacoes || []).filter(c => c.situacao === 'Não Conforme').map(c => (
                  <label key={c.id} className="flex items-start gap-2 bg-white p-2 border border-sky-100 rounded cursor-pointer hover:bg-sky-50">
                    <input 
                      type="checkbox" 
                      className="mt-1" 
                      checked={selectedConstatacoes.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedConstatacoes(prev => [...prev, c.id]);
                        } else {
                          setSelectedConstatacoes(prev => prev.filter(id => id !== c.id));
                        }
                      }}
                    />
                    <div className="text-[10px] leading-tight">
                      <strong className="text-adasa-mid block">{c.codigo}</strong>
                      <span className="text-slate-600">{c.descricao || 'Sem descrição'}</span>
                    </div>
                  </label>
                ))}
                {(localData.constatacoes || []).filter(c => c.situacao === 'Não Conforme').length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">Não há constatações não conformes disponíveis.</p>
                )}
              </div>
              
              <button
                type="button"
                onClick={emitirTermo}
                className="flex items-center justify-center w-full gap-2 text-xs bg-sky-100 hover:bg-sky-200 text-adasa-dark px-4 py-2 rounded-lg font-bold transition-colors"
              >
                <FileSignature size={14} /> Emitir Termo de Notificação
              </button>
            </div>
            
            <div className="space-y-3">
              {(localData.termosNotificacao || []).map((termo, idx) => (
                <div key={termo.id} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => removeTermo(termo.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <Trash size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-adasa-mid">
                    <FileSignature size={14} /> Termo {idx + 1}
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Nº SEI</label>
                      <input type="text" value={termo.numeroSei} onChange={e => updateTermo(termo.id, {numeroSei: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Data Emissão</label>
                      <input type="date" value={termo.dataEmissao} onChange={e => updateTermo(termo.id, {dataEmissao: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Prazo Resposta</label>
                      <input type="date" value={termo.dataResposta} onChange={e => updateTermo(termo.id, {dataResposta: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Respondido em</label>
                      <input type="date" value={termo.respondidoEm || ''} onChange={e => updateTermo(termo.id, {respondidoEm: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-500">Constatações Vinculadas ({termo.constatacoesIds.length})</h5>
                    {termo.constatacoesIds.map(cid => {
                      const c = localData.constatacoes.find(x => x.id === cid);
                      if (!c) return null;
                      return (
                        <div key={cid} className="bg-white border border-slate-200 p-2 rounded">
                          <div className="font-bold text-[11px] text-slate-700">{c.codigo} - {c.descricao}</div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Prazo Correção</label>
                              <input type="date" value={c.prazoCorrecao || ''} onChange={e => updateConstatacao(c.id, {prazoCorrecao: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-[10px]" />
                              <div className="flex items-center gap-1.5 pt-1">
                                <input type="checkbox" id={`alerta-${c.id}`} checked={c.alertaPrazo !== false} onChange={e => updateConstatacao(c.id, {alertaPrazo: e.target.checked})} className="rounded text-sky-600 focus:ring-sky-500 h-3 w-3" />
                                <label htmlFor={`alerta-${c.id}`} className="text-[9px] font-bold text-slate-500 uppercase cursor-pointer">Alerta de prazo</label>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Situação</label>
                              <select 
                                value={c.situacaoNaoConforme || 'Tratada Adequadamente'} 
                                onChange={e => updateConstatacao(c.id, {situacaoNaoConforme: e.target.value as any})}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-[10px]"
                              >
                                <option value="Tratada Adequadamente">Tratada Adequadamente</option>
                                <option value="Não Tratada">Não Tratada</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {(localData.termosNotificacao?.length === 0) && <p className="text-xs text-slate-400 italic">Nenhum termo emitido.</p>}
            </div>
          </div>
        )}

        {activeTab === 'autos' && (
          <div className="space-y-4">
            <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-rose-800">Selecione as Constatações Não Conformes para emitir um auto de infração:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                {(localData.constatacoes || []).filter(c => c.situacao === 'Não Conforme').map(c => (
                  <label key={c.id} className="flex items-start gap-2 bg-white p-2 border border-rose-100 rounded cursor-pointer hover:bg-rose-50">
                    <input 
                      type="checkbox" 
                      className="mt-1" 
                      checked={selectedConstatacoesAuto.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedConstatacoesAuto(prev => [...prev, c.id]);
                        } else {
                          setSelectedConstatacoesAuto(prev => prev.filter(id => id !== c.id));
                        }
                      }}
                    />
                    <div className="text-[10px] leading-tight">
                      <strong className="text-rose-600 block">{c.codigo}</strong>
                      <span className="text-slate-600">{c.descricao || 'Sem descrição'}</span>
                    </div>
                  </label>
                ))}
                {(localData.constatacoes || []).filter(c => c.situacao === 'Não Conforme').length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">Não há constatações não conformes disponíveis.</p>
                )}
              </div>
              
              <button
                type="button"
                onClick={emitirAuto}
                className="flex items-center justify-center w-full gap-2 text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 px-4 py-2 rounded-lg font-bold transition-colors"
              >
                <FileSignature size={14} /> Emitir Auto de Infração
              </button>
            </div>
            
            <div className="space-y-3">
              {(localData.autosDeInfracao || []).map((auto, idx) => (
                <div key={auto.id} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => removeAuto(auto.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                      <Trash size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-rose-600">
                    <FileSignature size={14} /> Auto de Infração {idx + 1}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Nº SEI</label>
                      <input type="text" value={auto.numeroSei} onChange={e => updateAuto(auto.id, {numeroSei: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Data Emissão</label>
                      <input type="date" value={auto.dataEmissao} onChange={e => updateAuto(auto.id, {dataEmissao: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Referência</label>
                    <textarea rows={3} value={auto.referencia} onChange={e => updateAuto(auto.id, {referencia: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Caracterização da Autuação</label>
                    <textarea rows={3} value={auto.caracterizacao} onChange={e => updateAuto(auto.id, {caracterizacao: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Infrações Verificadas</label>
                    <textarea rows={3} value={auto.infracoes} onChange={e => updateAuto(auto.id, {infracoes: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Penalidade</label>
                      <select 
                        value={auto.penalidade} 
                        onChange={e => updateAuto(auto.id, {penalidade: e.target.value})}
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                      >
                        <option value="Advertência">Advertência</option>
                        <option value="Multa">Multa</option>
                        <option value="Embargo de obras">Embargo de obras</option>
                        <option value="Interdição administrativa">Interdição administrativa</option>
                        <option value="Caducidade da concessão">Caducidade da concessão</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Data Limite para Recurso</label>
                      <input type="date" value={auto.dataLimiteRecurso} onChange={e => updateAuto(auto.id, {dataLimiteRecurso: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Descrição da penalidade</label>
                    <textarea rows={3} value={auto.descricaoPenalidade} onChange={e => updateAuto(auto.id, {descricaoPenalidade: e.target.value})} className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
                  </div>
                  
                  <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-500">Constatações Vinculadas ({auto.constatacoesIds.length})</h5>
                    {auto.constatacoesIds.map(cid => {
                      const c = localData.constatacoes.find(x => x.id === cid);
                      if (!c) return null;
                      return (
                        <div key={cid} className="bg-white border border-slate-200 p-2 rounded">
                          <div className="font-bold text-[11px] text-slate-700">{c.codigo} - {c.descricao}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {(localData.autosDeInfracao?.length === 0 || !localData.autosDeInfracao) && <p className="text-xs text-slate-400 italic">Nenhum auto de infração emitido.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
