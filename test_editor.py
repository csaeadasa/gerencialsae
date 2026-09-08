with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

# Let's see the individual buttons
print(content.find('Repetir proposto'))
