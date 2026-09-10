import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """    let maxNumber = 0;
    
    list.forEach(t => {
      const tMeio = t.meioParticipacao || "Consulta Pública";
      const isTargetType = isTS 
        ? (tMeio === "Tomada de Subsídios" || (t.numero && t.numero.trim().toUpperCase().startsWith("TS")))
        : (tMeio === "Consulta Pública" || (t.numero && t.numero.trim().toUpperCase().startsWith("CP")));
      
      if (isTargetType && t.numero) {"""

new_logic = """    let maxNumber = 0;
    
    list.forEach(t => {
      const isTargetType = isTS 
        ? (t.numero && t.numero.trim().toUpperCase().startsWith("TS"))
        : (t.numero && t.numero.trim().toUpperCase().startsWith("CP"));
      
      if (isTargetType && t.numero) {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched.")
else:
    print("Not found.")
