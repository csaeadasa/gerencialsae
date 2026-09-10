import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the short circuits in renderDiffInline
old_circuit = """  if (!orig && !prop) return <span className="text-slate-400 italic">Sem texto cadastrado</span>;
  if (!orig) return <span className="whitespace-pre-line">{prop}</span>;
  if (!prop) return <span className="whitespace-pre-line">{orig}</span>;
  if (orig === prop) return <span className="whitespace-pre-line">{prop}</span>;"""

new_circuit = """  if (!orig && !prop) return <span className="text-slate-400 italic">Sem texto cadastrado</span>;
  if (orig === prop) return <span className="whitespace-pre-line">{prop}</span>;"""

content = content.replace(old_circuit, new_circuit)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch renderDiffInline circuit finished")
