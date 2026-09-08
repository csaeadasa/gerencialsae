with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """                                  {/* SEÇÃO 1: ARTIGO DE DISPOSITIVOS ACRESCIDOS */}
                                  {articlesWithAcrescidos.length > 0 && (
                                    <div className="space-y-3">
                                      <p className="indent-8">
                                        <strong>Art. {art1Index}º.</strong> A {minutaResolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:
                                      </p>
                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-emerald-400">
                                        {articlesWithAcrescidos.map((ana) => {
                                          const blockText = buildAcrescidoArticleText(ana);
                                          if (!blockText) return null;
                                          return (
                                            <div key={ana.article.id} className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-200/60 print:bg-transparent print:border-none print:p-0">
                                              <div className="flex items-center justify-between gap-2 mb-1.5 print:hidden">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 font-sans">
                                                  <PlusCircle size={11} /> {ana.isEntireArticleNew ? "Artigo Integralmente Novo" : "Dispositivo(s) Acrescido(s)"}
                                                </span>
                                              </div>
                                              <div className="leading-relaxed not-italic text-slate-900">
                                                {renderNormativeBlock(blockText, true)}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 4: ARTIGO DE DISPOSITIVOS COM NOVA REDAÇÃO */}
                                  {articlesWithAlterados.length > 0 && (
                                    <div className="space-y-3 pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {art2Index}º.</strong> {articlesWithAlterados.length === 1 && !formattedAlteradosLabels.startsWith("Cláusula") && !formattedAlteradosLabels.startsWith("Tabela")
                                          ? `O art. ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passa a vigorar com a seguinte redação:`
                                          : `Os artigos ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passam a vigorar com as seguintes redações:`}
                                      </p>
                                      <div className="space-y-4 pl-4 sm:pl-8 border-l-2 border-blue-400">
                                        {articlesWithAlterados.map((ana) => {
                                          const blockText = buildAlteradoArticleText(ana);
                                          if (!blockText) return null;
                                          return (
                                            <div key={ana.article.id} className="p-3 rounded-lg bg-blue-50/40 border border-blue-200/60 print:bg-transparent print:border-none print:p-0">
                                              <div className="flex items-center justify-between gap-2 mb-1.5 print:hidden">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-sans">
                                                  <Edit3 size={11} /> Nova Redação ({ana.artLabel})
                                                </span>
                                              </div>
                                              <div className="leading-relaxed not-italic text-slate-900">
                                                {renderNormativeBlock(blockText, true)}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* SEÇÃO 5: ARTIGO DE DISPOSITIVOS REVOGADOS */}
                                  {articlesWithRevogados.length > 0 && (
                                    <div className="pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {art3Index}º.</strong> {buildRevogadosText(articlesWithRevogados, minutaResolucoesAlteradas)}
                                      </p>
                                    </div>
                                  )}

                                  {/* SEÇÃO 6: ARTIGO DE TABELAS DO ANEXO */}
                                  {tableArticlesWithFinalText.length > 0 && (
                                    <div className="pt-2">
                                      <p className="indent-8">
                                        <strong>Art. {artTableIndex}º.</strong> {tableArticlesWithFinalText.length === 1
                                          ? `A Tabela ${tableInfos[0].identifier}, do Anexo da ${minutaResolucoesAlteradas}, passa a vigorar com a redação dada pelo Anexo desta Resolução.`
                                          : `As Tabelas ${formatTableListInPortuguese(tableInfos.map(t => t.identifier))}, do Anexo da ${minutaResolucoesAlteradas}, passam a vigorar com a redação dada pelo Anexo desta Resolução.`}
                                      </p>
                                    </div>
                                  )}"""


with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content.replace(bad, ""))
