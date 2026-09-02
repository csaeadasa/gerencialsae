with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                      {isExpanded &&
                                    ))}
                                    {isEstimado && <span className="w-3" />}"""

replacement = """"""

if target in content:
    content = content.replace(target, replacement)
    print("Fixed garbage!")
else:
    print("Garbage not found.")

with open("src/App.tsx", "w") as f:
    f.write(content)
