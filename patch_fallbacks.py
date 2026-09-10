import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# For `art.proposedText || art.originalText`
content = re.sub(
    r'art\.proposedText \|\| art\.originalText',
    r'(art.proposedText !== undefined && art.proposedText !== null ? art.proposedText : art.originalText)',
    content
)

# Also check for originalArticle?.proposedText || originalArticle?.originalText
content = re.sub(
    r'originalArticle\?\.proposedText \|\| originalArticle\?\.originalText',
    r'(originalArticle?.proposedText !== undefined && originalArticle?.proposedText !== null ? originalArticle.proposedText : originalArticle?.originalText)',
    content
)

# And `article.proposedText || article.originalText`
content = re.sub(
    r'article\.proposedText \|\| article\.originalText',
    r'(article.proposedText !== undefined && article.proposedText !== null ? article.proposedText : article.originalText)',
    content
)

# And `c.proposedText || originalText` ? Actually, if a citizen's proposedText is "", they usually have `isSuppressing` flag. But we can fix it too.
content = re.sub(
    r'c\.proposedText \|\| originalText',
    r'(c.proposedText !== undefined && c.proposedText !== null ? c.proposedText : originalText)',
    content
)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch fallbacks python script finished")
