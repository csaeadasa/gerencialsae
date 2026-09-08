with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

# 1. Update text generation (clipboard)
bad_clipboard = """                    // 3.5. Tabelas Alteradas do Anexo da Norma Existente
                    if (tableArticlesWithFinalText.length > 0) {"""

good_clipboard = """                    // 3.5. Tabelas Alteradas do Anexo da Norma Existente
                    if (tableArticlesWithFinalText.length > 0) {
                      if (tableArticlesWithFinalText.length === 1) {
                        text += `Art. ${artigoAtoIndex}º. A Tabela ${tableInfos[0].identifier}, do Anexo da ${minutaResolucoesAlteradas}, passa a vigorar com a redação dada pelo Anexo desta Resolução.\\n\\n`;
                      } else {
                        const tableListStr = formatTableListInPortuguese(tableInfos.map(t => t.identifier));
                        text += `Art. ${artigoAtoIndex}º. As Tabelas ${tableListStr}, do Anexo da ${minutaResolucoesAlteradas}, passam a vigorar com a redação dada pelo Anexo desta Resolução.\\n\\n`;
                      }
                      artigoAtoIndex++;
                    }

                    // 3.6. Ementa Alterada
                    if (ementaArticlesFinal.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. A Ementa da ${minutaResolucoesAlteradas} passa a vigorar com a seguinte redação:\\n\\n`;
                      text += `${ementaArticlesFinal[0].finalText || ""}\\n\\n`;
                      artigoAtoIndex++;
                    }

                    // 3.7. Considerandos Alterados
                    if (considerandosArticlesFinal.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. Os Considerandos da ${minutaResolucoesAlteradas} passam a vigorar com as seguintes redações:\\n\\n`;
                      text += `${considerandosArticlesFinal[0].finalText || ""}\\n\\n`;
                      artigoAtoIndex++;
                    }

                    // Skip the old table check since we injected it above
                    if (false) {"""

content = content.replace(bad_clipboard, good_clipboard)

# 2. Update visual preview variables
bad_preview_vars = """                              const artTableIndex = tableArticlesWithFinalText.length > 0 ? articleCounter++ : null;
                              const artVigenciaIndex = articleCounter;"""

good_preview_vars = """                              const artTableIndex = tableArticlesWithFinalText.length > 0 ? articleCounter++ : null;
                              const artEmentaIndex = ementaArticlesFinal.length > 0 ? articleCounter++ : null;
                              const artConsiderandosIndex = considerandosArticlesFinal.length > 0 ? articleCounter++ : null;
                              const artVigenciaIndex = articleCounter;"""

content = content.replace(bad_preview_vars, good_preview_vars)

# 3. Update visual preview sections
bad_preview_sections = """                                  {/* SEÇÃO 4: ARTIGO DE VIGÊNCIA */}"""

good_preview_sections = """                                  {/* SEÇÃO 3.6: ARTIGO DE EMENTA */}
                                  {ementaArticlesFinal.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {artEmentaIndex}º.</strong> A Ementa da {minutaResolucoesAlteradas} passa a vigorar com a seguinte redação:
                                      </p>
                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-purple-400">
                                        <div className="p-3 rounded-lg bg-purple-50/40 border border-purple-200/60 print:bg-transparent print:border-none print:p-0">
                                          <div className="leading-relaxed not-italic text-slate-900">
                                            {renderNormativeBlock(ementaArticlesFinal[0].finalText || "", true)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 3.7: ARTIGO DE CONSIDERANDOS */}
                                  {considerandosArticlesFinal.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {artConsiderandosIndex}º.</strong> Os Considerandos da {minutaResolucoesAlteradas} passam a vigorar com as seguintes redações:
                                      </p>
                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-fuchsia-400">
                                        <div className="p-3 rounded-lg bg-fuchsia-50/40 border border-fuchsia-200/60 print:bg-transparent print:border-none print:p-0">
                                          <div className="leading-relaxed not-italic text-slate-900">
                                            {renderNormativeBlock(considerandosArticlesFinal[0].finalText || "", true)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 4: ARTIGO DE VIGÊNCIA */}"""

content = content.replace(bad_preview_sections, good_preview_sections)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
