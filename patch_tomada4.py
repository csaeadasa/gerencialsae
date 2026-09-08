with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("Comparativo de Matriz Regulada:", "Comparativo:")
content = content.replace("Tabela (Matriz Regulada)", "Tabela")

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
