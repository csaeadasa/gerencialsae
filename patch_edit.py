with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_block = """                  </div>
                )}
              </div>
            </div>"""

new_block = """                  </div>
                )}
              {editModalTab === "anexos" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">INCLUIR NOVO DOCUMENTO</label>
                    <input 
                      type="file" 
                      multiple
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={e => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files).map(f => ({
                            file: f,
                            name: f.name,
                            category: "Documentos preliminares" as const
                          }));
                          setEditAnexos([...editAnexos, ...newFiles]);
                        }
                      }}
                    />
                  </div>
                  {editAnexos.length > 0 && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">DOCUMENTOS CADASTRADOS ({editAnexos.length})</label>
                      <ul className="space-y-3">
                        {editAnexos.map((anexo, i) => (
                          <li key={i} className="text-xs font-medium text-slate-700 flex flex-col gap-2 bg-slate-100 px-4 py-3 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="truncate flex items-center gap-2">
                                <FileText size={14} className="text-indigo-500"/> {anexo.file ? anexo.file.name : (anexo.url ? "Arquivo Cadastrado" : "Documento")}
                              </span>
                              <button 
                                type="button"
                                onClick={() => setEditAnexos(editAnexos.filter((_, idx) => idx !== i))} 
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                title="Remover documento"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Nome do documento" 
                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={anexo.name}
                                onChange={(e) => {
                                  const newAnexos = [...editAnexos];
                                  newAnexos[i].name = e.target.value;
                                  setEditAnexos(newAnexos);
                                }}
                              />
                              <select 
                                className="px-3 py-1.5 border border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                value={anexo.category || "Documentos preliminares"}
                                onChange={(e) => {
                                  const newAnexos = [...editAnexos];
                                  newAnexos[i].category = e.target.value as "Documentos preliminares" | "Documentos finais";
                                  setEditAnexos(newAnexos);
                                }}
                              >
                                <option value="Documentos preliminares">Documentos preliminares</option>
                                <option value="Documentos finais">Documentos finais</option>
                              </select>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>"""

if old_block in text:
    text = text.replace(old_block, new_block, 1)
    with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
        f.write(text)
    print("Success replacing block 3")
else:
    print("Failed to find block 3")
