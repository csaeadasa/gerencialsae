with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

start = content.find("const articlesWithFinalText = currentArticles.filter")
print(content[start:start+1000])
