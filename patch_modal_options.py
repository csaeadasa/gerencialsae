import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Insert toggles for themes and anexos
toggles_block = """
              <div className="grid grid-cols-2 gap-3">
                <label className={cn(
                  "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  duplicateCopySubjects ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200"
                )}>
                  <input
                    type="checkbox"
                    checked={duplicateCopySubjects}
                    onChange={(e) => setDuplicateCopySubjects(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Copiar Temas</div>
                    <div className="text-[10px] text-slate-500">{(duplicateModalTomada.subjects || []).length} tema(s)</div>
                  </div>
                </label>
                
                <label className={cn(
                  "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  duplicateCopyAnexos ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200"
                )}>
                  <input
                    type="checkbox"
                    checked={duplicateCopyAnexos}
                    onChange={(e) => setDuplicateCopyAnexos(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Copiar Anexos</div>
                    <div className="text-[10px] text-slate-500">{(duplicateModalTomada.anexos || []).length} arquivo(s)</div>
                  </div>
                </label>
              </div>
"""

# Replace the closing of the Original block
origem_pattern = re.compile(r'(<div className="text-sm font-medium text-slate-800 line-clamp-2">\{duplicateModalTomada\.title\}</div>\s*</div>)')
content = origem_pattern.sub(lambda m: m.group(1) + "\n" + toggles_block, content)

# Add "none" button
none_button = """                  <button
                    type="button"
                    onClick={() => setDuplicateMode("none")}
                    className={cn(
                      "text-left px-4 py-3 border rounded-xl flex items-start gap-3 transition-colors",
                      duplicateMode === "none" ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300" : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className={cn("mt-0.5", duplicateMode === "none" ? "text-blue-600" : "text-slate-400")}>
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <div className={cn("text-sm font-bold", duplicateMode === "none" ? "text-blue-800" : "text-slate-700")}>Não Copiar Minuta</div>
                      <div className="text-xs text-slate-500 mt-0.5">Cria uma nova participação vazia, preservando apenas os dados básicos da origem.</div>
                    </div>
                  </button>"""

content = content.replace("Copia os artigos exatamente como estavam na minuta original, ignorando as propostas feitas.</div>\n                    </div>\n                  </button>", "Copia os artigos exatamente como estavam na minuta original, ignorando as propostas feitas.</div>\n                    </div>\n                  </button>\n\n" + none_button)

# Hide the selection section if "none" is chosen
selection_block = """              {duplicateMode !== "none" && (
              <div className="pt-2">"""
content = content.replace('              <div className="pt-2">', selection_block)

end_selection_block = """                </div>
              </div>
              )}"""
content = content.replace('                </div>\n              </div>\n              \n            <div className="p-4 border-t', end_selection_block + '\n              \n            <div className="p-4 border-t')

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Modal patched")
