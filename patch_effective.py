with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

# Replace in string copy builder
content = content.replace('if (minutaConsiderandos.trim()) {', 'if (effectiveConsiderandos.trim()) {')
content = content.replace('const considerandosList = minutaConsiderandos.split("\\n")', 'const considerandosList = effectiveConsiderandos.split("\\n")')

# Replace in payload for docx
content = content.replace('considerandos: minutaConsiderandos,', 'considerandos: effectiveConsiderandos,')

# Replace in preview
content = content.replace('minutaConsiderandos.split("\\n").filter', 'effectiveConsiderandos.split("\\n").filter')

# Replace ementa in payload
content = content.replace('ementa: minutaEmenta,', 'ementa: effectiveEmenta,')

# Wait, `minutaEmenta` in copy builder:
content = content.replace('text += `${minutaEmenta}\\n\\n`;', 'text += `${effectiveEmenta}\\n\\n`;')
content = content.replace('text += `EMENTA: ${minutaEmenta}\\n\\n`;', 'text += `EMENTA: ${effectiveEmenta}\\n\\n`;')

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
