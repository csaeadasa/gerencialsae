with open("src/App.tsx", "r") as f:
    content = f.read()

import re

target_broken = """        } else {
        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (activeWb?.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        } else {
        baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
          const pop = entry.population * (1 + mods.population / 100);
          const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
        }
          const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
          const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
          totalDem += calculateDemand(pop, cov, cons, loss);
          totalPopAtendida += pop * cov;
        });
        }"""

replacement = """        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (activeWb?.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        } else {
           baseDemand.entries.filter(e => e.year === year && relevantRegions.includes(e.regionId)).forEach(entry => {
             const pop = entry.population * (1 + mods.population / 100);
             const cov = mods.coverage !== null ? mods.coverage / 100 : entry.coverage;
             const cons = entry.perCapitaConsumption * (1 + mods.perCapitaConsumption / 100);
             const loss = mods.losses !== null ? mods.losses / 100 : entry.losses;
             totalDem += calculateDemand(pop, cov, cons, loss);
             totalPopAtendida += pop * cov;
           });
        }"""

if target_broken in content:
    content = content.replace(target_broken, replacement)
    print("Fixed broken block 1!")
else:
    print("Block 1 not found")

with open("src/App.tsx", "w") as f:
    f.write(content)
