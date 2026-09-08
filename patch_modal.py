import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

# Substituir o conteudo da aba de edição para usar o mesmo padrão do formulário do Passo 2 (create_step2)
# Vamos extrair o corpo do loop map que renderiza o artigo no create_step2 e jogar na aba minuta do modal.

step2_start = content.find('{(previewArticles || []).map((art, i) => {')
step2_end = content.find('</div>\n          </div>\n\n          <div className="flex justify-between', step2_start)

if step2_start > -1 and step2_end > -1:
    print("Found step2 map")
    # Aqui a gente pegaria a div de renderização... 

