with open("src/components/ResolutionsDashboard.tsx", "r") as f:
    text = f.read()

table_old = """                    <tr key={res.id} className="hover:bg-slate-50/40 transition-colors group align-top">
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        <div className="flex flex-col">
                          <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{res.especie}</span>"""

table_new = """                    <tr key={res.id} className="hover:bg-slate-50/40 transition-colors group align-top">
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        <div className="flex items-start gap-3">
                          {res.imagem_capa && (
                            <div className="w-14 h-20 rounded shadow-sm border border-slate-200 overflow-hidden shrink-0 bg-white">
                              <img src={res.imagem_capa} alt={`Capa da ${res.especie} ${res.numero}`} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest">{res.especie}</span>"""

if table_old in text:
    text = text.replace(table_old, table_new)
    with open("src/components/ResolutionsDashboard.tsx", "w") as f:
        f.write(text)
    print("Table patched")
else:
    print("Table patch failed")
