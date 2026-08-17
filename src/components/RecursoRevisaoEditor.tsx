import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Clock, AlertTriangle, Layers, ListFilter, CheckSquare, Square, AlertCircle, Plus, Settings2, Search, X, ShieldAlert } from 'lucide-react';
import { RecursoRevisaoData } from '../types';
import { IRREGULARIDADES_MAP } from './RecursoRevisaoEditorConstants';
import { loadIrregularidadesStore, saveIrregularidadesStore, IrregularidadesStore } from '../utils/irregularidadesStorage';
import { IrregularidadesManagerModal } from './IrregularidadesManagerModal';
import { loadInfracoesStore, saveInfracoesStore, InfracoesStore, InfracaoItem } from '../utils/infracoesStorage';
import { InfracoesManagerModal } from './InfracoesManagerModal';

export { IRREGULARIDADES_MAP };

interface Props {

  data: RecursoRevisaoData;
  onChange: (data: RecursoRevisaoData) => void;
}

interface CurrencyInputProps {
  value: number | string | null | undefined;
  onChange: (val: number | '') => void;
  placeholder?: string;
  className?: string;
}

function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const formatToPTBR = (val: number | string | null | undefined) => {
    if (val === '' || val === null || val === undefined) return '';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatToPTBR(value));
    }
  }, [value, isFocused]);

  const parseInputToNumber = (str: string): number | '' => {
    if (!str.trim()) return '';
    let clean = str.replace(/[^\d.,]/g, '');
    if (!clean) return '';

    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    const num = parseFloat(clean);
    return isNaN(num) ? '' : num;
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value !== '' && value !== null && value !== undefined) {
      setInputValue(formatToPTBR(value));
    } else {
      setInputValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInputToNumber(inputValue);
    onChange(parsed);
    setInputValue(formatToPTBR(parsed));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseInputToNumber(raw);
    onChange(parsed);
  };

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full border-2 border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-adasa-mid outline-none font-bold bg-white ${className}`}
      />
    </div>
  );
}

export const RecursoRevisaoEditor: React.FC<Props> = ({ data, onChange }) => {
  const STAGES = [
    "Recebido",
    "Em Análise Técnica",
    "Encaminhado à Diretoria",
    "Notificação do Usuário",
    "Finalizado"
  ];

  const TIPO_RECURSO_OPTIONS = [
    "Recurso de Revisão",
    "Pedido de Reconsideração",
    "Impugnação de Auto de Infração",
    "Recurso Hierárquico",
    "Outro"
  ];

  const RESULTADO_OPTIONS = [
    "Em Análise",
    "Deferido Parcial",
    "Deferido Total",
    "Indeferido"
  ];

  const debounceTimer = useRef<NodeJS.Timeout>();
  const [localData, setLocalData] = useState<RecursoRevisaoData>(data || {});
  const [store, setStore] = useState<IrregularidadesStore>(() => loadIrregularidadesStore());
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Infraction store and manager modal state
  const [infracoesStore, setInfracoesStore] = useState<InfracoesStore>(() => loadInfracoesStore());
  const [isInfracaoManagerOpen, setIsInfracaoManagerOpen] = useState(false);

  // Infraction filter state
  const [infracaoServicoFilter, setInfracaoServicoFilter] = useState<'all' | 'Água' | 'Esgoto'>('all');
  const [infracaoSearch, setInfracaoSearch] = useState<string>('');

  const [selectedIrregularidade, setSelectedIrregularidade] = useState<string>(() => {
    if (data?.irregularidade && store.map[data.irregularidade]) {
      return data.irregularidade;
    }
    if (data?.irregularidadeEncontrada) {
      const norm = data.irregularidadeEncontrada.trim().toLowerCase();
      for (const [cat, items] of Object.entries(store.map)) {
        if ((items as string[]).some(it => it.trim().toLowerCase() === norm || norm.includes(it.trim().toLowerCase()) || it.trim().toLowerCase().includes(norm))) {
          return cat;
        }
      }
    }
    return Object.keys(store.map)[0] || '';
  });

  const activeCategories = useMemo(() => {
    return Object.keys(store.map).filter(cat => !store.inactiveCategories.includes(cat));
  }, [store]);

  const activeSubitems = useMemo(() => {
    if (!selectedIrregularidade || !store.map[selectedIrregularidade]) return [];
    const inactivesForCat = store.inactiveEncontradas[selectedIrregularidade] || [];
    return store.map[selectedIrregularidade].filter(item => !inactivesForCat.includes(item));
  }, [store, selectedIrregularidade]);

  // Active (non-inactivated) infractions
  const activeInfracoes = useMemo(() => {
    return infracoesStore.items.filter(item => !infracoesStore.inactiveIds.includes(item.id));
  }, [infracoesStore]);

  const filteredInfracoes = useMemo(() => {
    return activeInfracoes.filter(item => {
      if (infracaoServicoFilter !== 'all' && item.servico !== infracaoServicoFilter) {
        return false;
      }
      if (infracaoSearch.trim()) {
        const q = infracaoSearch.trim().toLowerCase();
        const matchName = item.nome.toLowerCase().includes(q);
        const matchCode = String(item.code) === q || `item ${item.code}`.toLowerCase().includes(q) || `#${item.code}`.includes(q);
        return matchName || matchCode;
      }
      return true;
    });
  }, [activeInfracoes, infracaoServicoFilter, infracaoSearch]);

  const activeAguaCount = useMemo(() => {
    return activeInfracoes.filter(it => it.servico === 'Água').length;
  }, [activeInfracoes]);

  const activeEsgotoCount = useMemo(() => {
    return activeInfracoes.filter(it => it.servico === 'Esgoto').length;
  }, [activeInfracoes]);

  const isInfractionSelected = (item: InfracaoItem) => {
    if (!localData.tipoInfracao) return false;
    return localData.tipoInfracao.trim().toLowerCase() === item.nome.trim().toLowerCase();
  };

  const handleToggleInfracao = (item: InfracaoItem) => {
    if (isInfractionSelected(item)) {
      updateField('tipoInfracao', '');
    } else {
      // Set ONLY the name of the infraction
      updateField('tipoInfracao', item.nome);
    }
  };

  const handleSaveInfracoesStore = (
    newStore: InfracoesStore,
    renameInfo?: { oldName: string; newName: string }
  ) => {
    setInfracoesStore(newStore);
    saveInfracoesStore(newStore);

    if (renameInfo && localData.tipoInfracao === renameInfo.oldName) {
      updateField('tipoInfracao', renameInfo.newName);
    }
  };

  useEffect(() => {
    if (localData.irregularidade && store.map[localData.irregularidade]) {
      setSelectedIrregularidade(localData.irregularidade);
    } else if (localData.irregularidadeEncontrada) {
      const norm = localData.irregularidadeEncontrada.trim().toLowerCase();
      for (const [cat, items] of Object.entries(store.map)) {
        if ((items as string[]).some(it => it.trim().toLowerCase() === norm || norm.includes(it.trim().toLowerCase()) || it.trim().toLowerCase().includes(norm))) {
          setSelectedIrregularidade(cat);
          break;
        }
      }
    }
  }, [localData.irregularidade, localData.irregularidadeEncontrada, store]);

  const handleSaveStore = (
    newStore: IrregularidadesStore,
    renameInfo?: { type: 'cat' | 'enc'; oldName: string; newName: string; cat?: string }
  ) => {
    setStore(newStore);
    saveIrregularidadesStore(newStore);

    if (renameInfo) {
      if (renameInfo.type === 'cat') {
        if (localData.irregularidade === renameInfo.oldName) {
          updateField('irregularidade', renameInfo.newName);
        }
        if (selectedIrregularidade === renameInfo.oldName) {
          setSelectedIrregularidade(renameInfo.newName);
        }
      } else if (renameInfo.type === 'enc') {
        if (localData.irregularidadeEncontrada === renameInfo.oldName) {
          updateField('irregularidadeEncontrada', renameInfo.newName);
        }
      }
    }
  };

  useEffect(() => {
    let needsUpdate = false;
    let newData = { ...(data || {}) };
    
    // Default values
    if (!newData.servico) { newData.servico = 'Água'; needsUpdate = true; }
    if (!newData.tipoRecurso) { newData.tipoRecurso = 'Recurso de Revisão'; needsUpdate = true; }
    if (!newData.situacao) { newData.situacao = 'Recebido'; needsUpdate = true; }
    if (!newData.resultado) { newData.resultado = 'Em Análise'; needsUpdate = true; }

    // Normalize legacy stages
    if (newData.situacao === "Encaminhado a Diretoria") { newData.situacao = "Encaminhado à Diretoria"; needsUpdate = true; }
    if (newData.situacao === "Retornado da Diretoria") { newData.situacao = "Notificação do Usuário"; needsUpdate = true; }
    if (newData.situacao === "Em Análise Jurídica") { newData.situacao = "Em Análise Técnica"; needsUpdate = true; }

    // Initialize stage dates (datasEtapas) if missing or empty
    if (!newData.datasEtapas || Object.keys(newData.datasEtapas).length === 0) {
      const generated: Record<string, string> = {};
      const startStr = (newData as any).createdAt || new Date().toISOString();
      const startD = new Date(startStr);
      let currentD = new Date(startD);
      const seed = ((newData.recorrente || "").length + (newData.numeroSei || "").length + 1) % 5 + 3;
      
      const currentStage = newData.situacao || "Recebido";
      const currentIdx = STAGES.indexOf(currentStage) === -1 ? 0 : STAGES.indexOf(currentStage);

      for (let i = 0; i <= currentIdx; i++) {
        const stage = STAGES[i];
        generated[stage] = currentD.toISOString().split('T')[0];
        
        let days = seed + (i * 3);
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
        setLocalData(data || {});
      }
    }
  }, [data]);

  const updateData = (newData: RecursoRevisaoData) => {
    setLocalData(newData);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(newData);
    }, 400);
  };

  const updateField = (field: keyof RecursoRevisaoData, value: any) => {
    let updated = { ...localData, [field]: value };
    if (field === 'situacao') {
      const newStage = value;
      const datasEtapas = { ...(localData.datasEtapas || {}) };
      
      datasEtapas[newStage] = new Date().toISOString().split('T')[0];
      if (!datasEtapas["Recebido"]) {
        datasEtapas["Recebido"] = new Date().toISOString().split('T')[0];
      }
      updated.datasEtapas = datasEtapas;
    }
    updateData(updated);
  };

  const currentStage = localData.situacao || "Recebido";
  const activeIndex = STAGES.indexOf(currentStage) === -1 ? 0 : STAGES.indexOf(currentStage);

  const getStageDuration = (index: number) => {
    const dates = localData.datasEtapas || {};
    const stage = STAGES[index];
    if (stage === "Finalizado" || stage === "Finalizada") return 0;
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

  const dataRecebimento = localData.datasEtapas?.["Recebido"] || localData.dataProtocolo || '';

  let dateLimite: Date | null = null;
  let diffDias: number | null = null;

  if (dataRecebimento) {
    const parts = dataRecebimento.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const dateRec = new Date(year, month, day);
      if (!isNaN(dateRec.getTime())) {
        dateLimite = new Date(dateRec);
        dateLimite.setDate(dateLimite.getDate() + 60);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dateLimiteMidnight = new Date(dateLimite);
        dateLimiteMidnight.setHours(0, 0, 0, 0);

        const diffMs = dateLimiteMidnight.getTime() - today.getTime();
        diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
      }
    }
  }

  const formatBR = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const isFinalizado = currentStage === "Finalizado" || localData.resultado === "Deferido Total" || localData.resultado === "Deferido Parcial" || localData.resultado === "Indeferido" || localData.resultado === "Deferido / Provido" || localData.resultado === "Indeferido / Nega Provimento" || localData.resultado === "Parcialmente Provido";
  const isDirectoriaOrLater = activeIndex >= STAGES.indexOf("Encaminhado à Diretoria");

  const valAplicado = typeof localData.valorMultaQuestionada === 'number'
    ? localData.valorMultaQuestionada
    : (parseFloat(localData.valorMultaQuestionada as any) || 0);

  const valApos = typeof localData.valorMultaMantida === 'number'
    ? localData.valorMultaMantida
    : (parseFloat(localData.valorMultaMantida as any) || 0);

  const diferencaValor = valAplicado - valApos;
  const diferencaPercentual = valAplicado > 0 ? (diferencaValor / valAplicado) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Horizontal Process Flow Timeline */}
      <div className="bg-slate-50/70 border border-slate-200/60 rounded-3xl p-4 sm:p-5 mb-1 w-full">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3.5 flex items-center justify-between">
          <span>📍 Fluxo do Recurso de Revisão (Tempo de Permanência Exato)</span>
          <span className="text-adasa-mid font-bold text-xs">{currentStage}</span>
        </div>
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex items-center justify-between min-w-[700px] relative">
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
                      isActive ? 'bg-[#1A3E8A] text-white ring-4 ring-blue-100 scale-105' :
                      isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
                      'bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                    }`}>
                      {isCompleted && !isActive ? '✓' : index + 1}
                    </div>
                    <div className="flex flex-col items-center mt-1.5 w-18 sm:w-22 text-center">
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider leading-tight transition-colors line-clamp-2 ${
                        isActive ? 'text-[#1A3E8A]' : isCompleted ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}>
                        {stage}
                      </span>
                      {(stage === "Recebido" || stage === "Em Análise Técnica" || stage === "Notificação do Usuário") && (
                        <span className="text-[7.5px] sm:text-[8px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded mt-0.5 uppercase tracking-tight">
                          (SAE)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connecting Line */}
                  {index < STAGES.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-200 relative mx-1 -mt-5 min-w-[16px]">
                      <div 
                        className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: isLineCompleted ? '100%' : '0%' }}
                      />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className={`h-4.5 min-w-7 px-1 rounded-full flex items-center justify-center text-[8px] font-extrabold shadow-sm transition-all border ${
                          isLineCompleted 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`} title={`Permanência: ${duration} dias`}>
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

      {/* Box de Alerta: Data Limite para Análise */}
      {!isDirectoriaOrLater && dataRecebimento && dateLimite !== null && diffDias !== null && (
        <div className={`p-4 rounded-2xl border transition-all shadow-xs my-2 ${
          isFinalizado ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' :
          diffDias < 0 ? 'bg-red-50/90 border-red-300 text-red-950 ring-2 ring-red-200/40' :
          diffDias <= 15 ? 'bg-amber-50/90 border-amber-300 text-amber-950' :
          'bg-blue-50/80 border-blue-200 text-blue-950'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Título e Descrição */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                isFinalizado ? 'bg-emerald-200/80 text-emerald-800' :
                diffDias < 0 ? 'bg-red-200/90 text-red-800' :
                diffDias <= 15 ? 'bg-amber-200/90 text-amber-800' :
                'bg-blue-200/80 text-blue-800'
              }`}>
                {diffDias < 0 && !isFinalizado ? <AlertTriangle size={18} /> : <Clock size={18} />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <span>Data Limite para Análise</span>
                  {isFinalizado && (
                    <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold">
                      FINALIZADO
                    </span>
                  )}
                </h4>
                <p className="text-[11px] font-medium opacity-80">
                  Prazo legal de 60 dias corridos a partir da data de recebimento do recurso.
                </p>
              </div>
            </div>

            {/* Badges de Datas e Prazo Restante */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Data de Recebimento */}
              <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Recebido em:</span>
                <input
                  type="date"
                  value={dataRecebimento}
                  onChange={e => {
                    const newDate = e.target.value;
                    const newEtapas = { ...(localData.datasEtapas || {}) };
                    if (newDate) {
                      newEtapas["Recebido"] = newDate;
                    } else {
                      delete newEtapas["Recebido"];
                    }
                    updateField('datasEtapas', newEtapas);
                  }}
                  className="bg-transparent font-bold text-slate-800 text-xs outline-none cursor-pointer"
                  title="Editar Data de Recebimento"
                />
              </div>

              {/* Data Limite */}
              <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block leading-tight">Data Limite:</span>
                <span className="font-extrabold text-slate-900 text-xs">
                  {formatBR(dateLimite)}
                </span>
              </div>

              {/* Prazo Restante */}
              <div className={`px-3 py-1.5 rounded-xl border shadow-2xs font-black text-xs flex items-center gap-1 ${
                isFinalizado ? 'bg-emerald-100 border-emerald-300 text-emerald-800' :
                diffDias < 0 ? 'bg-red-100 border-red-300 text-red-800' :
                diffDias <= 15 ? 'bg-amber-100 border-amber-300 text-amber-800' :
                'bg-blue-100 border-blue-300 text-blue-800'
              }`}>
                <span className="text-[10px] font-extrabold uppercase opacity-75 mr-0.5">Prazo Restante:</span>
                {isFinalizado ? (
                  'Concluído'
                ) : diffDias < 0 ? (
                  `Vencido há ${Math.abs(diffDias)} dia(s)`
                ) : diffDias === 0 ? (
                  'Hoje (Último dia)'
                ) : (
                  `${diffDias} dia(s)`
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identificação do Processo & Nota Técnica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nº do Processo SEI Adasa</label>
          <input
            type="text"
            placeholder="Ex: 00197-00001234/2026"
            value={localData.numeroProcesso || ''}
            onChange={e => updateField('numeroProcesso', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nº do Processo Caesb</label>
          <input
            type="text"
            placeholder="Ex: 00197-00005678/2026-99"
            value={localData.numeroSei || ''}
            onChange={e => updateField('numeroSei', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nº Nota Técnica</label>
          <input
            type="text"
            placeholder="Ex: SEI n° 74 (122303909)"
            value={localData.numeroNotaTecnica || ''}
            onChange={e => updateField('numeroNotaTecnica', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
      </div>

      {/* Recorrente & Nº Inscrição Caesb */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-600">Recorrente / Interessado</label>
          <input
            type="text"
            placeholder="Nome ou razão social do recorrente"
            value={localData.recorrente || ''}
            onChange={e => updateField('recorrente', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Nº Inscrição Caesb</label>
          <input
            type="text"
            placeholder="Ex: 2406161 ou 240616-1"
            value={localData.inscricaoCaesb || localData.cpfCnpj || ''}
            onChange={e => {
              updateField('inscricaoCaesb', e.target.value);
              updateField('cpfCnpj', e.target.value);
            }}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
      </div>

      {/* Região e Localização (Latitude/Longitude) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Região Administrativa</label>
          <input
            type="text"
            placeholder="Ex: Brasília (RA I)"
            value={localData.regiaoAdministrativa || ''}
            onChange={e => updateField('regiaoAdministrativa', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Latitude</label>
          <input
            type="text"
            placeholder="Ex: -15,6656651881961"
            value={localData.latitude || ''}
            onChange={e => updateField('latitude', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Longitude</label>
          <input
            type="text"
            placeholder="Ex: -48,1936337898696"
            value={localData.longitude || ''}
            onChange={e => updateField('longitude', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
      </div>

      {/* Serviço & Classificação do Imóvel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Tipo de Serviço</label>
          <select
            value={localData.servico || 'Água'}
            onChange={e => updateField('servico', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Água">Água</option>
            <option value="Esgoto">Esgoto</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Classificação do Imóvel</label>
          <select
            value={localData.classificacaoImovel || 'Residencial'}
            onChange={e => updateField('classificacaoImovel', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            <option value="Público">Público</option>
            <option value="Residencial">Residencial</option>
            <option value="Comercial">Comercial</option>
            <option value="Industrial">Industrial</option>
          </select>
        </div>
      </div>

      {/* Irregularidades Selection (Áreas e Categorias Filtradas) */}
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <span>⚠️ Classificação da Irregularidade</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Selecione uma Irregularidade à esquerda para filtrar as opções de Irregularidade Encontrada.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="bg-white hover:bg-blue-50/80 border-2 border-blue-200 hover:border-[#1A3E8A] text-[#1A3E8A] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-2xs group cursor-pointer"
            title="Adicionar novas irregularidades, vincular itens encontrados, alterar nomes e inativar opções das listas"
          >
            <Plus size={14} className="stroke-[3] text-blue-600 group-hover:scale-110 transition-transform" />
            <span>Adicionar / Gerenciar Opções</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: IRREGULARIDADE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wide flex items-center gap-1.5">
                <Layers size={14} className="text-[#1A3E8A]" />
                <span>IRREGULARIDADE</span>
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                {activeCategories.length} disponíveis
              </span>
            </div>
            <div className="bg-white border-2 border-slate-200/90 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 shadow-inner">
              {activeCategories.length > 0 ? (
                activeCategories.map(catKey => {
                  const isSelected = selectedIrregularidade === catKey;
                  return (
                    <div
                      key={catKey}
                      onClick={() => {
                        setSelectedIrregularidade(catKey);
                        updateField('irregularidade', catKey);
                      }}
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs font-bold cursor-pointer transition-all select-none ${
                        isSelected
                          ? 'bg-blue-50/90 border border-blue-300 text-[#1A3E8A] shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckSquare size={15} className="text-[#1A3E8A]" />
                        ) : (
                          <Square size={15} className="text-slate-300" />
                        )}
                      </div>
                      <span className="leading-tight">{catKey}</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                  Nenhuma irregularidade ativa. Clique em "Adicionar / Gerenciar Opções" para cadastrar ou reativar.
                </div>
              )}
            </div>
          </div>

          {/* Box 2: IRREGULARIDADE ENCONTRADA (FILTRADA) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wide flex items-center gap-1.5">
                <ListFilter size={14} className="text-amber-600" />
                <span>IRREGULARIDADE ENCONTRADA (FILTRADAS PELA IRREGULARIDADE SELECIONADA)</span>
              </label>
              <span className="text-[10px] font-bold text-amber-600">
                {activeSubitems.length} opções
              </span>
            </div>
            <div className="bg-white border-2 border-slate-200/90 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 shadow-inner">
              {selectedIrregularidade && activeSubitems.length > 0 ? (
                activeSubitems.map(item => {
                  const isChecked = localData.irregularidadeEncontrada === item;
                  return (
                    <div
                      key={item}
                      onClick={() => {
                        const newEnc = isChecked ? '' : item;
                        updateData({
                          ...localData,
                          irregularidade: selectedIrregularidade,
                          irregularidadeEncontrada: newEnc
                        });
                      }}
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs font-semibold cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'bg-amber-50/90 border border-amber-300 text-amber-950 font-bold shadow-2xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={15} className="text-amber-600" />
                        ) : (
                          <Square size={15} className="text-slate-300" />
                        )}
                      </div>
                      <span className="leading-tight">{item}</span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                  {selectedIrregularidade
                    ? "Nenhum item ativo vinculado a esta irregularidade. Use o botão acima para adicionar novos itens."
                    : "Selecione uma Irregularidade à esquerda para visualizar as opções correspondentes."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Irregularidade Encontrada (Bloqueada/Selecionada) + Qtde */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-bold text-slate-600">Irregularidade Encontrada (Selecionada)</label>
            <input
              type="text"
              readOnly
              placeholder="Nenhuma irregularidade selecionada"
              value={localData.irregularidadeEncontrada || ''}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-slate-100/90 cursor-not-allowed outline-none"
            />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-xs font-bold text-slate-600">Qtde Irregularidades</label>
            <input
              type="number"
              min="0"
              placeholder="Ex: 1"
              value={localData.qtdeIrregularidades ?? ''}
              onChange={e => updateField('qtdeIrregularidades', e.target.value ? Number(e.target.value) : '')}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium bg-white"
            />
          </div>
        </div>
      </div>

      {/* Classificação do Tipo de Infração (Água e Esgoto) */}
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={15} className="text-[#1A3E8A]" />
              <span>⚖️ Classificação do Tipo de Infração</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Filtre por tipo de serviço (Água / Esgoto) ou busque pelo nome da infração para selecionar o enquadramento regulatório.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsInfracaoManagerOpen(true)}
            className="bg-white hover:bg-blue-50/80 border-2 border-blue-200 hover:border-[#1A3E8A] text-[#1A3E8A] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 self-start sm:self-auto transition-all shadow-2xs group cursor-pointer"
            title="Adicionar novas infrações, alterar nomes e inativar opções das listas"
          >
            <Plus size={14} className="stroke-[3] text-blue-600 group-hover:scale-110 transition-transform" />
            <span>Adicionar / Gerenciar Opções</span>
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Filtro de Serviço Tabs */}
          <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl p-1 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setInfracaoServicoFilter('all')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                infracaoServicoFilter === 'all'
                  ? 'bg-[#1A3E8A] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Todas ({activeInfracoes.length})
            </button>
            <button
              type="button"
              onClick={() => setInfracaoServicoFilter('Água')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                infracaoServicoFilter === 'Água'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${infracaoServicoFilter === 'Água' ? 'bg-white' : 'bg-blue-500'}`} />
              Água ({activeAguaCount})
            </button>
            <button
              type="button"
              onClick={() => setInfracaoServicoFilter('Esgoto')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                infracaoServicoFilter === 'Esgoto'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${infracaoServicoFilter === 'Esgoto' ? 'bg-white' : 'bg-emerald-600'}`} />
              Esgoto ({activeEsgotoCount})
            </button>
          </div>

          {/* Campo de Busca Textual */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar infração por nome ou número (ex: hidrômetro, 1, 15)..."
              value={infracaoSearch}
              onChange={e => setInfracaoSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-white border-2 border-slate-200 focus:border-[#1A3E8A] rounded-xl text-xs font-medium outline-none text-slate-800 placeholder:text-slate-400"
            />
            {infracaoSearch && (
              <button
                type="button"
                onClick={() => setInfracaoSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpar busca"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Infrações */}
        <div className="bg-white border-2 border-slate-200/90 rounded-xl p-2 max-h-64 overflow-y-auto space-y-1.5 shadow-inner">
          {filteredInfracoes.length > 0 ? (
            filteredInfracoes.map(item => {
              const checked = isInfractionSelected(item);
              const isAgua = item.servico === 'Água';
              return (
                <div
                  key={`${item.servico}-${item.code}`}
                  onClick={() => handleToggleInfracao(item)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs cursor-pointer transition-all select-none border ${
                    checked
                      ? isAgua
                        ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold shadow-2xs'
                        : 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                      : 'hover:bg-slate-50 text-slate-700 border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {checked ? (
                      <CheckSquare size={16} className={isAgua ? 'text-blue-700' : 'text-emerald-700'} />
                    ) : (
                      <Square size={16} className="text-slate-300" />
                    )}
                  </div>

                  {/* Código Numérico */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide ${
                      isAgua 
                        ? 'bg-blue-100/80 text-[#1A3E8A] border border-blue-200' 
                        : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
                    }`}>
                      Item {String(item.code).padStart(2, '0')}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      isAgua
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {item.servico}
                    </span>
                  </div>

                  {/* Nome da Infração */}
                  <span className="leading-snug flex-1">{item.nome}</span>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 font-medium italic">
              Nenhuma infração encontrada para o filtro ou termo de busca informado.
            </div>
          )}
        </div>

        {/* Campo Tipo de Infração Selecionado */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span>Tipo de Infração (Selecionado)</span>
            </label>
            {localData.tipoInfracao && (
              <button
                type="button"
                onClick={() => updateField('tipoInfracao', '')}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
              >
                <X size={12} />
                <span>Limpar Seleção</span>
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              readOnly
              placeholder="Nenhuma infração selecionada na lista acima"
              value={localData.tipoInfracao || ''}
              className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-slate-100/90 cursor-not-allowed outline-none"
            />
          </div>
        </div>
      </div>

      {/* Etapa e Situação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Etapa Atual</label>
          <select
            value={localData.situacao || 'Recebido'}
            onChange={e => updateField('situacao', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            {STAGES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Situação</label>
          <select
            value={localData.resultado || 'Em Análise'}
            onChange={e => updateField('resultado', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-semibold text-slate-700 bg-white"
          >
            {RESULTADO_OPTIONS.map(res => (
              <option key={res} value={res}>{res}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Data Extrato Diretoria</label>
          <input
            type="date"
            value={localData.dataProtocolo || ''}
            onChange={e => updateField('dataProtocolo', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600">Data Notificação Usuário</label>
          <input
            type="date"
            value={localData.dataDistribuicao || ''}
            onChange={e => updateField('dataDistribuicao', e.target.value)}
            className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none font-medium"
          />
        </div>
      </div>

      {/* Valores Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>💰 Valor da Multa Aplicada pelo Prestador</span>
          </label>
          <CurrencyInput
            placeholder="0,00"
            value={localData.valorMultaQuestionada}
            onChange={val => updateField('valorMultaQuestionada', val)}
            className="text-slate-800"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>⚖️ Valor da Multa Após Recurso</span>
          </label>
          <CurrencyInput
            placeholder="0,00"
            value={localData.valorMultaMantida}
            onChange={val => updateField('valorMultaMantida', val)}
            className="text-emerald-700 font-extrabold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>📉 Diferença Em Favor do Usuário</span>
          </label>
          <div className={`w-full border-2 rounded-lg px-3 py-2 text-sm font-black flex items-center justify-between min-h-[38px] ${
            diferencaValor > 0
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : diferencaValor < 0
              ? 'bg-red-50 border-red-300 text-red-900'
              : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <span>
              {diferencaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
              diferencaValor > 0
                ? 'bg-emerald-200/80 text-emerald-900'
                : diferencaValor < 0
                ? 'bg-red-200/80 text-red-900'
                : 'bg-slate-200 text-slate-700'
            }`}>
              ({diferencaPercentual.toFixed(2).replace('.', ',')}%)
            </span>
          </div>
        </div>
      </div>

      {/* Posicionamentos e Deliberações */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Posicionamento Diretoria</label>
        <textarea
          placeholder="Termos do posicionamento ou decisão colegiada da Diretoria..."
          value={localData.decisaoDiretoria || ''}
          onChange={e => updateField('decisaoDiretoria', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Reunião Pública Diretoria</label>
        <textarea
          placeholder="Ata, pauta, deliberações ou notas sobre a Reunião Pública da Diretoria..."
          value={localData.reuniaoPublicaDiretoria || ''}
          onChange={e => updateField('reuniaoPublicaDiretoria', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[60px]"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-600">Observações Complementares</label>
        <textarea
          placeholder="Anotações internas, prazos, intimações ou acompanhamento..."
          value={localData.observacao || ''}
          onChange={e => updateField('observacao', e.target.value)}
          className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-adasa-mid outline-none min-h-[50px]"
        />
      </div>

      {/* Table: Histórico de Tempos por Etapa */}
      <div className="mt-6 border border-slate-200/80 bg-slate-50/50 rounded-2xl p-4">
        <div className="mb-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            📋 HISTÓRICO DE PERMANÊNCIA POR ETAPA
          </h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Detalhamento exato de datas e tempos de cada etapa do recurso de revisão</p>
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
                const duration = getStageDuration(index);

                const formattedDate = entryDate 
                  ? entryDate.split('-').reverse().join('/') 
                  : '-';

                return (
                  <tr 
                    key={stage} 
                    className={`transition-colors ${
                      isActive 
                        ? 'bg-blue-50/40 font-semibold' 
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
                      {(stage === "Recebido" || stage === "Em Análise Técnica" || stage === "Notificação do Usuário") && (
                        <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase">
                          (SAE)
                        </span>
                      )}
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
                      {!entryDate || stage === "Finalizado" || stage === "Finalizada" ? (
                        <span className="text-slate-300 font-normal">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className={isActive ? 'text-[#1A3E8A]' : 'text-emerald-600'}>
                            {duration}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {duration === 1 ? 'Dia' : 'Dias'}
                          </span>
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

      {/* Irregularidades & Subitens Management Modal */}
      <IrregularidadesManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        store={store}
        onSaveStore={handleSaveStore}
        initialSelectedCategory={selectedIrregularidade}
      />

      {/* Tipos de Infração Management Modal */}
      <InfracoesManagerModal
        isOpen={isInfracaoManagerOpen}
        onClose={() => setIsInfracaoManagerOpen(false)}
        store={infracoesStore}
        onSaveStore={handleSaveInfracoesStore}
      />
    </div>
  );
};
