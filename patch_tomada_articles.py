with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """              // 7.1 Separate text articles from table articles
              const textArticlesWithFinalText = articlesWithFinalText.filter(art => 
                art.contentType !== 'table' && !isTableJson(art.finalText || art.proposedText || art.originalText)
              );"""

good = """              // 7.1 Separate text articles from table articles
              const textArticlesWithFinalText = articlesWithFinalText.filter(art => 
                art.contentType !== 'table' && art.contentType !== 'ementa' && art.contentType !== 'considerandos' && !isTableJson(art.finalText || art.proposedText || art.originalText)
              );
              
              const ementaArticlesFinal = articlesWithFinalText.filter(art => art.contentType === 'ementa');
              const considerandosArticlesFinal = articlesWithFinalText.filter(art => art.contentType === 'considerandos');"""

content = content.replace(bad, good)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
