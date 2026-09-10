import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's remove whitespace-pre-wrap on the container since newlines in diff parts might be pushing things down
content = re.sub(r'whitespace-pre-wrap', r'whitespace-pre-line', content)

# But also check the span styling. We should make sure the elements are treated strictly as inline text.
content = re.sub(
    r'className="bg-emerald-100 text-emerald-950 font-bold px-1\.5 py-0\.5 rounded border border-emerald-300 shadow-2xs"',
    r'className="bg-emerald-100 text-emerald-950 font-bold rounded border border-emerald-300 shadow-2xs"',
    content
)

content = re.sub(
    r'className="bg-rose-100 text-rose-950 px-1 py-0\.5 rounded line-through decoration-rose-600/60 border border-rose-300 opacity-90"',
    r'className="bg-rose-100 text-rose-950 rounded line-through decoration-rose-600/60 border border-rose-300 opacity-90"',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched padding off spans")
