with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

bad_str = """                {dInfo.isAnnexOrDecimal ? <FolderTree size={12} className="text-teal-600" /> : <FileText size={12} className="text-indigo-600" />}
                {dInfo.label}"""

good_str = """                {dInfo.isAnnexOrDecimal ? <FolderTree size={12} className="text-teal-600" /> : <FileText size={12} className="text-indigo-600" />}
                {art.contentType === 'ementa' ? 'Ementa' : art.contentType === 'considerandos' ? 'Considerandos' : dInfo.label}"""

content = content.replace(bad_str, good_str)

with open('src/components/RegulatoryArticlesEditor.tsx', 'w') as f:
    f.write(content)
