import re

with open("src/components/RegulatoryArticlesEditor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'value=\{art\.proposedText !== undefined \? art\.proposedText : art\.originalText\}',
    r'value={art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : (art.originalText || "")}',
    content
)

with open("src/components/RegulatoryArticlesEditor.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch textarea script finished")
