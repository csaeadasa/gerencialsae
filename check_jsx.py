import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    text = f.read()

start_idx = text.find('{editingTomada && (')
if start_idx == -1:
    print("Not found editingTomada")
else:
    print("Found editingTomada at", start_idx)
    stack = []
    i = start_idx
    while i < len(text):
        if text[i] == '{': stack.append('{')
        elif text[i] == '}':
            if stack and stack[-1] == '{': stack.pop()
        elif text[i:i+2] == '<d':
            if text[i:i+4] == '<div': stack.append('div')
        elif text[i:i+5] == '</div':
            if stack and stack[-1] == 'div': stack.pop()
        elif text[i:i+2] == '<p':
            if text[i:i+3] == '<p ': stack.append('p')
            elif text[i:i+3] == '<p>': stack.append('p')
        elif text[i:i+4] == '</p>':
            if stack and stack[-1] == 'p': stack.pop()
        # Just rough parsing...
        i += 1

