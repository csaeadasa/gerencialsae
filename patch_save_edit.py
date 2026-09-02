with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_block = """      const res = await fetch(`/api/reg/participations/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          anexos: editAnexos
        })
      });"""

new_block = """      const res = await fetch(`/api/reg/participations/${editFormData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          anexos: editAnexos.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category || "Documentos preliminares",
            url: a.file ? URL.createObjectURL(a.file) : a.url
          }))
        })
      });"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
        f.write(text)
    print("Success replacing block 4")
else:
    print("Failed to find block 4")
