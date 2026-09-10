import re

with open("src/components/RegulatoryArticlesEditor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'art\.proposedText \|\| art\.originalText',
    r'(art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText)',
    content
)

with open("src/components/RegulatoryArticlesEditor.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch editor fallbacks python script finished")
