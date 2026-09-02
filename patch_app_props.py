import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target1 = r"<FiscalizacaoPainel showToast=\{showToast\} currentUser=\{currentUser\} />"
target2 = r"<RecursoPainel showToast=\{showToast\} currentUser=\{currentUser\} />"

replacement1 = """<FiscalizacaoPainel tasks={tasks} plans={plans} onEditTaskClick={(id) => console.log('Edit', id)} />"""
replacement2 = """<RecursoPainel tasks={tasks} plans={plans} onEditTaskClick={(id) => console.log('Edit', id)} />"""

content = re.sub(target1, replacement1, content)
content = re.sub(target2, replacement2, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Props fixed")
