with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                                onClick={() => {
                                  if (!isEstimado) toggleExpand(`year-${year}-sys-${system.id}`)
                                }}
                                }
                              >"""

replacement = """                                onClick={() => {
                                  if (!isEstimado) toggleExpand(`year-${year}-sys-${system.id}`)
                                }}
                              >"""

if target in content:
    content = content.replace(target, replacement)
    print("Fixed extra brace!")
else:
    print("Extra brace not found.")

with open("src/App.tsx", "w") as f:
    f.write(content)
