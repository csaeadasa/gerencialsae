with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """                        <textarea
                          rows={3}
                          value={minutaConsiderandos}
                          onChange={(e) => setMinutaConsiderandos(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed"
                        />"""

good = """                        <textarea
                          rows={3}
                          value={minutaConsiderandos}
                          onChange={(e) => setMinutaConsiderandos(e.target.value)}
                          placeholder={minutaModel === 'nova' ? defaultConsiderandosFallback : "Insira os considerandos (1 por linha)..."}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono rounded-xl p-3 outline-none focus:bg-white focus:border-indigo-500 transition-all leading-relaxed"
                        />"""

content = content.replace(bad, good)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
