import React, { useState } from "react";
import { X, Key, Check } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../lib/auth";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (title: string, message: string, type: "success" | "error" | "warning" | "info") => void;
}

export function ChangePasswordModal({ isOpen, onClose, showToast }: ChangePasswordModalProps) {
  const { currentUser, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showToast("Atenção", "A senha deve ter pelo menos 4 caracteres.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Atenção", "As senhas não coincidem.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser(currentUser.id, { 
        name: currentUser.name,
        email: currentUser.email,
        password: newPassword 
      } as any);
      showToast("Sucesso", "Senha alterada com sucesso!", "success");
      handleClose();
    } catch (err: any) {
      showToast("Erro", "Erro ao alterar senha.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-adasa-mid/10 flex items-center justify-center text-adasa-mid">
              <Key size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Alterar Senha</h3>
              <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[200px]">{currentUser.email}</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-slate-50 hover:bg-white transition-colors"
              placeholder="Digite a nova senha"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Confirmar Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-adasa-mid bg-slate-50 hover:bg-white transition-colors"
              placeholder="Confirme a nova senha"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-adasa-mid text-white rounded-xl text-sm font-bold shadow-sm hover:bg-adasa-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                "Salvando..."
              ) : (
                <>
                  <Check size={16} /> Salvar Nova Senha
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
