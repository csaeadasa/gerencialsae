import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_added = """            <span
              key={pIdx}
              className="bg-emerald-100 text-emerald-950 font-bold px-1 py-0.5 rounded  border border-emerald-300 inline-block shadow-2xs"
              title="Texto inserido na minuta proposta"
            >"""
new_added = """            <span
              key={pIdx}
              className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words"
              title="Texto inserido na minuta proposta"
            >"""

content = content.replace(old_added, new_added)

old_removed = """            <span
              key={pIdx}
              className="bg-rose-100 text-rose-950 px-1 py-0.5 rounded  line-through decoration-rose-500 border border-rose-300 inline-block font-medium opacity-90"
              title="Texto excluído da redação vigente"
            >"""
new_removed = """            <span
              key={pIdx}
              className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words"
              title="Texto excluído da redação vigente"
            >"""

content = content.replace(old_removed, new_removed)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch renderDiffInline applied")
