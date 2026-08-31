import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Tag, 
  Search, 
  CheckSquare, 
  Square, 
  FileText, 
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  FolderPlus,
  BookOpen,
  Bookmark,
  Layers,
  Sparkles,
  Indent,
  Outdent,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';

export type SubjectType = 'titulo' | 'capitulo' | 'secao' | 'subsecao' | 'assunto';

export interface Subject {
  id: string;
  name: string;
  parentId?: string | null;
  level?: number;
  type?: SubjectType;
}

export interface SubjectPickerModalProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  selectedSubjectIds: string[];
  onSelectionChange: (subjectIds: string[]) => void;
  onClose: () => void;
  articleIndex?: number;
  articleText?: string;
  contentType?: 'text' | 'table';
}

const TYPE_CONFIG: Record<SubjectType, { label: string; bg: string; text: string; border: string; icon: any }> = {
  titulo: {
    label: 'Título',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: BookOpen
  },
  capitulo: {
    label: 'Capítulo',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Bookmark
  },
  secao: {
    label: 'Seção',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: Layers
  },
  subsecao: {
    label: 'Subseção',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: CornerDownRight
  },
  assunto: {
    label: 'Assunto',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: Tag
  }
};

export const SubjectPickerModal: React.FC<SubjectPickerModalProps> = ({ 
  subjects, 
  onSubjectsChange, 
  selectedSubjectIds, 
  onSelectionChange, 
  onClose,
  articleIndex,
  articleText,
  contentType = 'text'
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectType, setNewSubjectType] = useState<SubjectType>('assunto');
  const [newSubjectParentId, setNewSubjectParentId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<SubjectType>('assunto');
  const [editParentId, setEditParentId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAdding && !editingId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isAdding, editingId]);

  // Compute depth and children for hierarchical traversal
  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const getDepth = (subject: Subject): number => {
    let depth = 0;
    let currentParentId = subject.parentId;
    const visited = new Set<string>();
    while (currentParentId && subjectsMap.has(currentParentId) && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      depth++;
      currentParentId = subjectsMap.get(currentParentId)?.parentId;
    }
    return depth;
  };

  // Build hierarchical ordered list
  const orderedTreeList = useMemo(() => {
    // If search query is active, filter directly
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return subjects
        .filter(s => s.name.toLowerCase().includes(q) || (s.type && s.type.toLowerCase().includes(q)))
        .map(s => ({
          ...s,
          depth: getDepth(s),
          hasChildren: subjects.some(child => child.parentId === s.id)
        }));
    }

    // Otherwise, build tree respecting existing order and parent-child hierarchy
    const childrenMap = new Map<string | null, Subject[]>();
    childrenMap.set(null, []);

    // Helper: check if parent exists in current subjects
    subjects.forEach(s => {
      const pId = s.parentId && subjectsMap.has(s.parentId) ? s.parentId : null;
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId)!.push(s);
    });

    const result: Array<Subject & { depth: number; hasChildren: boolean }> = [];

    const traverse = (parentId: string | null, depth: number) => {
      const items = childrenMap.get(parentId) || [];
      items.forEach(item => {
        const hasChildren = (childrenMap.get(item.id) || []).length > 0;
        result.push({ ...item, depth, hasChildren });
        if (!collapsedIds.has(item.id)) {
          traverse(item.id, depth + 1);
        }
      });
    };

    traverse(null, 0);
    return result;
  }, [subjects, searchQuery, collapsedIds, subjectsMap]);

  // Toggle Collapse
  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => {
    const parentIds = new Set<string>();
    subjects.forEach(s => {
      if (s.parentId) parentIds.add(s.parentId);
    });
    setCollapsedIds(parentIds);
  };

  // Add Item
  const handleAdd = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;

    const newId = 'subj_' + Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6);
    const newSubj: Subject = {
      id: newId,
      name: trimmed,
      type: newSubjectType,
      parentId: newSubjectParentId || null
    };

    onSubjectsChange([...subjects, newSubj]);
    onSelectionChange([...selectedSubjectIds, newId]);

    // Reset add state
    setNewSubjectName("");
    setNewSubjectType('assunto');
    setNewSubjectParentId(null);
    setIsAdding(false);
  };

  // Quick Add Subitem under a specific node
  const handleStartAddChild = (parent: Subject) => {
    let defaultChildType: SubjectType = 'assunto';
    if (parent.type === 'titulo') defaultChildType = 'capitulo';
    else if (parent.type === 'capitulo') defaultChildType = 'secao';
    else if (parent.type === 'secao') defaultChildType = 'subsecao';
    else if (parent.type === 'subsecao') defaultChildType = 'assunto';

    setNewSubjectParentId(parent.id);
    setNewSubjectType(defaultChildType);
    setNewSubjectName("");
    setIsAdding(true);
    // Ensure parent is expanded
    setCollapsedIds(prev => {
      const next = new Set(prev);
      next.delete(parent.id);
      return next;
    });
  };

  // Save Edit
  const handleSaveEdit = (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    onSubjectsChange(subjects.map(s => {
      if (s.id === id) {
        return {
          ...s,
          name: trimmed,
          type: editType,
          parentId: editParentId === id ? null : editParentId
        };
      }
      return s;
    }));

    setEditingId(null);
  };

  // Delete
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja excluir "${name}"? Se houver subitens, eles serão promovidos para o nível acima.`)) {
      // Find item's parent
      const current = subjects.find(s => s.id === id);
      const parentIdOfDeleted = current?.parentId || null;

      // Reparent children to the deleted item's parent
      const updated = subjects
        .filter(s => s.id !== id)
        .map(s => s.parentId === id ? { ...s, parentId: parentIdOfDeleted } : s);

      onSubjectsChange(updated);
      onSelectionChange(selectedSubjectIds.filter(selId => selId !== id));
    }
  };

  // Reordering: Move up in list
  const handleMoveUp = (subjectId: string) => {
    const idx = subjects.findIndex(s => s.id === subjectId);
    if (idx <= 0) return;

    const newArr = [...subjects];
    const temp = newArr[idx];
    newArr[idx] = newArr[idx - 1];
    newArr[idx - 1] = temp;
    onSubjectsChange(newArr);
  };

  // Reordering: Move down in list
  const handleMoveDown = (subjectId: string) => {
    const idx = subjects.findIndex(s => s.id === subjectId);
    if (idx < 0 || idx >= subjects.length - 1) return;

    const newArr = [...subjects];
    const temp = newArr[idx];
    newArr[idx] = newArr[idx + 1];
    newArr[idx + 1] = temp;
    onSubjectsChange(newArr);
  };

  // Indent: Make child of the previous sibling/item
  const handleIndent = (subject: Subject) => {
    const idx = subjects.findIndex(s => s.id === subject.id);
    if (idx <= 0) return;

    // Find preceding item with same parent or previous in list
    const prevItem = subjects[idx - 1];
    if (prevItem.id === subject.id) return;

    // Change type automatically if helpful
    let newType = subject.type || 'assunto';
    if (prevItem.type === 'titulo' && (!subject.type || subject.type === 'titulo')) newType = 'capitulo';
    else if (prevItem.type === 'capitulo' && (!subject.type || subject.type === 'capitulo')) newType = 'secao';
    else if (prevItem.type === 'secao' && (!subject.type || subject.type === 'secao')) newType = 'subsecao';
    else if (prevItem.type === 'subsecao') newType = 'assunto';

    onSubjectsChange(subjects.map(s => {
      if (s.id === subject.id) {
        return { ...s, parentId: prevItem.id, type: newType };
      }
      return s;
    }));
  };

  // Outdent: Move up one parent level
  const handleOutdent = (subject: Subject) => {
    if (!subject.parentId) return;

    const currentParent = subjects.find(s => s.id === subject.parentId);
    const newParentId = currentParent?.parentId || null;

    let newType = subject.type || 'assunto';
    if (subject.type === 'assunto' && currentParent?.type === 'subsecao') newType = 'subsecao';
    else if (subject.type === 'subsecao') newType = 'secao';
    else if (subject.type === 'secao') newType = 'capitulo';
    else if (subject.type === 'capitulo') newType = 'titulo';

    onSubjectsChange(subjects.map(s => {
      if (s.id === subject.id) {
        return { ...s, parentId: newParentId, type: newType };
      }
      return s;
    }));
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    if (selectedSubjectIds.includes(id)) {
      onSelectionChange(selectedSubjectIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedSubjectIds, id]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(subjects.map(s => s.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Load Standard Resolution Preset
  const handleLoadResolutionPreset = () => {
    if (subjects.length > 0) {
      if (!window.confirm("Isso adicionará a estrutura modelo de Títulos, Capítulos e Seções aos assuntos existentes. Deseja continuar?")) {
        return;
      }
    }

    const t1 = 'subj_t1_' + Date.now();
    const c1 = 'subj_c1_' + Date.now();
    const s1 = 'subj_s1_' + Date.now();
    const c2 = 'subj_c2_' + Date.now();
    const s2 = 'subj_s2_' + Date.now();
    const t2 = 'subj_t2_' + Date.now();
    const c3 = 'subj_c3_' + Date.now();

    const preset: Subject[] = [
      { id: t1, name: 'Título I - Das Disposições Gerais', type: 'titulo', parentId: null },
      { id: c1, name: 'Capítulo I - Do Objeto e Âmbito de Aplicação', type: 'capitulo', parentId: t1 },
      { id: s1, name: 'Seção I - Dos Conceitos e Definições', type: 'secao', parentId: c1 },
      { id: c2, name: 'Capítulo II - Dos Direitos e Deveres', type: 'capitulo', parentId: t1 },
      { id: s2, name: 'Seção I - Dos Requisitos de Prestação do Serviço', type: 'secao', parentId: c2 },
      { id: t2, name: 'Título II - Da Fiscalização e Penalidades', type: 'titulo', parentId: null },
      { id: c3, name: 'Capítulo I - Das Infrações e Sanções', type: 'capitulo', parentId: t2 },
    ];

    onSubjectsChange([...subjects, ...preset]);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-[999999] animate-fadeIn" 
      style={{ zIndex: 999999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAdding && !editingId) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl lg:max-w-5xl w-full flex flex-col h-[90vh] max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Tag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                  Vincular Assunto e Estrutura Temática
                </h3>
                {articleIndex !== undefined && (
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {contentType === 'table' ? `Tabela #${articleIndex + 1}` : `Dispositivo #${articleIndex + 1}`}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Organize e aninhe os assuntos em <strong>Títulos, Capítulos, Seções, Subseções e Temas</strong> para categorizar o dispositivo.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-full transition-all"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Device preview banner if text available */}
        {articleText && (
          <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100/80 text-xs text-slate-700 flex items-start gap-2.5 shrink-0">
            {contentType === 'table' ? (
              <TableIcon size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            ) : (
              <FileText size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-0.5">
                Texto do Dispositivo em Consulta:
              </span>
              <p className="italic font-mono text-[11px] text-slate-600 line-clamp-2">
                "{articleText}"
              </p>
            </div>
          </div>
        )}

        {/* Toolbar Controls */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Buscar por nome ou nível (Ex: Título, Capítulo, Tarifas)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 shadow-2xs"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  setNewSubjectParentId(null);
                  setNewSubjectType('assunto');
                  setNewSubjectName("");
                  setIsAdding(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Plus size={15} /> Novo Item / Assunto
              </button>
            )}

            {subjects.length === 0 && (
              <button
                type="button"
                onClick={handleLoadResolutionPreset}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-xl text-xs transition-all shadow-2xs shrink-0"
                title="Criar estrutura modelo de Resolução (Títulos, Capítulos e Seções)"
              >
                <Sparkles size={14} /> Estrutura Modelo
              </button>
            )}

            {/* Expand / Collapse All */}
            {subjects.length > 0 && !searchQuery && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Expandir todos os nós"
                >
                  <Eye size={12} /> Expandir
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Recolher todos os nós"
                >
                  <EyeOff size={12} /> Recolher
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body - List / Tree */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/40">
          
          {/* New Subject / Structure Inline Form */}
          {isAdding && (
            <div className="bg-indigo-50/90 p-4 rounded-2xl border-2 border-indigo-300 shadow-md space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus size={15} className="text-indigo-600" />
                  {newSubjectParentId ? (
                    <span>
                      Adicionar Subitem em: <strong className="text-indigo-700 underline">{subjectsMap.get(newSubjectParentId)?.name}</strong>
                    </span>
                  ) : (
                    <span>Novo Item de Estrutura / Assunto</span>
                  )}
                </span>
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setNewSubjectParentId(null); }} 
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Level / Type selector */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Tipo de Estrutura
                  </label>
                  <select
                    value={newSubjectType}
                    onChange={(e) => setNewSubjectType(e.target.value as SubjectType)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 text-slate-800"
                  >
                    <option value="titulo">📖 Título (Nível 1)</option>
                    <option value="capitulo">📑 Capítulo (Nível 2)</option>
                    <option value="secao">📂 Seção (Nível 3)</option>
                    <option value="subsecao">↳ Subseção (Nível 4)</option>
                    <option value="assunto">🏷️ Assunto / Tópico Geral</option>
                  </select>
                </div>

                {/* Parent selector */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Item Pai (Aninhamento)
                  </label>
                  <select
                    value={newSubjectParentId || ""}
                    onChange={(e) => setNewSubjectParentId(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-600 text-slate-800"
                  >
                    <option value="">(Nível Principal / Raiz)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.type ? `[${TYPE_CONFIG[s.type]?.label || s.type}] ` : ''}{s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Name Input */}
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Nome / Descrição
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Ex: Título I - Do Objeto / Tarifas..."
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 bg-white text-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                      } else if (e.key === 'Escape') {
                        setIsAdding(false);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setNewSubjectParentId(null); }} 
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleAdd} 
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check size={14} /> Salvar e Vincular
                </button>
              </div>
            </div>
          )}

          {/* Quick Selection Status & Controls */}
          {subjects.length > 0 && (
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span>Estrutura Cadastrada ({subjects.length} {subjects.length === 1 ? 'item' : 'itens'})</span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-600 font-bold">{selectedSubjectIds.length} vinculado(s) a este dispositivo</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                >
                  <CheckSquare size={12} /> Marcar Todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1"
                >
                  <Square size={12} /> Limpar Seleção
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {subjects.length === 0 ? (
            <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-slate-300 shadow-xs space-y-3">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Tag size={28} />
              </div>
              <h4 className="text-sm font-black text-slate-800">
                Nenhum assunto ou estrutura cadastrada nesta participação ainda.
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Você pode cadastrar assuntos avulsos ou criar a estrutura completa de uma resolução dividida em <strong>Títulos</strong>, <strong>Capítulos</strong> e <strong>Seções</strong>.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setNewSubjectParentId(null);
                    setNewSubjectType('assunto');
                    setNewSubjectName("");
                    setIsAdding(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Plus size={15} /> Cadastrar Primeiro Assunto
                </button>
                <button
                  type="button"
                  onClick={handleLoadResolutionPreset}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2"
                >
                  <Sparkles size={15} /> Carregar Estrutura Modelo
                </button>
              </div>
            </div>
          ) : orderedTreeList.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
              Nenhum assunto ou estrutura encontrada para a busca "{searchQuery}".
            </div>
          ) : (
            /* Hierarchical Tree List */
            <div className="space-y-1.5">
              {orderedTreeList.map((item, index) => {
                const isSelected = selectedSubjectIds.includes(item.id);
                const isEditing = editingId === item.id;
                const typeCfg = TYPE_CONFIG[item.type || 'assunto'] || TYPE_CONFIG.assunto;
                const IconComponent = typeCfg.icon;
                const isCollapsed = collapsedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative rounded-xl border transition-all select-none",
                      isSelected 
                        ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300/60 shadow-xs" 
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    )}
                    style={{
                      marginLeft: searchQuery ? 0 : `${item.depth * 24}px`
                    }}
                  >
                    {/* Tree connector guideline for nested items */}
                    {!searchQuery && item.depth > 0 && (
                      <div 
                        className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[2px] bg-slate-300 pointer-events-none"
                      />
                    )}

                    {isEditing ? (
                      /* Inline Edit Form */
                      <div className="p-3 bg-slate-50 rounded-xl space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-3">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as SubjectType)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 text-slate-800"
                            >
                              <option value="titulo">📖 Título</option>
                              <option value="capitulo">📑 Capítulo</option>
                              <option value="secao">📂 Seção</option>
                              <option value="subsecao">↳ Subseção</option>
                              <option value="assunto">🏷️ Assunto</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <select
                              value={editParentId || ""}
                              onChange={(e) => setEditParentId(e.target.value || null)}
                              className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-600 text-slate-800"
                            >
                              <option value="">(Raiz / Sem Pai)</option>
                              {subjects
                                .filter(s => s.id !== item.id)
                                .map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-6 flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs font-semibold border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(item.id);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                            />
                            <button 
                              type="button" 
                              onClick={() => handleSaveEdit(item.id)} 
                              className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-2xs"
                              title="Salvar alterações"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditingId(null)} 
                              className="p-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Item Display Row */
                      <div className="flex items-center justify-between p-2.5 gap-2">
                        
                        {/* Left: Expand/Collapse icon + Checkbox + Type Badge + Name */}
                        <div 
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => toggleSelection(item.id)}
                        >
                          {/* Expand/Collapse Toggle if has children */}
                          {item.hasChildren && !searchQuery ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse(item.id);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-colors shrink-0"
                              title={isCollapsed ? "Expandir subitens" : "Recolher subitens"}
                            >
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <div className="w-5 shrink-0" />
                          )}

                          {/* Checkbox */}
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border shadow-2xs",
                            isSelected 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-white border-slate-300 text-transparent group-hover:border-indigo-400"
                          )}>
                            <Check size={12} className={isSelected ? "opacity-100" : "opacity-0"} />
                          </div>

                          {/* Structure Type Badge */}
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 shrink-0",
                            typeCfg.bg,
                            typeCfg.text,
                            typeCfg.border
                          )}>
                            <IconComponent size={11} />
                            <span>{typeCfg.label}</span>
                          </span>

                          {/* Name Text */}
                          <span className={cn(
                            "text-xs truncate",
                            item.type === 'titulo' ? "font-black text-slate-900 text-[13px]" :
                            item.type === 'capitulo' ? "font-bold text-slate-800 text-xs" :
                            item.type === 'secao' ? "font-semibold text-slate-800 text-xs" :
                            isSelected ? "font-bold text-indigo-950" : "font-medium text-slate-700"
                          )} title={item.name}>
                            {item.name}
                          </span>
                        </div>

                        {/* Right: Structural Ordering & Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {/* Reordering: Move Up / Down */}
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveUp(item.id);
                              }}
                              disabled={index === 0}
                              className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Mover para Cima (Reordenar)"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveDown(item.id);
                              }}
                              disabled={index === orderedTreeList.length - 1}
                              className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Mover para Baixo (Reordenar)"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>

                          {/* Nesting: Indent / Outdent */}
                          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIndent(item);
                              }}
                              className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-white rounded transition-colors"
                              title="Aninhar (Recuar como subitem do item anterior)"
                            >
                              <Indent size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOutdent(item);
                              }}
                              disabled={!item.parentId}
                              className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-white rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              title="Desaninhar (Promover para nível acima)"
                            >
                              <Outdent size={12} />
                            </button>
                          </div>

                          {/* Add Subitem under this node */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartAddChild(item);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100/70 rounded-lg transition-colors"
                            title="Adicionar Subitem sob este nó"
                          >
                            <Plus size={13} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(item.id);
                              setEditName(item.name);
                              setEditType(item.type || 'assunto');
                              setEditParentId(item.parentId || null);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/70 rounded-lg transition-colors"
                            title="Editar nome e estrutura"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition-colors"
                            title="Excluir item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-800">
              {selectedSubjectIds.length}
            </span> {selectedSubjectIds.length === 1 ? 'assunto/estrutura vinculada' : 'assuntos/estruturas vinculadas'} a este dispositivo
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-1.5"
            >
              <Check size={16} /> Concluir e Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
