with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """                    let artigoAtoIndex = 1;

                    // 1. Dispositivos Acrescidos (Novos Artigos / Novos Parágrafos / Novos Incisos)
                    if (articlesWithAcrescidos.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. A ${minutaResolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:\\n\\n`;
                      artigoAtoIndex++;
                      articlesWithAcrescidos.forEach((ana) => {
                        const block = buildAcrescidoArticleText(ana);
                        if (block) text += `${block}\\n\\n`;
                      });
                    }

                    // 2. Dispositivos com Nova Redação
                    if (articlesWithAlterados.length > 0) {
                      const isSingular = articlesWithAlterados.length === 1 && !formattedAlteradosLabels.startsWith("Cláusula") && !formattedAlteradosLabels.startsWith("Tabela");
                      if (isSingular) {
                        text += `Art. ${artigoAtoIndex}º. O art. ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passa a vigorar com a seguinte redação:\\n\\n`;
                      } else {
                        text += `Art. ${artigoAtoIndex}º. Os artigos ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passam a vigorar com as seguintes redações:\\n\\n`;
                      }
                      artigoAtoIndex++;
                      articlesWithAlterados.forEach((ana) => {
                        const block = buildAlteradoArticleText(ana);
                        if (block) text += `${block}\\n\\n`;
                      });
                    }

                    // 3. Dispositivos Revogados
                    if (articlesWithRevogados.length > 0) {
                      const block = buildRevogadosText(articlesWithRevogados, minutaResolucoesAlteradas);
                      if (block) {
                        text += `Art. ${artigoAtoIndex}º. ${block}\\n\\n`;
                        artigoAtoIndex++;
                      }
                    }

                    // 3.5. Tabelas Alteradas do Anexo da Norma Existente
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
                    }"""

good = """                    let artigoAtoIndex = 1;

                    // 1. Ementa Alterada
                    if (ementaArticlesFinal.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. A Ementa da ${minutaResolucoesAlteradas} passa a vigorar com a seguinte redação:\\n\\n`;
                      text += `${ementaArticlesFinal[0].finalText || ""}\\n\\n`;
                      artigoAtoIndex++;
                    }

                    // 2. Considerandos Alterados
                    if (considerandosArticlesFinal.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. Os Considerandos da ${minutaResolucoesAlteradas} passam a vigorar com as seguintes redações:\\n\\n`;
                      text += `${considerandosArticlesFinal[0].finalText || ""}\\n\\n`;
                      artigoAtoIndex++;
                    }

                    // 3. Dispositivos Acrescidos (Novos Artigos / Novos Parágrafos / Novos Incisos)
                    if (articlesWithAcrescidos.length > 0) {
                      text += `Art. ${artigoAtoIndex}º. A ${minutaResolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:\\n\\n`;
                      artigoAtoIndex++;
                      articlesWithAcrescidos.forEach((ana) => {
                        const block = buildAcrescidoArticleText(ana);
                        if (block) text += `${block}\\n\\n`;
                      });
                    }

                    // 4. Dispositivos com Nova Redação
                    if (articlesWithAlterados.length > 0) {
                      const isSingular = articlesWithAlterados.length === 1 && !formattedAlteradosLabels.startsWith("Cláusula") && !formattedAlteradosLabels.startsWith("Tabela");
                      if (isSingular) {
                        text += `Art. ${artigoAtoIndex}º. O art. ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passa a vigorar com a seguinte redação:\\n\\n`;
                      } else {
                        text += `Art. ${artigoAtoIndex}º. Os artigos ${formattedAlteradosLabels}, da ${minutaResolucoesAlteradas}, passam a vigorar com as seguintes redações:\\n\\n`;
                      }
                      artigoAtoIndex++;
                      articlesWithAlterados.forEach((ana) => {
                        const block = buildAlteradoArticleText(ana);
                        if (block) text += `${block}\\n\\n`;
                      });
                    }

                    // 5. Dispositivos Revogados
                    if (articlesWithRevogados.length > 0) {
                      const block = buildRevogadosText(articlesWithRevogados, minutaResolucoesAlteradas);
                      if (block) {
                        text += `Art. ${artigoAtoIndex}º. ${block}\\n\\n`;
                        artigoAtoIndex++;
                      }
                    }

                    // 6. Tabelas Alteradas do Anexo da Norma Existente
                    if (tableArticlesWithFinalText.length > 0) {
                      if (tableArticlesWithFinalText.length === 1) {
                        text += `Art. ${artigoAtoIndex}º. A Tabela ${tableInfos[0].identifier}, do Anexo da ${minutaResolucoesAlteradas}, passa a vigorar com a redação dada pelo Anexo desta Resolução.\\n\\n`;
                      } else {
                        const tableListStr = formatTableListInPortuguese(tableInfos.map(t => t.identifier));
                        text += `Art. ${artigoAtoIndex}º. As Tabelas ${tableListStr}, do Anexo da ${minutaResolucoesAlteradas}, passam a vigorar com a redação dada pelo Anexo desta Resolução.\\n\\n`;
                      }
                      artigoAtoIndex++;
                    }"""

content = content.replace(bad, good)
with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
