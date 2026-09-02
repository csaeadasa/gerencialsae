with open("src/components/ResolutionsDashboard.tsx", "r") as f:
    text = f.read()

timeline_old = """                                  <div key={res.id} className="bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2 transition-colors relative overflow-hidden group/item">
                                    {/* Number / Species and Status Badge */}"""

timeline_new = """                                  <div key={res.id} className="bg-slate-50/60 hover:bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2 transition-colors relative overflow-hidden group/item">
                                    {/* Cover Image */}
                                    {res.imagem_capa && (
                                      <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white flex items-center justify-center mb-1">
                                        <img src={res.imagem_capa} alt={`Capa da ${res.especie} ${res.numero}`} className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    {/* Number / Species and Status Badge */}"""

if timeline_old in text:
    text = text.replace(timeline_old, timeline_new)
    with open("src/components/ResolutionsDashboard.tsx", "w") as f:
        f.write(text)
    print("Timeline patched")
else:
    print("Timeline patch failed")
