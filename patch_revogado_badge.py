import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a red badge for revoked items
# Search for: <Plus size={12} className="shrink-0" /> Novo Dispositivo

old_badges = """<Plus size={12} className="shrink-0" /> Novo Dispositivo
                </span>
              )}"""

new_badges = """<Plus size={12} className="shrink-0" /> Novo Dispositivo
                </span>
              )}
              {tipoResolucao === "alteracao" && article.originalText && article.proposedText === "" && (
                <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  Revogação do Dispositivo Proposta
                </span>
              )}"""

if "Revogação do Dispositivo Proposta" not in content:
    content = content.replace(old_badges, new_badges)

old_badges_2 = """<Plus size={12} className="shrink-0" /> Novo Dispositivo
                          </span>
                        )}"""

new_badges_2 = """<Plus size={12} className="shrink-0" /> Novo Dispositivo
                          </span>
                        )}
                        {selectedTomada.tipoResolucao === "alteracao" && art.originalText && art.proposedText === "" && (
                          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            Revogação do Dispositivo Proposta
                          </span>
                        )}"""

content = content.replace(old_badges_2, new_badges_2)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch revogado badge python script finished")
