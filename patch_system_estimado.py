with open("src/App.tsx", "r") as f:
    content = f.read()

target = """                      {isExpanded && !isEstimado &&
                        Array.from(
                          new Set(systemResults.map((r) => r.regionId)),"""

replacement = """                      {isExpanded && isEstimado && (
                        Array.from(new Set(systemResults.map(r => r.year)))
                          .sort((a, b) => a - b)
                          .map(year => (
                            <tr
                              key={`${system.id}-${year}`}
                              className="hover:bg-adasa-light/10 transition-colors group"
                            >
                              <td className="px-3 py-2">
                                <p className="font-bold text-slate-400 tracking-tight text-[10px] uppercase pl-8 border-l-2 border-slate-200">
                                  Ano: {year}
                                </p>
                              </td>
                              <td className="px-3 py-1.5 text-right">-</td>
                              <td className="px-3 py-1.5 text-right">-</td>
                              <td className="px-3 py-1.5 text-right">-</td>
                              <td className="px-3 py-1.5 text-right">-</td>
                              <td className="px-5 py-2 text-right">
                                <input
                                  type="number"
                                  className="w-24 text-right bg-transparent border-b border-slate-300 focus:border-adasa-mid focus:ring-0 text-xs font-black text-adasa-dark p-0 outline-none"
                                  value={activeBalance?.systemDemands?.[`${system.id}-${year}`] || ""}
                                  placeholder="0"
                                  onChange={(e) => handleUpdateSystemDemand(system.id, year, parseFloat(e.target.value) || 0)}
                                />
                              </td>
                            </tr>
                          ))
                      )}
                      {isExpanded && !isEstimado &&
                        Array.from(
                          new Set(systemResults.map((r) => r.regionId)),"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched system layout for Estimado!")
else:
    print("Target not found.")

