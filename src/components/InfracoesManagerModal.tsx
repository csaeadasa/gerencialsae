import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Check,
  X,
  ShieldAlert,
  EyeOff,
  Eye,
  AlertCircle,
  Search,
  RotateCcw,
  Sparkles,
  Info,
  AlertTriangle
} from 'lucide-react';
import { InfracaoItem, InfracoesStore, getDefaultInfracoes } from '../utils/infracoesStorage';

interface InfracoesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: InfracoesStore;
  onSaveStore: (newStore: InfracoesStore, renameInfo?: { oldName: string; newName: string }) => void;
}

export const InfracoesManagerModal: React.FC<InfracoesManagerModalProps> = ({
  isOpen,
  onClose,
  store,
  onSaveStore
}) => {
  // New item form state
  const [newServico, setNewServico] = useState<'Água' | 'Esgoto'>('Água');
  const [newNome, setNewNome] = useState('');
  const [newCode, setNewCode] = useState<number | ''>('');
  const [addError, setAddError] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');
  const [editingCode, setEditingCode] = useState<number>(1);
  const [editingServico, setEditingServico] = useState<'Água' | 'Esgoto'>('Água');
  const [editError, setEditError] = useState<string | null>(null);

  // Restore confirm modal state
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Filter & search states
  const [serviceFilter, setServiceFilter] = useState<'all' | 'Água' | 'Esgoto'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactivesOnly, setShowInactivesOnly] = useState(false);

  // Suggest next code when changing service in creation form
  const getNextCode = (servico: 'Água' | 'Esgoto') => {
    const existingCodes = store.items
      .filter(it => it.servico === servico)
      .map(it => it.code);
    if (existingCodes.length === 0) return 1;
    return Math.max(...existingCodes) + 1;
  };

  const handleAddInfraction = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmedNome = newNome.trim();
    if (!trimmedNome) {
      setAddError('Informe a descrição/nome da infração.');
      return;
    }

    const codeToUse = typeof newCode === 'number' && newCode > 0 ? newCode : getNextCode(newServico);

    // Check duplicate name ONLY within the same service
    const duplicate = store.items.some(
      it => it.servico === newServico && it.nome.trim().toLowerCase() === trimmedNome.toLowerCase()
    );
    if (duplicate) {
      setAddError(`Já existe uma infração de ${newServico} cadastrada com esta mesma descrição.`);
      return;
    }

    const newItem: InfracaoItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: codeToUse,
      servico: newServico,
      nome: trimmedNome,
      isCustom: true
    };

    const newStore: InfracoesStore = {
      ...store,
      items: [...store.items, newItem]
    };

    onSaveStore(newStore);
    setNewNome('');
    setNewCode('');
    setAddError(null);
  };

  const handleStartEdit = (item: InfracaoItem) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setEditingCode(item.code);
    setEditingServico(item.servico);
    setEditError(null);
  };

  const handleSaveEdit = (originalItem: InfracaoItem) => {
    setEditError(null);
    const trimmedNome = editingNome.trim();
    if (!trimmedNome) {
      setEditError('O texto da infração não pode ser vazio.');
      return;
    }

    const isRenamed = trimmedNome !== originalItem.nome;
    const isServiceChanged = editingServico !== originalItem.servico;

    if (isRenamed || isServiceChanged) {
      // Check duplicate name ONLY within the selected target service, ignoring self
      const duplicate = store.items.some(
        it => it.id !== originalItem.id && it.servico === editingServico && it.nome.trim().toLowerCase() === trimmedNome.toLowerCase()
      );
      if (duplicate) {
        setEditError(`Já existe outra infração de ${editingServico} com esta mesma descrição.`);
        return;
      }
    }

    const updatedItems = store.items.map(it => {
      if (it.id === originalItem.id || (it.servico === originalItem.servico && it.code === originalItem.code && it.nome === originalItem.nome)) {
        return {
          ...it,
          id: it.id,
          nome: trimmedNome,
          code: editingCode > 0 ? editingCode : it.code,
          servico: editingServico
        };
      }
      return it;
    });

    const newStore: InfracoesStore = {
      ...store,
      items: updatedItems
    };

    onSaveStore(
      newStore,
      isRenamed ? { oldName: originalItem.nome, newName: trimmedNome } : undefined
    );
    setEditingId(null);
    setEditError(null);
  };

  const handleToggleInactive = (id: string) => {
    const isCurrentlyInactive = store.inactiveIds.includes(id);
    let newInactiveIds: string[];
    if (isCurrentlyInactive) {
      newInactiveIds = store.inactiveIds.filter(x => x !== id);
    } else {
      newInactiveIds = [...store.inactiveIds, id];
    }

    const newStore: InfracoesStore = {
      ...store,
      inactiveIds: newInactiveIds
    };
    onSaveStore(newStore);
  };

  const handleConfirmRestoreDefaults = () => {
    const defaults = getDefaultInfracoes();
    const customItems = store.items.filter(it => it.isCustom);
    const combined = [...defaults, ...customItems];
    const newStore: InfracoesStore = {
      items: combined,
      inactiveIds: []
    };
    onSaveStore(newStore);
    setShowRestoreConfirm(false);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return store.items.filter(item => {
      const isInactive = store.inactiveIds.includes(item.id);

      if (showInactivesOnly && !isInactive) {
        return false;
      }

      if (serviceFilter !== 'all' && item.servico !== serviceFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchName = item.nome.toLowerCase().includes(q);
        const matchCode = String(item.code) === q || `item ${item.code}`.toLowerCase().includes(q);
        const matchServico = item.servico.toLowerCase().includes(q);
        return matchName || matchCode || matchServico;
      }

      return true;
    });
  }, [store, serviceFilter, searchTerm, showInactivesOnly]);

  const totalInactives = store.inactiveIds.length;
  const totalAgua = store.items.filter(it => it.servico === 'Água').length;
  const totalEsgoto = store.items.filter(it => it.servico === 'Esgoto').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A3E8A] via-[#1E4AA8] to-[#2558C9] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
              <ShieldAlert size={22} className="text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>Gerenciar Tipos de Infração</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  {store.items.length} itens
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-medium">
                Cadastre novas infrações, renomeie descrições e inative opções sem perda de histórico.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white/90 hover:text-white cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Informative Banner regarding No Deletion */}
        <div className="bg-amber-50 border-b border-amber-200/90 px-5 py-2.5 flex items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Aviso Regulatório:</strong> A exclusão definitiva está desativada para manter a rastreabilidade dos autos. Em vez de excluir, utilize a <strong>inativação</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRestoreConfirm(true)}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline underline-offset-2 shrink-0 cursor-pointer"
            title="Restaurar lista de infrações originais da ADASA"
          >
            <RotateCcw size={12} />
            <span>Restaurar Padrões</span>
          </button>
        </div>

        {/* Restore confirmation sub-modal */}
        {showRestoreConfirm && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs z-30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Restaurar Infrações Originais?</h3>
                  <p className="text-xs text-slate-500">Esta ação irá restaurar os textos padrão da Resolução ADASA e limpar todas as inativações. As infrações personalizadas serão preservadas.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestoreDefaults}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer"
                >
                  Sim, Restaurar Padrões
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
          {/* Cadastro de Nova Infração */}
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-[#1A3E8A] tracking-wider flex items-center gap-1.5">
                <Plus size={15} className="stroke-[3]" />
                <span>Cadastrar Novo Tipo de Infração</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                Próximo código sugerido: {getNextCode(newServico)}
              </span>
            </div>

            {addError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-red-500" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddInfraction} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Tipo de Serviço */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wide">
                    Serviço Regulado
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setNewServico('Água');
                        setNewCode(getNextCode('Água'));
                      }}
                      className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        newServico === 'Água'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      💧 Água
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewServico('Esgoto');
                        setNewCode(getNextCode('Esgoto'));
                      }}
                      className={`py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        newServico === 'Esgoto'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      🌱 Esgoto
                    </button>
                  </div>
                </div>

                {/* Código / Número */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wide">
                    Item Nº
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={String(getNextCode(newServico))}
                    value={newCode}
                    onChange={e => setNewCode(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#1A3E8A] rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-slate-800"
                  />
                </div>

                {/* Descrição / Nome da Infração */}
                <div className="sm:col-span-6 space-y-1">
                  <label className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wide">
                    Descrição da Infração
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Intervenção indevida na rede coletora..."
                      value={newNome}
                      onChange={e => {
                        setNewNome(e.target.value);
                        if (addError) setAddError(null);
                      }}
                      className="flex-1 bg-slate-50 border-2 border-slate-200 focus:border-[#1A3E8A] rounded-xl px-3 py-1.5 text-xs font-medium outline-none text-slate-800"
                    />
                    <button
                      type="submit"
                      className="bg-[#1A3E8A] hover:bg-[#153270] text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={14} className="stroke-[3]" />
                      <span>Cadastrar</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Listagem e Ações */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Service Filter Tabs */}
              <div className="flex items-center gap-1 bg-white border-2 border-slate-200 rounded-xl p-1 shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setServiceFilter('all')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    serviceFilter === 'all'
                      ? 'bg-[#1A3E8A] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Todas ({store.items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter('Água')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    serviceFilter === 'Água'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${serviceFilter === 'Água' ? 'bg-white' : 'bg-blue-500'}`} />
                  Água ({totalAgua})
                </button>
                <button
                  type="button"
                  onClick={() => setServiceFilter('Esgoto')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    serviceFilter === 'Esgoto'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${serviceFilter === 'Esgoto' ? 'bg-white' : 'bg-emerald-600'}`} />
                  Esgoto ({totalEsgoto})
                </button>
              </div>

              {/* Inactives Toggle */}
              {totalInactives > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInactivesOnly(!showInactivesOnly)}
                  className={`px-3 py-1 rounded-xl text-xs flex items-center gap-1.5 transition-all border cursor-pointer ${
                    showInactivesOnly
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-black'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <EyeOff size={13} className="text-amber-600" />
                  <span>Apenas Inativos ({totalInactives})</span>
                </button>
              )}

              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border-2 border-slate-200 focus:border-[#1A3E8A] rounded-xl text-xs font-medium outline-none text-slate-800 placeholder:text-slate-400"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List of Infractions */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-2.5 max-h-[46vh] overflow-y-auto space-y-1.5 shadow-inner">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => {
                  const isInactive = store.inactiveIds.includes(item.id);
                  const isAgua = item.servico === 'Água';
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <div
                        key={item.id}
                        className="bg-blue-50 border-2 border-blue-400 rounded-xl p-3 space-y-2 shadow-md animate-fadeIn"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                            <Edit3 size={14} />
                            <span>Editando Infração ({item.servico} - Item {item.code})</span>
                          </div>
                          {isInactive && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                              Item atualmente inativado
                            </span>
                          )}
                        </div>

                        {editError && (
                          <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-xs font-bold text-red-800 flex items-center gap-1.5">
                            <AlertCircle size={14} className="shrink-0 text-red-600" />
                            <span>{editError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Serviço</label>
                            <select
                              value={editingServico}
                              onChange={e => {
                                setEditingServico(e.target.value as 'Água' | 'Esgoto');
                                setEditError(null);
                              }}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none"
                            >
                              <option value="Água">Água</option>
                              <option value="Esgoto">Esgoto</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nº Item</label>
                            <input
                              type="number"
                              min="1"
                              value={editingCode}
                              onChange={e => {
                                setEditingCode(Number(e.target.value));
                                setEditError(null);
                              }}
                              className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 outline-none"
                              placeholder="Nº Item"
                            />
                          </div>
                          <div className="sm:col-span-7">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Texto da Infração</label>
                            <input
                              type="text"
                              value={editingNome}
                              onChange={e => {
                                setEditingNome(e.target.value);
                                setEditError(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(item);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditError(null);
                                }
                              }}
                              className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 outline-none"
                              placeholder="Nome da infração"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditError(null);
                            }}
                            className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item)}
                            className="px-4 py-1 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-all ${
                        isInactive
                          ? 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-60'
                          : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      {/* Left: Code, Service, Name */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="shrink-0 flex items-center gap-1.5 mt-0.5 sm:mt-0">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide ${
                            isInactive
                              ? 'bg-slate-200 text-slate-500 border border-slate-300'
                              : isAgua
                              ? 'bg-blue-100/90 text-[#1A3E8A] border border-blue-200'
                              : 'bg-emerald-100/90 text-emerald-800 border border-emerald-200'
                          }`}>
                            Item {String(item.code).padStart(2, '0')}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            isInactive
                              ? 'bg-slate-200 text-slate-500'
                              : isAgua
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {item.servico}
                          </span>
                          {item.isCustom && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                              Personalizada
                            </span>
                          )}
                        </div>
                        <span className={`leading-snug ${isInactive ? 'line-through text-slate-500' : 'font-medium text-slate-800'}`}>
                          {item.nome}
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar nome e número da infração"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Inactivate / Reactivate */}
                        <button
                          type="button"
                          onClick={() => handleToggleInactive(item.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer ${
                            isInactive
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                          }`}
                          title={isInactive ? 'Reativar esta infração' : 'Inativar esta infração (não será listada no formulário)'}
                        >
                          {isInactive ? (
                            <>
                              <Eye size={13} />
                              <span>Reativar</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={13} />
                              <span>Inativar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 font-medium italic">
                  Nenhuma infração encontrada para os critérios informados.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Info size={14} className="text-slate-400" />
            <span>As alterações são salvas automaticamente e refletidas no formulário.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#1A3E8A] hover:bg-[#153270] text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            Concluir e Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
