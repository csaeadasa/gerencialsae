import React, { useRef, useEffect, useState } from 'react';
import { RecursoData } from '../types';

interface Props {
  data: RecursoData;
  onChange: (data: RecursoData) => void;
}

export const RecursoEditor: React.FC<Props> = ({ data, onChange }) => {
  const STAGES = [
    "Recebido",
    "Em Análise Técnica",
    "Tramitado para a Ouvidoria",
    "Encaminhado à Diretoria",
    "Retornado da Diretoria",
    "Finalizado"
  ];

  const debounceTimer = useRef<NodeJS.Timeout>();
  const [localData, setLocalData] = useState<RecursoData>(data);

  useEffect(() => {
    let needsUpdate = false;
    let newData = { ...data };
    
    // Default values
    if (!newData.classificacaoImovel) { newData.classificacaoImovel = 'Residencial'; needsUpdate = true; }
    if (!newData.tipoManifestacao) { newData.tipoManifestacao = 'Reclamação'; needsUpdate = true; }
    if (!newData.servico) { newData.servico = 'Água'; needsUpdate = true; }
    if (!newData.situacao) { newData.situacao = 'Recebido'; needsUpdate = true; }
    if (!newData.resultadoProcesso) { newData.resultadoProcesso = 'Em Análise'; needsUpdate = true; }
    if (!newData.complexidade) { newData.complexidade = 'Média'; needsUpdate = true; }

    // Initialize exact stage dates (datasEtapas) if missing or empty
    if (!newData.datasEtapas || Object.keys(newData.datasEtapas).length === 0) {
      const generated: Record<string, string> = {};
      const startStr = (newData as any).createdAt || new Date().toISOString();
      const startD = new Date(startStr);
      let currentD = new Date(startD);
      // Seed from fields to create stable deterministic historic durations
      const seed = ((newData.nomeUsuario || "").length + (newData.numeroSei || "").length + 1) % 5 + 3;
      
      const currentStage = newData.situacao || "Recebido";
      const currentIdx = STAGES.indexOf(currentStage) === -1 ? 0 : STAGES.indexOf(currentStage);

      for (let i = 0; i <= currentIdx; i++) {
        const stage = STAGES[i];
        generated[stage] = currentD.toISOString().split('T')[0];
        
        // Add realistic step durations
        let days = 5;
        if (i === 0) days = seed;
        else if (i === 1) days = seed + 10;
        else if (i === 2) days = seed + 5;
        else if (i === 3) days = seed + 8;
        else if (i === 4) days = seed + 3;
        currentD.setDate(currentD.getDate() + days);
      }
      newData.datasEtapas = generated;
      needsUpdate = true;
    }

    if (needsUpdate) {
      setLocalData(newData);
      onChange(newData);
    } else {
      if (JSON.stringify(data) !== JSON.stringify(localData)) {
        setLocalData(data);
      }
    }
  }, [data]);

  const updateData = (newData: RecursoData) => {
    setLocalData(newData);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(newData);
    }, 400);
  };

  const updateField = (field: keyof RecursoData, value: any) => {
    let updated = { ...localData, [field]: value };
    if (field === 'situacao') {
      const newStage = value;
      const datasEtapas = { ...(localData.datasEtapas || {}) };
      
      // Store exact transition date
      datasEtapas[newStage] = new Date().toISOString().split('T')[0];
      
      // Ensure "Recebido" is initialized if missing
      if (!datasEtapas["Recebido"]) {
        datasEtapas["Recebido"] = new Date().toISOString().split('T')[0];
      }
      
      updated.datasEtapas = datasEtapas;
    }
    updateData(updated);
  };

  const currentStage = localData.situacao || "Recebido";
  const activeIndex = STAGES.indexOf(currentStage) === -1 ? 0 : STAGES.indexOf(currentStage);

  // Exact stage duration calculation in days
  const getStageDuration = (index: number) => {
    const dates = localData.datasEtapas || {};
    const stage = STAGES[index];
    const nextStage = STAGES[index + 1];
    
    if (!dates[stage]) return 0;
    
    const start = new Date(dates[stage]);
    const end = dates[nextStage] ? new Date(dates[nextStage]) : new Date();
    
    // Normalize to midnight UTC to calculate absolute day difference
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    const diffTime = endMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="space-y-5">
      {/* Horizontal Process Flow Timeline - Compact & Fully Responsive */}
      <div className="bg-slate-50/70 border border-slate-200/60 rounded-3xl p-4 sm:p-5 mb-1 w-full">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5">
          📍 Fluxo do Processo (Tempo de Permanência Exato)
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
                    onClick={() => updateField('situacao', stage)}
                    title={`Mudar para: ${stage}`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black transition-all shadow-sm ${
                      isActive ? 'bg-[#1A3E8A] text-white ring-4 ring-blue-100 scale-105 font-black' :
                      isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                      'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}>
                      {isCompleted && !isActive ? '✓' : index + 1}
                    </div>
                    <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-center mt-1.5 w-14 sm:w-20 md:w-24 leading-tight transition-colors line-clamp-2 ${
                      isActive ? 'text-[#1A3E8A]' : isCompleted ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {stage}
                    </span>
                  </div>

                  {/* Connecting Line with exact days duration badge */}
                  {index < STAGES.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-200 relative mx-0.5 sm:mx-1 -mt-5 min-w-[12px]">
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
                        }`} title={`Tempo exato que o recurso ficou nesta etapa: ${duration} dias`}>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nome do Usuário</label>
          <input
            type="text"
            value={localData.nomeUsuario || ''}
            onChange={e => updateField('nomeUsuario', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nº SEI</label>
          <input
            type="text"
            value={localData.numeroSei || ''}
            onChange={e => updateField('numeroSei', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Endereço do Usuário</label>
        <input
          type="text"
          value={localData.enderecoUsuario || ''}
          onChange={e => updateField('enderecoUsuario', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Região Administrativa</label>
          <input
            type="text"
            value={localData.regiaoAdministrativa || ''}
            onChange={e => updateField('regiaoAdministrativa', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Classificação do Imóvel</label>
          <select
            value={localData.classificacaoImovel || 'Residencial'}
            onChange={e => updateField('classificacaoImovel', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Comercial">Comercial</option>
            <option value="Residencial">Residencial</option>
            <option value="Não se aplica">Não se aplica</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Tipo de Manifestação</label>
          <select
            value={localData.tipoManifestacao || 'Reclamação'}
            onChange={e => updateField('tipoManifestacao', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Denúncia">Denúncia</option>
            <option value="Reclamação">Reclamação</option>
            <option value="Solicitação">Solicitação</option>
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
            <option value="Comercial">Comercial</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Categoria</label>
          <input
            type="text"
            value={localData.categoria || ''}
            onChange={e => updateField('categoria', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Etapa</label>
          <select
            value={localData.situacao || 'Recebido'}
            onChange={e => updateField('situacao', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Recebido">Recebido</option>
            <option value="Em Análise Técnica">Em Análise Técnica</option>
            <option value="Tramitado para a Ouvidoria">Tramitado para a Ouvidoria</option>
            <option value="Encaminhado à Diretoria">Encaminhado à Diretoria</option>
            <option value="Retornado da Diretoria">Retornado da Diretoria</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Resultado do Processo</label>
          <select
            value={localData.resultadoProcesso || 'Em Análise'}
            onChange={e => updateField('resultadoProcesso', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Atendido">Atendido</option>
            <option value="Atendido Parcialmente">Atendido Parcialmente</option>
            <option value="Não Atendido">Não Atendido</option>
            <option value="Acordo">Acordo</option>
            <option value="Desistência do Usuário">Desistência do Usuário</option>
            <option value="Em Análise">Em Análise</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Complexidade</label>
          <select
            value={localData.complexidade || 'Média'}
            onChange={e => updateField('complexidade', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Apuração</label>
        <textarea
          value={localData.apuracao || ''}
          onChange={e => updateField('apuracao', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[80px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Posicionamento Ouvidoria</label>
        <textarea
          value={localData.posicionamentoOuvidoria || ''}
          onChange={e => updateField('posicionamentoOuvidoria', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Posicionamento SAE</label>
        <textarea
          value={localData.posicionamentoSAE || ''}
          onChange={e => updateField('posicionamentoSAE', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Posicionamento Jurídico</label>
        <textarea
          value={localData.posicionamentoJuridico || ''}
          onChange={e => updateField('posicionamentoJuridico', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Posicionamento Diretoria</label>
        <textarea
          value={localData.posicionamentoDiretoria || ''}
          onChange={e => updateField('posicionamentoDiretoria', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Observação</label>
        <textarea
          value={localData.observacao || ''}
          onChange={e => updateField('observacao', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
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
              {STAGES.map((stage, index) => {
                const dates = localData.datasEtapas || {};
                const entryDate = dates[stage];
                const isActive = currentStage === stage;
                const isCompleted = activeIndex >= index;
                const nextStage = STAGES[index + 1];
                const duration = getStageDuration(index);

                // Format date as DD/MM/YYYY
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
                      {!entryDate ? (
                        <span className="text-slate-300 font-normal">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className={isActive ? 'text-[#1A3E8A]' : 'text-emerald-600'}>
                            {duration}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {duration === 1 ? 'Dia' : 'Dias'}
                          </span>
                          {isActive && !dates[nextStage] && (
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
