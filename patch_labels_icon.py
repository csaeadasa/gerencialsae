import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_label = """<span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  Texto proposto é igual ao texto atual
                </span>"""

new_label = """<span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                </span>"""

content = content.replace(old_label, new_label)

old_label_2 = """<span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            Texto proposto é igual ao texto atual
                          </span>"""
new_label_2 = """<span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                          </span>"""

content = content.replace(old_label_2, new_label_2)

# Ensure AlertTriangle is imported from lucide-react if it's not already
if "AlertTriangle" not in content[:1000]:
    content = content.replace("import { ", "import { AlertTriangle, ", 1)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch labels icon python script finished")
