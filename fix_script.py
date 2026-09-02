with open("src/App.tsx", "r") as f:
    lines = f.readlines()

out = []
i = 0
in_system_layout = False
while i < len(lines):
    line = lines[i]
    if 'tableLayout === "system"' in line:
        in_system_layout = True
    if 'tableLayout === "year"' in line:
        in_system_layout = False
    
    if in_system_layout:
        if "const isExpanded =" in line and "expandedGroups[`sys-${system.id}`] !== false;" in lines[i+1]:
            out.append("                  const isEstimado = activeBalance?.tipoBalanco === 'Estimado';\n")
            out.append(line)
            out.append(lines[i+1])
            i += 1
        elif "onClick={() => toggleExpand(`sys-${system.id}`)}" in line:
            out.append("                        onClick={() => {\n")
            out.append("                          if (!isEstimado) toggleExpand(`sys-${system.id}`);\n")
            out.append("                        }}\n")
        elif "{!isEstimado && (isExpanded ? (" in line:
            out.append("                          {!isEstimado && (isExpanded ? (\n")
            out.append("                            <ChevronDown size={14} />\n")
            out.append("                          ) : (\n")
            out.append("                            <ChevronRight size={14} />\n")
            out.append("                          ))}\n")
            out.append("                          {isEstimado && <span className=\"w-4\" />}\n")
            i += 4
        elif "{isExpanded &&" in line and "))} " in lines[i+1]:
            i += 2 # skip the broken injected lines
            continue
        elif "Array.from(" in line and "new Set(systemResults.map((r) => r.regionId))," in lines[i+1]:
            # This is the `{isExpanded && Array.from(` line actually
            if out[-1].strip() == "{isExpanded &&":
                out[-1] = "                      {isExpanded && !isEstimado &&\n"
            out.append(line)
        else:
            out.append(line)
    else:
        out.append(line)
    i += 1

with open("src/App.tsx", "w") as f:
    f.writelines(out)

print("Fixed!")
