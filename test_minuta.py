with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

import re
matches = re.finditer(r'const defaultEmenta', content)
for m in matches:
    print(m.start())
