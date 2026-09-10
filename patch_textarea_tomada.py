import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace `value={art.proposedText !== undefined ? art.proposedText : art.originalText}`
content = re.sub(
    r'value=\{art\.proposedText !== undefined \? art\.proposedText : art\.originalText\}',
    r'value={art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : (art.originalText || "")}',
    content
)

# Replace `value={c.proposedText !== undefined && c.proposedText !== null ? c.proposedText : originalText}`
content = re.sub(
    r'value=\{c\.proposedText !== undefined && c\.proposedText !== null \? c\.proposedText : originalText\}',
    r'value={c.proposedText !== undefined && c.proposedText !== null ? c.proposedText : (originalText || "")}',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch textarea tomada script finished")
