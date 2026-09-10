import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_modal = 'className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"'
new_modal = 'className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"'
content = content.replace(old_modal, new_modal)

old_text_proposed = 'Copia os artigos considerando as modificações propostas consolidadas (ideal para a nova fase).'
new_text_proposed = 'Copia os artigos considerando as modificações consolidadas. O "Texto Final do Dispositivo" (pós-análise técnica) desta rodada se transformará no novo "Texto Proposto em Consulta (Minuta)" da nova rodada. Ideal para dar continuidade.'
content = content.replace(old_text_proposed, new_text_proposed)

old_text_final = 'Copia os artigos exatamente como estavam na minuta original, ignorando as propostas feitas.'
new_text_final = 'Copia os artigos exatamente como estavam na minuta original (Textos Atuais e Textos Propostos iniciais). Nenhuma contribuição ou texto final aprovado nesta rodada será levado para a nova cópia.'
content = content.replace(old_text_final, new_text_final)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch duplicate modal python script finished")
