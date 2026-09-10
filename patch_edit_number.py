import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_onchange = """onChange={(e) => setEditFormData({ ...editFormData, meioParticipacao: e.target.value })}"""

new_onchange = """onChange={(e) => {
                          const newMeio = e.target.value;
                          const newNumero = getNextSequentialNumber(newMeio, tomadas);
                          setEditFormData({ ...editFormData, meioParticipacao: newMeio, numero: newNumero });
                        }}"""

if old_onchange in content:
    # Need to make sure we replace the one in the edit modal, not create modal.
    # Actually, in create modal (formData), it is likely setFormData({...})
    content = content.replace(old_onchange, new_onchange)
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find exact string.")
