import re
with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'(Nenhum dispositivo encontrado nesta minuta\.\s*</div>\s*)\}\s*</div>\s*</div>\s*</div>\s*<div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">',
    r'\1}\n                </div>\n              </div>\n              )}\n            </div>\n              \n            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
