import os

files = [
    'src/components/SubjectPickerModal.tsx',
    'src/components/TomadaSubsidiosTab.tsx',
    'src/types.ts'
]

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    content = content.replace("contentType?: 'text' | 'table';", "contentType?: 'text' | 'table' | 'ementa' | 'considerandos';")
    content = content.replace("contentType?: 'text' | 'table')", "contentType?: 'text' | 'table' | 'ementa' | 'considerandos')")
    
    with open(file, 'w') as f:
        f.write(content)
