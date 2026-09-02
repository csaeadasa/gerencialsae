import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];
      if (!baseDemand) return;
      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));
      
      const mods = baseDemand.modifiers;
      baseDemand.entries.forEach(entry => {
        if (!dataByYear[entry.year]) dataByYear[entry.year] = { year: entry.year };
        const pop = entry.population * (1 + mods.population / 100);
        const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
        const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
        const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
        const dem = calculateDemand(pop, cov, cons, loss);
        dataByYear[entry.year][`Demanda - ${wb.description}`] = (dataByYear[entry.year][`Demanda - ${wb.description}`] || 0) + dem;
      });
    });"""

replacement = """    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const isEstimado = wb.tipoBalanco === 'Estimado';
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));
      const baseDemand = wbDemands[0];
      if (!baseDemand) return;
      const years = Array.from<number>(new Set<number>(baseDemand.entries.map(e => e.year))).sort((a: number, b: number) => a - b);
      years.forEach(y => globalYears.add(y));
      
      if (isEstimado) {
        years.forEach(year => {
           if (!dataByYear[year]) dataByYear[year] = { year: year };
           const wbSystems = systems.filter(s => isSameWb(s.waterBalanceId, bId));
           let yearDem = 0;
           wbSystems.forEach(sys => {
               yearDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
           dataByYear[year][`Demanda - ${wb.description}`] = yearDem;
        });
      } else {
        const mods = baseDemand.modifiers;
        baseDemand.entries.forEach(entry => {
          if (!dataByYear[entry.year]) dataByYear[entry.year] = { year: entry.year };
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          const dem = calculateDemand(pop, cov, cons, loss);
          dataByYear[entry.year][`Demanda - ${wb.description}`] = (dataByYear[entry.year][`Demanda - ${wb.description}`] || 0) + dem;
        });
      }
    });"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched compare charts!")
else:
    print("Target not found for compare charts.")
