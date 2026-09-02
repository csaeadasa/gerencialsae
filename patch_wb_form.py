import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                        {/* Linha 2 (Linha de baixo): Campo Etapas */}
                        <div className="space-y-2">"""

replacement = """                        {/* Linha 2 (Linha de baixo): Tipo de Balanço e Etapas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pl-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                Tipo de Balanço
                              </label>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Modelo de cálculo de demanda
                              </span>
                            </div>
                            <div className="relative">
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-adasa-mid transition-all shadow-sm cursor-pointer appearance-none pr-10"
                                value={activeBalance?.tipoBalanco || "Projetado"}
                                onChange={(e) => updateActiveBalance({ tipoBalanco: e.target.value as any })}
                              >
                                <option value="Projetado">Projetado (Cálculo por Região)</option>
                                <option value="Estimado">Estimado (Digitação por Subsistema)</option>
                              </select>
                              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div className="space-y-2">"""

if target in content:
    content = content.replace(target, replacement)
    
    # We also need to close the grid
    target2 = """                          </div>
                        </div>

                        {/* Linha do Tempo Visual */}"""
    replacement2 = """                          </div>
                          </div>
                        </div>

                        {/* Linha do Tempo Visual */}"""
    content = content.replace(target2, replacement2)
    
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched form successfully!")
else:
    print("Target not found.")

