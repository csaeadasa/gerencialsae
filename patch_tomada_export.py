with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """                    tableArticlesWithFinalText: tableArticlesWithFinalText,
                    tableInfos: tableInfos,
                  });"""

good = """                    tableArticlesWithFinalText: tableArticlesWithFinalText,
                    tableInfos: tableInfos,
                    ementaArticlesFinal: ementaArticlesFinal,
                    considerandosArticlesFinal: considerandosArticlesFinal,
                  });"""

content = content.replace(bad, good)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
