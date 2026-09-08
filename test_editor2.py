with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Repetir" in line:
        print(f"{i}: {line.strip()}")
