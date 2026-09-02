with open("src/components/TomadaSubsidiosTab.tsx", "r") as f:
    text = f.read()

old_block = """    const anexosMapped = formData.anexos.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      url: URL.createObjectURL(f)
    }));"""

new_block = """    const anexosMapped = formData.anexos.map(a => ({
      id: crypto.randomUUID(),
      name: a.name || (a.file ? a.file.name : "Documento"),
      category: a.category || "Documentos preliminares",
      url: a.file ? URL.createObjectURL(a.file) : (a.url || "")
    }));"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open("src/components/TomadaSubsidiosTab.tsx", "w") as f:
        f.write(text)
    print("Success replacing block 2")
else:
    print("Failed to find block 2")
