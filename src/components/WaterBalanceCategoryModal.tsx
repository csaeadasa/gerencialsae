import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Search,
  Sparkles,
  AlertCircle,
  FolderPlus,
  Layers,
  Droplets
} from 'lucide-react';
import { WaterBalanceCategory, WaterBalance } from '../types';

export const DEFAULT_WATER_BALANCE_CATEGORIES: WaterBalanceCategory[] = [
  { id: "cat-1", name: "Planejamento Plurianual", color: "blue", description: "Balanços de médio e longo prazo para planos diretores e planejamento hídrico." },
  { id: "cat-2", name: "Operacional Anual", color: "emerald", description: "Acompanhamento anual das vazões e demandas operantes do ano corrente." },
  { id: "cat-3", name: "Cenário Crítico / Seca", color: "amber", description: "Simulações de eventos de estiagem severa e contingência hídrica." },
  { id: "cat-4", name: "Simulação Regulatória", color: "purple", description: "Avaliação de impacto regulatório, revisões tarifárias e novas outorgas." },
  { id: "cat-5", name: "Estudo de Expansão", color: "cyan", description: "Novos mananciais, ampliações de ETA e reforço de infraestrutura." },
  { id: "cat-6", name: "Emergencial", color: "rose", description: "Ações imediatas e planos de contingência para desabastecimento." },
];

export const CATEGORY_COLORS: { name: string; key: string; bg: string; text: string; border: string; badge: string; ring: string }[] = [
  { name: "Azul ADASA", key: "blue", bg: "bg-blue-500", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-50 text-blue-700 border-blue-200", ring: "ring-blue-500" },
  { name: "Verde Esmeralda", key: "emerald", bg: "bg-emerald-500", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "ring-emerald-500" },
  { name: "Ciano / Água", key: "cyan", bg: "bg-cyan-500", text: "text-cyan-700", border: "border-cyan-200", badge: "bg-cyan-50 text-cyan-700 border-cyan-200", ring: "ring-cyan-500" },
  { name: "Âmbar / Alerta", key: "amber", bg: "bg-amber-500", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-50 text-amber-700 border-amber-200", ring: "ring-amber-500" },
  { name: "Roxo Estratégico", key: "purple", bg: "bg-purple-500", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-50 text-purple-700 border-purple-200", ring: "ring-purple-500" },
  { name: "Rosa / Crítico", key: "rose", bg: "bg-rose-500", text: "text-rose-700", border: "border-rose-200", badge: "bg-rose-50 text-rose-700 border-rose-200", ring: "ring-rose-500" },
  { name: "Índigo", key: "indigo", bg: "bg-indigo-500", text: "text-indigo-700", border: "border-indigo-200", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", ring: "ring-indigo-500" },
  { name: "Laranja", key: "orange", bg: "bg-orange-500", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-50 text-orange-700 border-orange-200", ring: "ring-orange-500" },
  { name: "Ardósia / Neutro", key: "slate", bg: "bg-slate-500", text: "text-slate-700", border: "border-slate-200", badge: "bg-slate-100 text-slate-700 border-slate-200", ring: "ring-slate-500" },
];

export function getCategoryBadgeClasses(colorKey?: string) {
  const found = CATEGORY_COLORS.find(c => c.key === colorKey);
  return found ? found.badge : "bg-blue-50 text-blue-700 border-blue-200";
}

interface WaterBalanceCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WaterBalanceCategory[];
  onSaveCategories: (updatedCategories: WaterBalanceCategory[]) => void;
  currentSelectedCategory?: string;
  onSelectCategory?: (categoryName: string) => void;
  waterBalances?: WaterBalance[];
  onRenameCategoryInBalances?: (oldName: string, newName: string) => void;
  showToast?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

export const WaterBalanceCategoryModal: React.FC<WaterBalanceCategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  currentSelectedCategory,
  onSelectCategory,
  waterBalances = [],
  onRenameCategoryInBalances,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete confirmation
  const [deletingCategory, setDeletingCategory] = useState<WaterBalanceCategory | null>(null);

  if (!isOpen) return null;

  const handleStartEdit = (cat: WaterBalanceCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color || 'blue');
    setDescription(cat.description || '');
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setColor('blue');
    setDescription('');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Por favor, digite o nome da categoria.");
      return;
    }

    // Check duplicate name
    const existing = categories.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingId
    );
    if (existing) {
      setErrorMessage(`Já existe uma categoria cadastrada com o nome "${trimmedName}".`);
      return;
    }

    if (editingId) {
      // Editing
      const oldCat = categories.find(c => c.id === editingId);
      const oldName = oldCat?.name;

      const updated = categories.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: trimmedName,
            color,
            description: description.trim()
          };
        }
        return c;
      });

      onSaveCategories(updated);

      if (oldName && oldName !== trimmedName && onRenameCategoryInBalances) {
        onRenameCategoryInBalances(oldName, trimmedName);
      }

      if (currentSelectedCategory === oldName && onSelectCategory) {
        onSelectCategory(trimmedName);
      }

      if (showToast) {
        showToast("Categoria Atualizada", `A categoria "${trimmedName}" foi alterada com sucesso.`, "success");
      }
      handleCancelEdit();
    } else {
      // Adding new
      const newCategory: WaterBalanceCategory = {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        color,
        description: description.trim(),
        createdAt: new Date().toISOString().split('T')[0]
      };

      const updated = [...categories, newCategory];
      onSaveCategories(updated);

      // Auto-select newly created category if requested
      if (onSelectCategory) {
        onSelectCategory(trimmedName);
      }

      if (showToast) {
        showToast("Categoria Criada", `A categoria "${trimmedName}" foi adicionada e vinculada.`, "success");
      }
      handleCancelEdit();
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;
    
    const catToDelete = deletingCategory;
    const updated = categories.filter(c => c.id !== catToDelete.id);
    onSaveCategories(updated);

    if (currentSelectedCategory === catToDelete.name && onSelectCategory) {
      onSelectCategory('');
    }

    if (showToast) {
      showToast("Categoria Removida", `A categoria "${catToDelete.name}" foi excluída.`, "info");
    }
    setDeletingCategory(null);
  };

  const handleRestoreDefaults = () => {
    onSaveCategories(DEFAULT_WATER_BALANCE_CATEGORIES);
    if (showToast) {
      showToast("Padrões Restaurados", "As categorias padrão do Balanço Hídrico foram restauradas.", "success");
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cat.name.toLowerCase().includes(term) ||
      (cat.description && cat.description.toLowerCase().includes(term))
    );
  });

  // Calculate usage count
  const getUsageCount = (catName: string) => {
    return waterBalances.filter(wb => wb.category === catName).length;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-adasa-dark via-[#143a75] to-adasa-mid text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/20 text-white shadow-inner">
              <Tag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Gerenciador de Categorias do Balanço Hídrico
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                  {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Cadastre e personalize as categorias para classificar e organizar os balanços hídricos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Form Box: Cadastrar / Editar Categoria */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {editingId ? (
                  <>
                    <Edit3 size={16} className="text-adasa-mid" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Editar Categoria
                    </h4>
                  </>
                ) : (
                  <>
                    <FolderPlus size={16} className="text-adasa-mid" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Cadastrar Nova Categoria
                    </h4>
                  </>
                )}
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Nome da Categoria <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Planejamento Plurianual"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all shadow-inner"
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                    Descrição Breve
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Projeções de longo prazo e cenários de demanda"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Cor / Identificador Visual */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                  Cor do Selo Visual
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map(c => {
                    const isSelected = color === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setColor(c.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? `${c.badge} ring-2 ${c.ring} shadow-sm scale-105`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                        <span>{c.name}</span>
                        {isSelected && <Check size={12} className="ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300 transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-adasa-mid hover:bg-adasa-dark text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {editingId ? (
                    <>
                      <Check size={15} /> Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus size={15} /> Cadastrar Categoria
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* List Section: Categorias Existentes */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-adasa-mid" /> Categorias Disponíveis ({categories.length})
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Clique em "Vincular" para aplicar a categoria diretamente ao balanço atual.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar categorias..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all"
                />
              </div>
            </div>

            {/* List Table / Cards */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm divide-y divide-slate-100">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Tag size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold">Nenhuma categoria encontrada.</p>
                  {categories.length === 0 && (
                    <button
                      onClick={handleRestoreDefaults}
                      className="text-xs font-bold text-adasa-mid hover:underline"
                    >
                      Restaurar categorias padrão sugeridas
                    </button>
                  )}
                </div>
              ) : (
                filteredCategories.map(cat => {
                  const usageCount = getUsageCount(cat.name);
                  const isCurrent = currentSelectedCategory === cat.name;
                  const colorObj = CATEGORY_COLORS.find(c => c.key === cat.color) || CATEGORY_COLORS[0];

                  return (
                    <div
                      key={cat.id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 ${colorObj.bg}`} />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getCategoryBadgeClasses(cat.color)}`}>
                              {cat.name}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider shadow-sm">
                                Selecionada no Balanço
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-500">
                              • {usageCount} {usageCount === 1 ? 'balanço vinculado' : 'balanços vinculados'}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {onSelectCategory && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCategory(cat.name);
                              if (showToast) {
                                showToast("Categoria Vinculada", `A categoria "${cat.name}" foi selecionada para este balanço.`, "success");
                              }
                              onClose();
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 border ${
                              isCurrent
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-slate-100 text-slate-700 hover:bg-adasa-light/20 hover:text-adasa-dark border-slate-200'
                            }`}
                            title="Vincular ao balanço atual"
                          >
                            <Check size={13} />
                            <span>{isCurrent ? "Vinculada" : "Vincular"}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-2 text-slate-500 hover:text-adasa-mid hover:bg-slate-100 rounded-xl transition-all"
                          title="Editar Categoria"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(cat)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Excluir Categoria"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-amber-500" /> Restaurar Categorias Padrão
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-adasa-dark hover:bg-adasa-mid text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            Concluir / Fechar
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Delete */}
      {deletingCategory && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-800">Excluir Categoria</h4>
                <p className="text-xs text-slate-500 font-medium">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Deseja realmente excluir a categoria <strong className="text-slate-800">"{deletingCategory.name}"</strong>?
              {getUsageCount(deletingCategory.name) > 0 && (
                <span className="block mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold text-[11px]">
                  ⚠️ Atenção: Existem {getUsageCount(deletingCategory.name)} balanço(s) vinculados a esta categoria. A vinculação será removida.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all shadow-md"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
