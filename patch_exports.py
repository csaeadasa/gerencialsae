import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the HTML export for added
content = re.sub(
    r'<span style="background-color: #d1fae5; color: #064e3b; font-weight: bold; padding: 1px 4px; border-radius: 3px; border: 1px solid #6ee7b7; margin: 0 1px;">',
    r'<span style="color: #047857; font-weight: 600; text-decoration: underline; text-decoration-color: rgba(16, 185, 129, 0.5); text-decoration-thickness: 2px;">',
    content
)

# Fix the HTML export for removed
content = re.sub(
    r'<span style="background-color: #ffe4e6; color: #4c0519; padding: 1px 4px; border-radius: 3px; margin: 0 1px; text-decoration: line-through; text-decoration-color: #e11d48; border: 1px solid #fda4af;">',
    r'<span style="color: rgba(244, 63, 94, 0.8); font-weight: 500; text-decoration: line-through; text-decoration-color: rgba(244, 63, 94, 0.8);">',
    content
)

# Fix the stray bg-emerald-100/50
content = re.sub(
    r'className="text-emerald-700 font-bold bg-emerald-100/50"',
    r'className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words"',
    content
)
content = re.sub(
    r'className="text-rose-700 font-bold bg-rose-100/50 line-through decoration-rose-500"',
    r'className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words"',
    content
)

# Fix the stray text-emerald-600 font-bold
content = re.sub(
    r'className="text-emerald-600 font-bold"',
    r'className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2 break-words"',
    content
)
content = re.sub(
    r'className="text-rose-600 line-through decoration-rose-500"',
    r'className="text-rose-500/80 line-through decoration-rose-500/80 font-medium break-words"',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch exports python script finished")
