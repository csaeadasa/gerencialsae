with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_block = """          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Material de Apoio (Anexos)</label>
            <input 
              type="file" 
              multiple
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-700 transition-all text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={e => {
                if (e.target.files) {
                  setFormData({ ...formData, anexos: [...formData.anexos, ...Array.from(e.target.files)] });
                }
              }}
            />
            {formData.anexos.length > 0 && (
              <ul className="mt-3 space-y-2">
                {formData.anexos.map((file, i) => (
                  <li key={i} className="text-xs font-medium text-slate-700 flex items-center justify-between bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                    <span className="truncate flex items-center gap-2">
                      <FileText size={14} className="text-indigo-500"/> {file.name}
                    </span>
                    <button 
                      onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, idx) => idx !== i)})} 
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Remover anexo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>"""

new_block = """          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Documentos</label>
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
                  setFormData({ ...formData, anexos: [...formData.anexos, ...newFiles] });
                }
              }}
            />
            {formData.anexos.length > 0 && (
              <ul className="mt-3 space-y-3">
                {formData.anexos.map((anexo, i) => (
                  <li key={i} className="text-xs font-medium text-slate-700 flex flex-col gap-2 bg-slate-100 px-4 py-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="truncate flex items-center gap-2">
                        <FileText size={14} className="text-indigo-500"/> {anexo.file ? anexo.file.name : anexo.name}
                      </span>
                      <button 
                        onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, idx) => idx !== i)})} 
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
                          const newAnexos = [...formData.anexos];
                          newAnexos[i].name = e.target.value;
                          setFormData({ ...formData, anexos: newAnexos });
                        }}
                      />
                      <select 
                        className="px-3 py-1.5 border border-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        value={anexo.category}
                        onChange={(e) => {
                          const newAnexos = [...formData.anexos];
                          newAnexos[i].category = e.target.value as "Documentos preliminares" | "Documentos finais";
                          setFormData({ ...formData, anexos: newAnexos });
                        }}
                      >
                        <option value="Documentos preliminares">Documentos preliminares</option>
                        <option value="Documentos finais">Documentos finais</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
        f.write(text)
    print("Success replacing block 1")
else:
    print("Failed to find block 1")
