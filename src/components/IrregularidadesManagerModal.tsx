import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Check, 
  X, 
  Layers, 
  ListFilter, 
  EyeOff, 
  Eye, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { IrregularidadesStore } from '../utils/irregularidadesStorage';
import { IRREGULARIDADES_MAP } from './RecursoRevisaoEditorConstants';

interface IrregularidadesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: IrregularidadesStore;
  onSaveStore: (newStore: IrregularidadesStore, renameInfo?: { type: 'cat' | 'enc'; oldName: string; newName: string; cat?: string }) => void;
  initialSelectedCategory?: string;
}

export const IrregularidadesManagerModal: React.FC<IrregularidadesManagerModalProps> = ({
  isOpen,
  onClose,
  store,
  onSaveStore,
  initialSelectedCategory
}) => {
  const [selectedCat, setSelectedCat] = useState<string>(() => {
    if (initialSelectedCategory && store.map[initialSelectedCategory]) {
      return initialSelectedCategory;
    }
    return Object.keys(store.map)[0] || '';
  });

  // Inputs for adding new items
  const [newCatInput, setNewCatInput] = useState('');
  const [newEncInput, setNewEncInput] = useState('');

  // Editing state for Category
  const [editingCatKey, setEditingCatKey] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');

  // Editing state for Encontrada subitem
  const [editingEncKey, setEditingEncKey] = useState<string | null>(null);
  const [editingEncValue, setEditingEncValue] = useState('');

  // Filter/Search in manager
  const [showInactivesOnly, setShowInactivesOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const categories = Object.keys(store.map);

  // Handlers for Categories
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatInput.trim().toUpperCase();
    if (!trimmed) return;
    if (store.map[trimmed]) {
      alert('Já existe uma irregularidade com este nome.');
      return;
    }

    const newMap = { ...store.map, [trimmed]: [] };
    const newStore: IrregularidadesStore = {
      ...store,
      map: newMap
    };
    onSaveStore(newStore);
    setNewCatInput('');
    setSelectedCat(trimmed);
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCatKey(cat);
    setEditingCatValue(cat);
  };

  const handleSaveEditCategory = (oldCat: string) => {
    const trimmed = editingCatValue.trim().toUpperCase();
    if (!trimmed || trimmed === oldCat) {
      setEditingCatKey(null);
      return;
    }
    if (store.map[trimmed] && trimmed !== oldCat) {
      alert('Já existe outra irregularidade com este nome.');
      return;
    }

    // Reconstruct map preserving order
    const newMap: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(store.map)) {
      if (k === oldCat) {
        newMap[trimmed] = v as string[];
      } else {
        newMap[k] = v as string[];
      }
    }

    // Update inactive categories
    const newInactiveCats = store.inactiveCategories.map(c => (c === oldCat ? trimmed : c));
    
    // Update inactive encontradas map key
    const newInactiveEnc: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(store.inactiveEncontradas)) {
      if (k === oldCat) {
        newInactiveEnc[trimmed] = v as string[];
      } else {
        newInactiveEnc[k] = v as string[];
      }
    }

    const newStore: IrregularidadesStore = {
      map: newMap,
      inactiveCategories: newInactiveCats,
      inactiveEncontradas: newInactiveEnc
    };

    onSaveStore(newStore, { type: 'cat', oldName: oldCat, newName: trimmed });
    setEditingCatKey(null);
    if (selectedCat === oldCat) {
      setSelectedCat(trimmed);
    }
  };

  const handleToggleInactiveCategory = (cat: string) => {
    const isCurrentlyInactive = store.inactiveCategories.includes(cat);
    let newInactiveCats: string[];
    if (isCurrentlyInactive) {
      // Reactivate
      newInactiveCats = store.inactiveCategories.filter(c => c !== cat);
    } else {
      // Inactivate
      newInactiveCats = [...store.inactiveCategories, cat];
    }

    const newStore: IrregularidadesStore = {
      ...store,
      inactiveCategories: newInactiveCats
    };
    onSaveStore(newStore);
  };

  // Handlers for Subitems (Irregularidades Encontradas)
  const handleAddEncontrada = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEncInput.trim();
    if (!trimmed || !selectedCat) return;

    const currentItems = store.map[selectedCat] || [];
    if (currentItems.includes(trimmed)) {
      alert('Este item já está vinculado a esta irregularidade.');
      return;
    }

    const newMap = {
      ...store.map,
      [selectedCat]: [...currentItems, trimmed]
    };

    const newStore: IrregularidadesStore = {
      ...store,
      map: newMap
    };

    onSaveStore(newStore);
    setNewEncInput('');
  };

  const handleStartEditEncontrada = (item: string) => {
    setEditingEncKey(item);
    setEditingEncValue(item);
  };

  const handleSaveEditEncontrada = (oldItem: string) => {
    const trimmed = editingEncValue.trim();
    if (!trimmed || trimmed === oldItem || !selectedCat) {
      setEditingEncKey(null);
      return;
    }

    const currentItems = store.map[selectedCat] || [];
    if (currentItems.includes(trimmed) && trimmed !== oldItem) {
      alert('Já existe outro item com este nome nesta categoria.');
      return;
    }

    const newItems = currentItems.map(i => (i === oldItem ? trimmed : i));
    const newMap = {
      ...store.map,
      [selectedCat]: newItems
    };

    // Update inactive subitems
    const currentInactives = store.inactiveEncontradas[selectedCat] || [];
    const newInactives = currentInactives.map(i => (i === oldItem ? trimmed : i));
    const newInactiveEnc = {
      ...store.inactiveEncontradas,
      [selectedCat]: newInactives
    };

    const newStore: IrregularidadesStore = {
      ...store,
      map: newMap,
      inactiveEncontradas: newInactiveEnc
    };

    onSaveStore(newStore, { type: 'enc', oldName: oldItem, newName: trimmed, cat: selectedCat });
    setEditingEncKey(null);
  };

  const handleToggleInactiveEncontrada = (item: string) => {
    if (!selectedCat) return;
    const currentInactives = store.inactiveEncontradas[selectedCat] || [];
    const isCurrentlyInactive = currentInactives.includes(item);

    let newInactives: string[];
    if (isCurrentlyInactive) {
      newInactives = currentInactives.filter(i => i !== item);
    } else {
      newInactives = [...currentInactives, item];
    }

    const newInactiveEnc = {
      ...store.inactiveEncontradas,
      [selectedCat]: newInactives
    };

    const newStore: IrregularidadesStore = {
      ...store,
      inactiveEncontradas: newInactiveEnc
    };
    onSaveStore(newStore);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Deseja restaurar todas as irregularidades para os valores padrão de fábrica?')) {
      const defaultStore: IrregularidadesStore = {
        map: { ...IRREGULARIDADES_MAP },
        inactiveCategories: [],
        inactiveEncontradas: {}
      };
      onSaveStore(defaultStore);
      setSelectedCat(Object.keys(IRREGULARIDADES_MAP)[0]);
    }
  };

  // Subitems for selected category
  const selectedCatItems = selectedCat ? store.map[selectedCat] || [] : [];
  const inactiveSubitemsForCat = (selectedCat && store.inactiveEncontradas[selectedCat]) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#1A3E8A] border border-blue-200/60">
              <Layers size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>Gestão de Irregularidades e Opções Vinculadas</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Adicione, altere nomes e inative irregularidades ou itens encontrados para as listas de seleção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Restaurar padrão original"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Restaurar Padrões</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-900 font-medium">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <span>
            <strong>Regra do Sistema:</strong> É permitido adicionar novos itens e editar nomes existentes. Exclusões permanentes não são permitidas; utilize o botão <strong>Inativar</strong> para remover itens das listas de preenchimento.
          </span>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40">
          
          {/* COLUMN 1: IRREGULARIDADES (GRUPOS PRINCIPAIS) */}
          <div className="flex flex-col bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide">
                <Layers size={15} className="text-[#1A3E8A]" />
                <span>1. Irregularidades ({categories.length})</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {store.inactiveCategories.length} inativas
              </span>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="my-3 flex gap-2">
              <input
                type="text"
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                placeholder="Nome da nova irregularidade..."
                className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#1A3E8A] outline-none"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim()}
                className="bg-[#1A3E8A] hover:bg-blue-900 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs"
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </form>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
              {categories.map((catKey) => {
                const isSelected = selectedCat === catKey;
                const isInactive = store.inactiveCategories.includes(catKey);
                const isEditing = editingCatKey === catKey;
                const subitemsCount = (store.map[catKey] || []).length;

                return (
                  <div
                    key={catKey}
                    onClick={() => {
                      if (!isEditing) setSelectedCat(catKey);
                    }}
                    className={`group p-2.5 rounded-xl border transition-all select-none cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#1A3E8A]/40 text-[#1A3E8A] shadow-xs'
                        : isInactive
                        ? 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-75'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingCatValue}
                          onChange={e => setEditingCatValue(e.target.value)}
                          className="flex-1 border-2 border-[#1A3E8A] rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none bg-white"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditCategory(catKey);
                            if (e.key === 'Escape') setEditingCatKey(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(catKey)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                          title="Salvar alteração"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatKey(null)}
                          className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                          title="Cancelar"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-xs font-bold truncate leading-tight">
                            {catKey}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-extrabold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                            {subitemsCount}
                          </span>
                          {isInactive && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                              Inativo
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Edit and Inactivate/Reactivate */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(catKey)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                            title="Editar nome da irregularidade"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleInactiveCategory(catKey)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                              isInactive
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200'
                            }`}
                            title={isInactive ? "Reativar para exibição na lista" : "Inativar (remover da lista)"}
                          >
                            {isInactive ? (
                              <>
                                <Eye size={12} />
                                <span>Reativar</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={12} />
                                <span>Inativar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: IRREGULARIDADES ENCONTRADAS (SUBITENS VINCULADOS) */}
          <div className="flex flex-col bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide truncate">
                <ListFilter size={15} className="text-amber-600 shrink-0" />
                <span className="truncate">2. Vincular Itens Encontrados</span>
              </div>
              {selectedCat && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                  {selectedCat}
                </span>
              )}
            </div>

            {selectedCat ? (
              <>
                {/* Add Subitem Form */}
                <form onSubmit={handleAddEncontrada} className="my-3 flex gap-2">
                  <input
                    type="text"
                    value={newEncInput}
                    onChange={e => setNewEncInput(e.target.value)}
                    placeholder={`Novo item para vincular a "${selectedCat.slice(0, 20)}..."`}
                    className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:border-amber-600 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newEncInput.trim()}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition-all shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Vincular</span>
                  </button>
                </form>

                {/* Subitems List */}
                <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
                  {selectedCatItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum item encontrado vinculado a esta irregularidade. Use o campo acima para adicionar.
                    </div>
                  ) : (
                    selectedCatItems.map((item) => {
                      const isInactive = inactiveSubitemsForCat.includes(item);
                      const isEditing = editingEncKey === item;

                      return (
                        <div
                          key={item}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            isInactive
                              ? 'bg-slate-100/80 border-slate-200 text-slate-400 opacity-75'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingEncValue}
                                onChange={e => setEditingEncValue(e.target.value)}
                                className="flex-1 border-2 border-amber-600 rounded-lg px-2 py-1 text-xs font-medium text-slate-900 outline-none bg-white"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEditEncontrada(item);
                                  if (e.key === 'Escape') setEditingEncKey(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditEncontrada(item)}
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs"
                                title="Salvar alteração"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingEncKey(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                                title="Cancelar"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-xs font-semibold leading-tight">
                                  {item}
                                </span>
                                {isInactive && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                                    Inativo
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons: Edit and Inactivate/Reactivate */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditEncontrada(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                                  title="Editar nome da irregularidade encontrada"
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleInactiveEncontrada(item)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                    isInactive
                                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                                      : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200'
                                  }`}
                                  title={isInactive ? "Reativar para exibição na lista" : "Inativar (remover da lista)"}
                                >
                                  {isInactive ? (
                                    <>
                                      <Eye size={12} />
                                      <span>Reativar</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff size={12} />
                                      <span>Inativar</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Selecione uma irregularidade na coluna à esquerda para gerenciar seus itens.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Alterações e inativações são salvas e aplicadas automaticamente ao formulário.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#1A3E8A] hover:bg-blue-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
