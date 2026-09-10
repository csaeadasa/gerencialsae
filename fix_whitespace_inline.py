import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Trocar o container para usar apenas estilo de fonte basico e não whitespace-pre-line se ele estiver quebrando spans sem motivo
content = re.sub(
    r'className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-line"',
    r'className="text-sm text-slate-800 font-medium leading-relaxed break-words"',
    content
)
content = re.sub(
    r'className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-line"',
    r'className="text-sm text-slate-700 font-medium leading-relaxed break-words"',
    content
)

# Precisamos garantir que os fragmentos que NÃO são added nem removed sejam renderizados como spans ou fragmentos puros sem criar divisões invisíveis.
# O diffParts.map nativo do react geralmente faz isso. Mas para garantir, vamos olhar como ele renderiza o else:

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Container patched")
