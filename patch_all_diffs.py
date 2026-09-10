import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace any span that uses bg-emerald-100 specifically around part.value when added.
# To be safe, we will just use re.sub on the specific class strings that are used for diff highlighting.

# Find all diff highlight classes for added
content = re.sub(
    r'className="bg-emerald-100 text-emerald-950 font-bold px-[^"]+"',
    r'className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words"',
    content
)

content = re.sub(
    r'className="text-emerald-950 font-bold bg-emerald-100 border border-emerald-300 px-[^"]+"',
    r'className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words"',
    content
)

# Find all diff highlight classes for removed
content = re.sub(
    r'className="bg-rose-100 text-rose-950 px-[^"]*line-through[^"]+"',
    r'className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words"',
    content
)

content = re.sub(
    r'className="text-rose-950 px-[^"]*line-through[^"]+"',
    r'className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words"',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch all diffs python script finished")
