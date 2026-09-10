import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace legend
old_legend = """          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
              [+ Inserido pelo Cidadão]
            </span>
            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-950 border border-rose-300 px-2 py-0.5 rounded line-through decoration-rose-600 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
              [- Excluído da Minuta]
            </span>
          </div>"""

new_legend = """          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
            <span className="text-emerald-700 underline decoration-2 decoration-emerald-500/50 underline-offset-2">
              [+ Texto Inserido]
            </span>
            <span className="text-rose-500/80 line-through decoration-rose-500/80">
              [- Texto Excluído]
            </span>
          </div>"""

content = content.replace(old_legend, new_legend)

# Replace added span
old_added = """                        <span
                          key={pIdx}
                          className="bg-emerald-100 text-emerald-950 font-bold rounded border border-emerald-300 shadow-2xs"
                          title="Texto inserido na sua proposta"
                        >"""
new_added = """                        <span
                          key={pIdx}
                          className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2"
                          title="Texto inserido na sua proposta"
                        >"""

content = content.replace(old_added, new_added)

# Replace removed span
old_removed = """                        <span
                          key={pIdx}
                          className="bg-rose-100 text-rose-900 line-through decoration-rose-600 font-semibold px-1.5 py-0.5 rounded  border border-rose-300 shadow-2xs "
                          title="Texto excluído na sua proposta"
                        >"""
new_removed = """                        <span
                          key={pIdx}
                          className="text-rose-500/80 line-through decoration-rose-500/80 font-medium"
                          title="Texto excluído na sua proposta"
                        >"""

content = content.replace(old_removed, new_removed)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch minimal applied")
