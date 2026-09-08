with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

content = content.replace("contentType?: 'text' | 'table';", "contentType?: 'text' | 'table' | 'ementa' | 'considerandos';")

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)
