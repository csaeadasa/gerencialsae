with open("src/App.tsx", "r") as f:
    content = f.read()

target = """    selectedWbs.forEach(wb => {
      const bId = wb.id;
      
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));"""

replacement = """    selectedWbs.forEach(wb => {
      const bId = wb.id;
      const isEstimado = wb.tipoBalanco === 'Estimado';
      const wbDemands = demands.filter(s => isSameWb(s.waterBalanceId, bId));"""

if target in content:
    content = content.replace(target, replacement)
    print("Fixed isEstimado in analyzeBalanceAnalysisData!")
else:
    print("Target not found.")

with open("src/App.tsx", "w") as f:
    f.write(content)
