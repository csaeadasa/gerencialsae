import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Plus is imported
if "Plus," not in content and " Plus " not in content:
    content = content.replace("import { ", "import { Plus, ", 1)

# Patch 1: ArticleSection
old_badge_1 = """                <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                </span>
              )}"""

new_badge_1 = """                <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                </span>
              )}
              {tipoResolucao === "alteracao" && !article.originalText && (
                <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  <Plus size={12} className="shrink-0" /> Novo Dispositivo
                </span>
              )}"""

if "Novo Dispositivo" not in old_badge_1:
    content = content.replace(old_badge_1, new_badge_1)

# Patch 2: TechnicalAnalysisArticleProps
old_badge_2 = """                          <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                          </span>
                        )}"""

new_badge_2 = """                          <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            <AlertTriangle size={12} className="shrink-0" /> Texto proposto é igual ao texto atual
                          </span>
                        )}
                        {selectedTomada.tipoResolucao === "alteracao" && !art.originalText && (
                          <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            <Plus size={12} className="shrink-0" /> Novo Dispositivo
                          </span>
                        )}"""

if "Novo Dispositivo" not in old_badge_2:
    content = content.replace(old_badge_2, new_badge_2)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied for new device badge")
