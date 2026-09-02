with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_block = """          {selectedTomada.anexos && selectedTomada.anexos.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-4">
              {["Documentos preliminares", "Documentos finais"].map(cat => {
                const catAnexos = selectedTomada.anexos!.filter((a: any) => (a.category || "Documentos preliminares") === cat);
                if (catAnexos.length === 0) return null;
                return (
                  <div key={cat}>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{cat}</span>
                    <div className="flex flex-wrap gap-2">
                      {catAnexos.map((anexo: any) => (
                        <a key={anexo.id} href={anexo.url} download={anexo.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors text-xs font-bold shadow-sm">
                          <FileText size={14} /> {anexo.name}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>"""

new_block = """          {selectedTomada.anexos && selectedTomada.anexos.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-4">
              {["Documentos preliminares", "Documentos finais"].map(cat => {
                const catAnexos = selectedTomada.anexos!.filter((a: any) => (a.category || "Documentos preliminares") === cat);
                if (catAnexos.length === 0) return null;
                return (
                  <div key={cat}>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{cat}</span>
                    <div className="flex flex-wrap gap-2">
                      {catAnexos.map((anexo: any) => (
                        <a key={anexo.id} href={anexo.url} download={anexo.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors text-xs font-bold shadow-sm">
                          <FileText size={14} /> {anexo.name}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedTomada.resolutions && selectedTomada.resolutions.length > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-100">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resoluções Relacionadas</span>
              <div className="flex flex-wrap gap-2">
                {selectedTomada.resolutions.map((res: any) => (
                  <button 
                    key={res.id} 
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                         window.dispatchEvent(new CustomEvent('open-resolution-details', { detail: res }));
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-xs font-bold shadow-sm"
                  >
                    <Book size={14} className="text-indigo-600" />
                    {res.especie} {res.numero}/{res.ano}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    print("Patched TomadaSubsidiosTab")

with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
    f.write(text)
