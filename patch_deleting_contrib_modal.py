import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

deleting_tomada_modal = """      {/* Delete Tomada Modal */}"""
if "{deletingContribution && (" not in content:
    contrib_modal = """      {/* Delete Contribution Modal */}
      {deletingContribution && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-rose-100 flex items-center gap-3 bg-rose-50/50">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-800">Confirmar Exclusão</h3>
                <p className="text-xs text-rose-600/70">Ação irreversível</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                Você tem certeza que deseja excluir esta proposta definitivamente? 
                Esta ação não poderá ser desfeita.
              </p>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">
              <button
                onClick={() => setDeletingContribution(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteContribution}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <><RefreshCw size={14} className="animate-spin" /> Excluindo...</>
                ) : (
                  <><Trash2 size={14} /> Sim, Excluir Proposta</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tomada Modal */}"""
    content = content.replace(deleting_tomada_modal, contrib_modal)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch deleting contrib modal python script finished")
