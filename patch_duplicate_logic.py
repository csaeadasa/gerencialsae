import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """        .map(a => {
          return {
            ...a,
            id: crypto.randomUUID(),
            tomadaId: "",
            proposedText: duplicateMode === "final" && a.finalText ? a.finalText : a.proposedText,
            finalText: "", 
          };
        });"""

new_logic = """        .map(a => {
          let newProposedText = a.proposedText;
          
          if (duplicateMode === "proposed") {
             // "Minuta com Propostas Finais": o texto final vira o novo texto proposto
             newProposedText = a.finalText ? a.finalText : a.proposedText;
          } else if (duplicateMode === "final") {
             // "Minuta Original (Base)": mantém o texto proposto que já existia (foca na base)
             newProposedText = a.proposedText;
          }

          return {
            ...a,
            id: crypto.randomUUID(),
            tomadaId: "",
            proposedText: newProposedText,
            finalText: "", 
            contributions: [], 
          };
        });"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Logic patched.")
else:
    print("Could not find the exact code block. Trying regex.")
    
    # regex fallback
    fallback_pattern = re.compile(r'\.map\(a => \{\s*return \{\s*\.\.\.a,\s*id: crypto\.randomUUID\(\),\s*tomadaId: "",\s*proposedText: duplicateMode === "final" && a\.finalText \? a\.finalText : a\.proposedText,\s*finalText: "",\s*\};\s*\}\);', re.DOTALL)
    
    if fallback_pattern.search(content):
        content = fallback_pattern.sub(new_logic, content)
        with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("Logic patched using regex.")
    else:
        print("Still not found.")

