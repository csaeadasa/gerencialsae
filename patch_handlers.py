import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """  const updateActiveBalance = (updates: Partial<import('./types').WaterBalance>) => {"""

replacement = """  const handleUpdateSystemDemand = (systemId: number, year: number, value: number) => {
    if (!activeBalance) return;
    const currentSystemDemands = activeBalance.systemDemands || {};
    const key = `${systemId}-${year}`;
    updateActiveBalance({
      systemDemands: {
        ...currentSystemDemands,
        [key]: value
      }
    });
  };

  const updateActiveBalance = (updates: Partial<import('./types').WaterBalance>) => {"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched successfully!")
else:
    print("Target not found.")
