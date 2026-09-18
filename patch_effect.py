with open('src/components/PlanningTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'const defaultStatusFilter = (activeSubTab === "dashboard" || activeSubTab === "painel") && !isMyTasksSelected\n    ? ["Não iniciada", "Em andamento", "Concluída"]\n    : ["Não iniciada", "Em andamento"];'

new_effect = '''
  useEffect(() => {
    setStatusFilter(defaultStatusFilter);
  }, [activeSubTab, isMyTasksSelected]);
'''

if target in content and 'useEffect(() => {\n    setStatusFilter(defaultStatusFilter);\n  }' not in content:
    content = content.replace(target, target + '\n' + new_effect)
    with open('src/components/PlanningTab.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
