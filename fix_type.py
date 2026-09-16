import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

interface_insertion = """
interface PresentationConfig {
  isActive: boolean;
  intervalSeconds: number;
  panels: string[];
}
"""

if "interface PresentationConfig" not in content:
    pattern = r'(interface AppProps \{)'
    # If not found, just put it before App function
    if re.search(pattern, content):
        content = re.sub(pattern, lambda m: interface_insertion.lstrip() + "\n" + m.group(1), content, count=1)
    else:
        pattern = r'(function App\(\) \{)'
        content = re.sub(pattern, lambda m: interface_insertion.lstrip() + "\n" + m.group(1), content, count=1)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
