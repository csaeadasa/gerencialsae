import re

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if "const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));" in line and "selectedWbs.forEach(wb => {" in out[-2]:
        out.append("      const isEstimado = wb.tipoBalanco === 'Estimado';\n")
        out.append(line)
        i += 1
        continue
    if "const mods = baseDemand.modifiers;" in line and "selectedWbs.forEach(wb => {" in "".join(out[-20:]):
        out.append("      if (isEstimado) {\n")
        out.append("        years.forEach(year => {\n")
        out.append("           if (!dataByYear[year]) dataByYear[year] = { year: year };\n")
        out.append("           const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId));\n")
        out.append("           let yearDem = 0;\n")
        out.append("           wbSystems.forEach(sys => {\n")
        out.append("               yearDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);\n")
        out.append("           });\n")
        out.append("           dataByYear[year][`Demanda - ${wb.description}`] = yearDem;\n")
        out.append("        });\n")
        out.append("      } else {\n")
        out.append(line)
        out.append(lines[i+1])
        out.append(lines[i+2])
        out.append(lines[i+3])
        out.append(lines[i+4])
        out.append(lines[i+5])
        out.append(lines[i+6])
        out.append(lines[i+7])
        out.append(lines[i+8])
        out.append(lines[i+9])
        out.append("      }\n")
        i += 10
        continue
    out.append(line)
    i += 1

with open("src/App.tsx", "w") as f:
    f.writelines(out)

print("Patched compare charts via script!")
