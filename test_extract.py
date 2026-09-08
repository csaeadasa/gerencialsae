with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

start_idx = content.find("editArticles.map((art, idx) => (", 150000)
end_idx = content.find(")}\n                  </div>\n                )}\n              {editModalTab === \"anexos\" && (", start_idx)
print(end_idx)
