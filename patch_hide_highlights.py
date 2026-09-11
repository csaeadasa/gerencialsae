import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state
old_state = "const [showOrientacoesModal, setShowOrientacoesModal] = useState(false);"
new_state = "const [showOrientacoesModal, setShowOrientacoesModal] = useState(false);\n  const [hideHighlightsSet, setHideHighlightsSet] = useState<Set<string | number>>(new Set());\n\n  const toggleHighlight = (id: string | number) => {\n    setHideHighlightsSet(prev => {\n      const next = new Set(prev);\n      if (next.has(id)) next.delete(id);\n      else next.add(id);\n      return next;\n    });\n  };"

content = content.replace(old_state, new_state)

# 2. Add button in Análise das Contribuições Recebidas (around line 7013)
# It renders inside map(c => ...) so `c.id` is available.
old_analise = """                                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                      {isContribTable ? "Tabela da Contribuição Sugerida (Com destaques)" : "Texto da Contribuição Sugerida (Com destaques)"}
                                                    </span>
                                                    {isContribTable ? ("""
new_analise = """                                                    <div className="flex items-center justify-between mb-2">
                                                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {isContribTable ? "Tabela da Contribuição Sugerida (Com destaques)" : "Texto da Contribuição Sugerida (Com destaques)"}
                                                      </span>
                                                      <button 
                                                        type="button" 
                                                        onClick={() => toggleHighlight(c.id)} 
                                                        className="text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                                      >
                                                        {hideHighlightsSet.has(c.id) ? "Mostrar Destaques" : "Ocultar Destaques"}
                                                      </button>
                                                    </div>
                                                    {isContribTable ? ("""

content = content.replace(old_analise, new_analise)

# 3. Apply the hide logic to Análise
old_analise_diff = """                                                        {(() => {
                                                          const cOrigText = (art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "";
                                                          const cDiffParts = getSmartDiff(cOrigText, c.proposedText || "");
                                                          return cDiffParts.map((part, i) => (
                                                            part.added ? <span key={i} className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words">{part.value}</span> :
                                                            part.removed ? <span key={i} className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words">{part.value}</span> :
                                                            <span key={i}>{part.value}</span>
                                                          ));
                                                        })()}"""
new_analise_diff = """                                                        {(() => {
                                                          const cOrigText = (art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText) || "";
                                                          if (hideHighlightsSet.has(c.id)) {
                                                            return <span>{c.proposedText || ""}</span>;
                                                          }
                                                          const cDiffParts = getSmartDiff(cOrigText, c.proposedText || "");
                                                          return cDiffParts.map((part, i) => (
                                                            part.added ? <span key={i} className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words">{part.value}</span> :
                                                            part.removed ? <span key={i} className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words">{part.value}</span> :
                                                            <span key={i}>{part.value}</span>
                                                          ));
                                                        })()}"""
content = content.replace(old_analise_diff, new_analise_diff)

# 4. Add button in Gerenciar Contribuições (the one where the user submits their own)
# Wait, where is that one rendered?
# Let's write the python file and run it, then check the Gerenciar Contribuições part.

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch highlights part 1 finished")
