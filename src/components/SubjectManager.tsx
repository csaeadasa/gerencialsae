import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, X, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface Subject {
  id: string;
  name: string;
}

interface SubjectManagerProps {
  subjects: Subject[];
  onChange: (subjects: Subject[]) => void;
  className?: string;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, onChange, className }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

  const handleAdd = () => {
    if (!newSubject.trim()) return;
    onChange([...subjects, { id: 'subj_' + Date.now().toString() + Math.random().toString(36).substr(2, 5), name: newSubject.trim() }]);
    setNewSubject("");
    setIsAdding(false);
  };

  const handleEdit = (id: string, newName: string) => {
    if (!newName.trim()) return;
    onChange(subjects.map(s => s.id === id ? { ...s, name: newName.trim() } : s));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(subjects.filter(s => s.id !== id));
  };

  return (
    <div className={cn("bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Tag size={14} className="text-indigo-500" /> Assuntos Disponíveis ({subjects.length})
        </h4>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors flex items-center gap-1"
          >
            <Plus size={12} /> Novo Assunto
          </button>
        )}
      </div>

      {isAdding && (
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <input
            type="text"
            autoFocus
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Nome do assunto..."
            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
                setNewSubject("");
              }
            }}
          />
          <button type="button" onClick={handleAdd} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md"><Check size={14} /></button>
          <button type="button" onClick={() => { setIsAdding(false); setNewSubject(""); }} className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-md"><X size={14} /></button>
        </div>
      )}

      {sortedSubjects.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
          Nenhum assunto cadastrado.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sortedSubjects.map(subj => (
            <div key={subj.id} className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm pl-2.5 pr-1 py-1 rounded-full text-xs text-slate-700">
              {editingId === subj.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-24 px-1 py-0.5 text-xs border border-slate-200 rounded"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEdit(subj.id, editName);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                  />
                  <button type="button" onClick={() => handleEdit(subj.id, editName)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-full"><Check size={12} /></button>
                  <button type="button" onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-full"><X size={12} /></button>
                </div>
              ) : (
                <>
                  <span className="font-medium mr-1">{subj.name}</span>
                  <div className="flex items-center bg-slate-100 rounded-full p-0.5">
                    <button
                      type="button"
                      onClick={() => { setEditingId(subj.id); setEditName(subj.name); }}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(subj.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
