import re
with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert ALL wrong placements
content = content.replace('              {duplicateMode !== "none" && (\n              <div className="pt-2">', '              <div className="pt-2">')
content = content.replace('                </div>\n              </div>\n              )}', '                </div>\n              </div>')

# 2. Re-apply in the exact right spot.
# Let's find:
#                     <div>
#                       <div className={cn("text-sm font-bold", duplicateMode === "none" ? "text-blue-800" : "text-slate-700")}>Não Copiar Minuta</div>
#                       <div className="text-xs text-slate-500 mt-0.5">Cria uma nova participação vazia, preservando apenas os dados básicos da origem.</div>
#                     </div>
#                   </button>
#                 </div>
#               </div>
#               
#               <div className="pt-2">
#                 <div className="flex items-center justify-between mb-2">

correct_target = r'(<div className={cn\("text-sm font-bold", duplicateMode === "none" \? "text-blue-800" : "text-slate-700"\)}>Não Copiar Minuta</div>.*?</button>\s*</div>\s*</div>)\s*<div className="pt-2">'

match = re.search(correct_target, content, re.DOTALL)
if match:
    content = content[:match.start()] + match.group(1) + '\n              {duplicateMode !== "none" && (\n              <div className="pt-2">' + content[match.end():]
else:
    print("Could not find start target")

# Now the end target:
#                     <div className="p-4 text-center text-xs text-slate-500 italic">
#                       Nenhum dispositivo encontrado nesta minuta.
#                     </div>
#                   )}
#                 </div>
#               </div>
#               
#             <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">

end_target = r'(Nenhum dispositivo encontrado nesta minuta\.\s*</div>\s*)\}\s*</div>\s*</div>(\s*)<div className="p-4 border-t'

match_end = re.search(end_target, content, re.DOTALL)
if match_end:
    content = content[:match_end.start()] + match_end.group(1) + '}\n                </div>\n              </div>\n              )}' + match_end.group(2) + '<div className="p-4 border-t' + content[match_end.end():]
else:
    print("Could not find end target")

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fix executed")
