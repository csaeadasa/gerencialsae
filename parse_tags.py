import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    text = f.read()

start = text.find('{editingTomada && (')
end = text.find('{pickerModalType && pickerModalIndex !== null && (')

sub_text = text[start:end]
lines = text[:start].count('\n')

stack = []
for m in re.finditer(r'<(/?[a-zA-Z0-9]+)[\s>]', sub_text):
    if sub_text[m.end()-2:m.end()] == '/>' or sub_text[m.start():m.start()+4] == '<!--':
        continue
    tag = m.group(1)
    # Check if it ends with /> inside the tag
    full_tag = re.match(r'<[^>]+>', sub_text[m.start():])
    if full_tag and full_tag.group(0).endswith('/>'):
        continue
        
    line_num = lines + sub_text[:m.start()].count('\n') + 1
    if tag.startswith('/'):
        if stack and stack[-1][0] == tag[1:]:
            stack.pop()
        else:
            print(f"Mismatched closing tag: {tag} at line {line_num}. Expected {stack[-1] if stack else 'None'}")
            break
    else:
        if tag not in ['input', 'img', 'br', 'hr', 'textarea']:
            stack.append((tag, line_num))
            
print("Remaining stack:", stack)
