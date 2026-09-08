with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

bad = """              const defaultEmenta = minutaModel === "nova" 
                ? (selectedTomada.objeto || "Dispõe sobre os procedimentos e diretrizes regulatórias e dá outras providências.")
                : `Altera a ${minutaResolucoesAlteradas}, e dá outras providências.`;"""

good = """              const defaultEmenta = minutaModel === "nova" 
                ? (ementaArticlesFinal.length > 0 ? (ementaArticlesFinal[0].finalText || "") : (selectedTomada.objeto || "Dispõe sobre os procedimentos e diretrizes regulatórias e dá outras providências."))
                : `Altera a ${minutaResolucoesAlteradas}, e dá outras providências.`;
                
              const defaultConsiderandosFallback = considerandosArticlesFinal.length > 0 ? (considerandosArticlesFinal[0].finalText || "") : "";"""

content = content.replace(bad, good)

# also fix effectiveEmenta and Considerandos
bad2 = """              const effectiveEmenta = minutaEmenta.trim() ? minutaEmenta : defaultEmenta;"""
good2 = """              const effectiveEmenta = minutaEmenta.trim() ? minutaEmenta : defaultEmenta;
              const effectiveConsiderandos = minutaConsiderandos.trim() ? minutaConsiderandos : (minutaModel === 'nova' ? defaultConsiderandosFallback : "");"""
content = content.replace(bad2, good2)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
