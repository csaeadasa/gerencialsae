import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For the ArticleSection (Contribuir tab)
old_label_1 = """                {article.contentType === 'table' || isTableJson(article.proposedText || article.originalText) ? "Tabela Proposta em Consulta (Minuta)" : "Texto Proposto em Consulta (Minuta)"}
              </span>"""

new_label_1 = """                {article.contentType === 'table' || isTableJson(article.proposedText || article.originalText) ? "Tabela Proposta em Consulta (Minuta)" : "Texto Proposto em Consulta (Minuta)"}
              </span>
              {tipoResolucao === "alteracao" && article.originalText && (article.proposedText === undefined || article.proposedText === null || article.originalText === article.proposedText) && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                  Texto proposto é igual ao texto atual
                </span>
              )}"""

if new_label_1 not in content:
    content = content.replace(old_label_1, new_label_1)


# For the TechnicalAnalysisArticleProps (Gerenciar contribuições) inside the list of articles
old_label_2 = """                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                          {art.contentType === 'table' || isTableJson(art.proposedText || art.originalText) ? "Tabela Proposta em Consulta (Minuta)" : "Texto Proposto em Consulta (Minuta)"}
                        </span>"""

new_label_2 = """                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                          {art.contentType === 'table' || isTableJson(art.proposedText || art.originalText) ? "Tabela Proposta em Consulta (Minuta)" : "Texto Proposto em Consulta (Minuta)"}
                        </span>
                        {selectedTomada.tipoResolucao === "alteracao" && art.originalText && (art.proposedText === undefined || art.proposedText === null || art.originalText === art.proposedText) && (
                          <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">
                            Texto proposto é igual ao texto atual
                          </span>
                        )}"""

if new_label_2 not in content:
    content = content.replace(old_label_2, new_label_2)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch labels python script finished")
