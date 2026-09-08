import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    text = f.read()

# Let's find the main block to replace.
# It starts at `                                  {/* SEÇÃO 1: ARTIGO DE DISPOSITIVOS ACRESCIDOS */}`
# and ends right before `                                  {/* SEÇÃO 4: ARTIGO DE VIGÊNCIA */}`

start_marker = "                                  {/* SEÇÃO 1: ARTIGO DE DISPOSITIVOS ACRESCIDOS */}"
end_marker = "                                  {/* SEÇÃO 4: ARTIGO DE VIGÊNCIA */}"

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

content_to_replace = text[start_idx:end_idx]

# Extract each section from content_to_replace using regex

sec_acrescidos_match = re.search(r'(                                  \{/\* SEÇÃO 1: ARTIGO DE DISPOSITIVOS ACRESCIDOS \*/\}.*?)(?=                                  \{/\* SEÇÃO 2:)', content_to_replace, re.DOTALL)
sec_nova_redacao_match = re.search(r'(                                  \{/\* SEÇÃO 2: ARTIGO DE DISPOSITIVOS COM NOVA REDAÇÃO \*/\}.*?)(?=                                  \{/\* SEÇÃO 3:)', content_to_replace, re.DOTALL)
sec_revogados_match = re.search(r'(                                  \{/\* SEÇÃO 3: ARTIGO DE DISPOSITIVOS REVOGADOS \*/\}.*?)(?=                                  \{/\* SEÇÃO 3\.5:)', content_to_replace, re.DOTALL)
sec_tabelas_match = re.search(r'(                                  \{/\* SEÇÃO 3\.5: ARTIGO DE TABELAS DO ANEXO \*/\}.*?)(?=                                  \{/\* SEÇÃO 3\.6:)', content_to_replace, re.DOTALL)
sec_ementa_match = re.search(r'(                                  \{/\* SEÇÃO 3\.6: ARTIGO DE EMENTA \*/\}.*?)(?=                                  \{/\* SEÇÃO 3\.7:)', content_to_replace, re.DOTALL)
sec_considerandos_match = re.search(r'(                                  \{/\* SEÇÃO 3\.7: ARTIGO DE CONSIDERANDOS \*/\}.*?)$', content_to_replace, re.DOTALL)

if not all([sec_acrescidos_match, sec_nova_redacao_match, sec_revogados_match, sec_tabelas_match, sec_ementa_match, sec_considerandos_match]):
    print("Could not extract all sections")
    exit(1)

sec_acrescidos = sec_acrescidos_match.group(1)
sec_nova_redacao = sec_nova_redacao_match.group(1)
sec_revogados = sec_revogados_match.group(1)
sec_tabelas = sec_tabelas_match.group(1)
sec_ementa = sec_ementa_match.group(1)
sec_considerandos = sec_considerandos_match.group(1)

# Now, reorder them and rename their header comments for clarity (optional, but good)
new_content = (
    sec_ementa.replace("SEÇÃO 3.6", "SEÇÃO 1") +
    sec_considerandos.replace("SEÇÃO 3.7", "SEÇÃO 2") +
    sec_acrescidos.replace("SEÇÃO 1", "SEÇÃO 3") +
    sec_nova_redacao.replace("SEÇÃO 2", "SEÇÃO 4") +
    sec_revogados.replace("SEÇÃO 3", "SEÇÃO 5") +
    sec_tabelas.replace("SEÇÃO 3.5", "SEÇÃO 6")
)

# Replace in original text
new_text = text[:start_idx] + new_content + text[end_idx:]

with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(new_text)

print("Reordered successfully!")
