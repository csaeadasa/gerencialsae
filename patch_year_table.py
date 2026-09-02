import re

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if "const sysPop = sysResults.reduce(" in line and "year-" in lines[i+10]:
        out.append("                          const isEstimado = activeBalance?.tipoBalanco === 'Estimado';\n")
        out.append("                          const sysPop = isEstimado ? 0 : sysResults.reduce(\n")
        out.append("                            (sum, r) => sum + r.population,\n")
        out.append("                            0,\n")
        out.append("                          );\n")
        out.append("                          const sysDemand = isEstimado ? (activeBalance?.systemDemands?.[`${system.id}-${year}`] || 0) : sysResults.reduce(\n")
        out.append("                            (sum, r) => sum + r.projectedDemand,\n")
        out.append("                            0,\n")
        out.append("                          );\n")
        
        i += 9
        continue
    if "onClick={() =>" in line and "toggleExpand(`year-${year}-sys-${system.id}`)" in lines[i+1]:
        out.append("                                onClick={() => {\n")
        out.append("                                  if (!isEstimado) toggleExpand(`year-${year}-sys-${system.id}`)\n")
        out.append("                                }}\n")
        i += 2
        continue
    if "{isExpanded ? (" in line and "ChevronDown" in lines[i+1]:
        out.append("                                    {!isEstimado && (isExpanded ? (\n")
        out.append(lines[i+1])
        out.append(lines[i+2])
        out.append(lines[i+3])
        out.append(lines[i+4])
        out.append(lines[i+5])
        out.append(lines[i+6])
        out.append(lines[i+7])
        out.append(lines[i+8])
        out.append("                                    ))}\n")
        out.append("                                    {isEstimado && <span className=\"w-3\" />}\n")
        i += 8
        continue
    if "<span className=\"text-[11px] font-bold text-slate-500\">" in line and "{formatInteger(sysPop)}" in lines[i+1]:
        out.append("                                  {!isEstimado && (\n")
        out.append(line)
        out.append(lines[i+1])
        out.append(lines[i+2])
        out.append("                                  )}\n")
        i += 2
        continue
    if "<span className=\"font-black text-xs text-adasa-dark tracking-tighter\">" in line and "{formatNumber(sysDemand)}" in lines[i+1]:
        out.append("                                  {isEstimado ? (\n")
        out.append("                                    <input\n")
        out.append("                                      type=\"number\"\n")
        out.append("                                      className=\"w-24 text-right bg-transparent border-b border-slate-300 focus:border-adasa-mid focus:ring-0 text-xs font-black text-adasa-dark p-0 outline-none\"\n")
        out.append("                                      value={activeBalance?.systemDemands?.[`${system.id}-${year}`] || \"\"}\n")
        out.append("                                      placeholder=\"0\"\n")
        out.append("                                      onChange={(e) => handleUpdateSystemDemand(system.id, year, parseFloat(e.target.value) || 0)}\n")
        out.append("                                      onClick={(e) => e.stopPropagation()}\n")
        out.append("                                    />\n")
        out.append("                                  ) : (\n")
        out.append(line)
        out.append(lines[i+1])
        out.append(lines[i+2])
        out.append("                                  )}\n")
        i += 2
        continue
    if "{isExpanded &&" in line and "sysResults.map((entry) => {" in lines[i+1]:
        out.append("                              {isExpanded && !isEstimado &&\n")
        out.append(lines[i+1])
        i += 1
        continue
    out.append(line)
    i += 1

with open("src/App.tsx", "w") as f:
    f.writelines(out)

print("Patched using script!")
