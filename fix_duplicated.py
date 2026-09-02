with open("src/App.tsx", "r") as f:
    content = f.read()

target = """        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (activeWb?.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        } else {"""

replacement = """        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        } else {"""

if target in content:
    content = content.replace(target, replacement)
    print("Fixed duplicate block 1!")
else:
    print("Duplicate block 1 not found.")

target2 = """        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        if (isEstimado) {
           wbSystems.forEach(sys => {
               totalDem += (wb.systemDemands?.[`${sys.id}-${year}`] || 0);
           });
        } else {"""

if target2 in content:
    content = content.replace(target2, replacement)
    print("Fixed duplicate block 2!")

with open("src/App.tsx", "w") as f:
    f.write(content)
