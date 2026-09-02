import re

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if "const mods = baseDemand.modifiers;" in line and "let totalPopAtendida = 0;" in out[-1]:
        out.append(line)
        out.append("        if (isEstimado) {\n")
        out.append("           wbSystems.forEach(sys => {\n")
        out.append("               totalDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);\n")
        out.append("           });\n")
        out.append("        } else {\n")
        out.append(lines[i+1])
        out.append(lines[i+2])
        out.append(lines[i+3])
        out.append(lines[i+4])
        out.append(lines[i+5])
        out.append(lines[i+6])
        out.append(lines[i+7])
        out.append(lines[i+8])
        out.append("        }\n")
        i += 9
        continue
    out.append(line)
    i += 1

with open("src/App.tsx", "w") as f:
    f.writelines(out)

print("Patched balanceAnalysisData!")
