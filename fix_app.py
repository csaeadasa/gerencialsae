import re
with open("src/App.tsx", "r") as f:
    content = f.read()

target1 = r"""                              description: `Novo Balanço Hídrico`,
                              etapa: "Criado","""
replacement1 = """                              description: `Novo Balanço Hídrico`,
                              responsible: userName,
                              etapa: "Criado","""

target2 = r"""                                          description: `Novo Balanço - \$\{group.name\}`,
                                          category: group.name,
                                          etapa: "Criado","""
replacement2 = """                                          description: `Novo Balanço - ${group.name}`,
                                          responsible: userName,
                                          category: group.name,
                                          etapa: "Criado","""

target3 = r"""                                              description: `Novo Balanço - \$\{group.name\}`,
                                              category: group.name,
                                              etapa: "Criado","""
replacement3 = """                                              description: `Novo Balanço - ${group.name}`,
                                              responsible: userName,
                                              category: group.name,
                                              etapa: "Criado","""

content = re.sub(target1, replacement1, content)
content = re.sub(target2, replacement2, content)
content = re.sub(target3, replacement3, content)

with open("src/App.tsx", "w") as f:
    f.write(content)
print("Updated App.tsx")
