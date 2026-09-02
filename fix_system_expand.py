with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                        onClick={() => {
                          if (!isEstimado) toggleExpand(`sys-${system.id}`);
                        }}"""

replacement = """                        onClick={() => toggleExpand(`sys-${system.id}`)}"""

if target in content:
    content = content.replace(target, replacement)

target2 = """                          {!isEstimado && (isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          ))}
                          {isEstimado && <span className="w-4" />}"""

replacement2 = """                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}"""

if target2 in content:
    content = content.replace(target2, replacement2)

with open("src/App.tsx", "w") as f:
    f.write(content)

print("Fixed system expand!")
