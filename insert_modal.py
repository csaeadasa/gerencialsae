import sys

with open('src/components/TomadaSubsidiosTab.tsx', 'rb') as f:
    text = f.read().decode('utf-8')

# The modal string
modal = """      {deletingTomada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 animate-scaleIn">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0 border-4 border-rose-50">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1 mt-1">
                <h3 className="text-lg font-black text-slate-800 leading-tight">
                  Excluir Participação Social
                </h3>
                <p className="text-sm font-medium text-slate-600">
                  Tem certeza que deseja excluir a participação <strong className="text-slate-800">{deletingTomada.numero ? `${deletingTomada.numero} - ` : ""}{deletingTomada.title}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm text-rose-800 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <Trash2 size={16} /> Atenção: Esta ação não poderá ser desfeita.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Serão excluídos <strong>{articles.filter(a => String(a.tomadaId) === String(deletingTomada.id)).length}</strong> artigos associados.
                </li>
                <li>
                  Serão excluídas <strong>{contributions.filter(c => { const art = articles.find(a => String(a.id) === String(c.articleId)); return art && String(art.tomadaId) === String(deletingTomada.id); }).length}</strong> contribuições sociais.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingTomada(null)}
                className="px-5 py-2.5 bg-white text-slate-700 font-bold text-sm rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex-1 sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-rose-600 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-rose-700 transition-all flex-1 sm:flex-none flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Confirmar Exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}"""

target = "    )}\n    </>"
replacement = "    )}\n" + modal + "\n    </>"

if target in text:
    new_text = text.replace(target, replacement)
    with open('src/components/TomadaSubsidiosTab.tsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("Modal injected successfully!")
else:
    print("Target not found.")
