import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """    const bId = analyzeBalanceId;
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return {};

    const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId) && (analyzeSystemIds.length === 0 || analyzeSystemIds.includes(s.id)));

    const result: Record<number, any[]> = {};

    analyzeBalanceAvailableYears.forEach(year => {
      const yearResults = wbSystems.map(sys => {
        let totalDem = 0;
        let totalDemHab = 0;
        const relevantRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId) && r.systemId === sys.id).map(r => r.id);
        
        const mods = baseDemand.modifiers;
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          totalDem += calculateDemand(pop, cov, cons, loss);
          totalDemHab += pop * cov;
        });"""

replacement = """    const bId = analyzeBalanceId;
    const activeWb = waterBalances.find(wb => wb.id === bId);
    const isEstimado = activeWb?.tipoBalanco === 'Estimado';
    const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
    const baseDemand = wbDemands[0];
    if (!baseDemand) return {};

    const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId) && (analyzeSystemIds.length === 0 || analyzeSystemIds.includes(s.id)));

    const result: Record<number, any[]> = {};

    analyzeBalanceAvailableYears.forEach(year => {
      const yearResults = wbSystems.map(sys => {
        let totalDem = 0;
        let totalDemHab = 0;
        const relevantRegions = regions.filter(r => isSameWb(r.waterBalanceId, bId) && r.systemId === sys.id).map(r => r.id);
        
        const mods = baseDemand.modifiers;
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          
          if (!isEstimado) {
            totalDem += calculateDemand(pop, cov, cons, loss);
          }
          totalDemHab += pop * cov;
        });

        if (isEstimado) {
          totalDem = activeWb?.systemDemands?.[`${sys.id}-${year}`] || 0;
        }"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched analyze charts!")
else:
    print("Target not found.")

