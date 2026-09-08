import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    text = f.read()

# I will find the block starting at `                    let artigoAtoIndex = 1;`
# and ending right before `                    // 4. Disposição de Vigência`

start_marker = "                    let artigoAtoIndex = 1;"
end_marker = "                    // Skip the old table check since we injected it above"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

content_to_replace = text[start_idx:end_idx]

# Extract each section

# Acrescidos
sec_acrescidos_match = re.search(r'(                    // 1\. Dispositivos Acrescidos .*?)(?=                    // 2\. )', content_to_replace, re.DOTALL)
# Nova redacao
sec_nova_redacao_match = re.search(r'(                    // 2\. Dispositivos com Nova Redação.*?)(?=                    // 3\. )', content_to_replace, re.DOTALL)
# Revogados
sec_revogados_match = re.search(r'(                    // 3\. Dispositivos Revogados.*?)(?=                    // 3\.5\. )', content_to_replace, re.DOTALL)
# Tabelas
sec_tabelas_match = re.search(r'(                    // 3\.5\. Tabelas Alteradas do Anexo da Norma Existente.*?)(?=                    // 3\.6\. )', content_to_replace, re.DOTALL)
# Ementa
sec_ementa_match = re.search(r'(                    // 3\.6\. Ementa Alterada.*?)(?=                    // 3\.7\. )', content_to_replace, re.DOTALL)
# Considerandos
sec_considerandos_match = re.search(r'(                    // 3\.7\. Considerandos Alterados.*?)$', content_to_replace, re.DOTALL)

if not all([sec_acrescidos_match, sec_nova_redacao_match, sec_revogados_match, sec_tabelas_match, sec_ementa_match, sec_considerandos_match]):
    print("Could not extract all sections for clipboard")
    exit(1)

sec_acrescidos = sec_acrescidos_match.group(1)
sec_nova_redacao = sec_nova_redacao_match.group(1)
sec_revogados = sec_revogados_match.group(1)
sec_tabelas = sec_tabelas_match.group(1)
sec_ementa = sec_ementa_match.group(1)
sec_considerandos = sec_considerandos_match.group(1)

# Reorder them: Ementa -> Considerandos -> Acrescidos -> Nova Redacao -> Revogados -> Tabelas
new_content = (
    start_marker + "\n" +
    sec_ementa.replace("3.6. Ementa Alterada", "1. Ementa Alterada") +
    sec_considerandos.replace("3.7. Considerandos Alterados", "2. Considerandos Alterados") +
    sec_acrescidos.replace("1. Dispositivos Acrescidos", "3. Dispositivos Acrescidos") +
    sec_nova_redacao.replace("2. Dispositivos com Nova Redação", "4. Dispositivos com Nova Redação") +
    sec_revogados.replace("3. Dispositivos Revogados", "5. Dispositivos Revogados") +
    sec_tabelas.replace("3.5. Tabelas Alteradas do Anexo da Norma Existente", "6. Tabelas Alteradas do Anexo da Norma Existente")
)

# Remove the starting marker from the start_idx since we manually appended it to new_content
new_text = text[:start_idx] + new_content + text[end_idx:]

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(new_text)

print("Clipboard reordered successfully!")
