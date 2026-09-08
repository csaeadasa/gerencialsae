with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "{article.contentType === 'table' ? `TABELA #${displayIndex}` : dispInfo.label}",
    "{article.contentType === 'table' ? `TABELA #${displayIndex}` : article.contentType === 'ementa' ? 'Ementa' : article.contentType === 'considerandos' ? 'Considerandos' : dispInfo.label}"
)

content = content.replace(
    "{art.contentType === 'table' ? `TABELA #${displayIdx}` : dispInfo.label}",
    "{art.contentType === 'table' ? `TABELA #${displayIdx}` : art.contentType === 'ementa' ? 'Ementa' : art.contentType === 'considerandos' ? 'Considerandos' : dispInfo.label}"
)

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
