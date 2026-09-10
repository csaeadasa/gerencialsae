import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_added = """                        <span
                          key={pIdx}
                          className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded mx-0.5 border border-emerald-300 shadow-2xs inline-block my-0.5"
                          title="Texto inserido na sua proposta"
                        >"""

new_added = """                        <span
                          key={pIdx}
                          className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs"
                          title="Texto inserido na sua proposta"
                        >"""

old_removed = """                        <span
                          key={pIdx}
                          className="bg-rose-100 text-rose-950 px-1 py-0.5 rounded mx-0.5 line-through decoration-rose-600/60 border border-rose-300 opacity-90 inline-block my-0.5"
                          title="Texto excluído da minuta base"
                        >"""

new_removed = """                        <span
                          key={pIdx}
                          className="bg-rose-100 text-rose-950 px-1 py-0.5 rounded line-through decoration-rose-600/60 border border-rose-300 opacity-90"
                          title="Texto excluído da minuta base"
                        >"""

if old_added in content:
    content = content.replace(old_added, new_added)
    print("Added patched.")
else:
    print("Added not found.")

if old_removed in content:
    content = content.replace(old_removed, new_removed)
    print("Removed patched.")
else:
    print("Removed not found.")
    
# Let's search using regex if not found
if "inline-block" in content:
    content = re.sub(r'inline-block my-0\.5', r'', content)
    print("Removed inline-block globally")
    content = re.sub(r'mx-0\.5', r'', content)
    
with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)
