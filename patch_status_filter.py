import re

with open('src/components/PlanningTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add defaultStatusFilter right before the states
target_state = '  const [isDashboardFiltersExpanded, setIsDashboardFiltersExpanded] = useState(false);'
if target_state in content and 'const defaultStatusFilter' not in content:
    replacement_state = '''  const defaultStatusFilter = (activeSubTab === "dashboard" || activeSubTab === "painel") && !isMyTasksSelected
    ? ["Não iniciada", "Em andamento", "Concluída"]
    : ["Não iniciada", "Em andamento"];

  const [isDashboardFiltersExpanded, setIsDashboardFiltersExpanded] = useState(false);'''
    content = content.replace(target_state, replacement_state)

# 2. Change the initialization
content = content.replace(
    '  const [statusFilter, setStatusFilter] = useState<string[]>(["Não iniciada", "Em andamento"]);',
    '  const [statusFilter, setStatusFilter] = useState<string[]>(defaultStatusFilter);'
)

# 3. Change all occurrences of setStatusFilter(["Não iniciada", "Em andamento"]);
content = content.replace(
    'setStatusFilter(["Não iniciada", "Em andamento"]);',
    'setStatusFilter(defaultStatusFilter);'
)

# 4. Change isStatusFiltered inside useMemo
content = content.replace(
    'const isStatusFiltered = !(statusFilter.length === 2 && statusFilter.includes("Não iniciada") && statusFilter.includes("Em andamento")) && statusFilter.length !== 3;',
    'const isStatusFiltered = statusFilter.length !== defaultStatusFilter.length || !defaultStatusFilter.every(s => statusFilter.includes(s));'
)

# 5. Change the clear filters button conditions
# we have expressions like: statusFilter.length !== 2 || !statusFilter.includes("Não iniciada") || !statusFilter.includes("Em andamento")
# we can replace that with: (statusFilter.length !== defaultStatusFilter.length || !defaultStatusFilter.every(s => statusFilter.includes(s)))
pattern = r'statusFilter\.length !== 2 \|\| !statusFilter\.includes\("Não iniciada"\) \|\| !statusFilter\.includes\("Em andamento"\)'
replacement = r'(statusFilter.length !== defaultStatusFilter.length || !defaultStatusFilter.every(s => statusFilter.includes(s)))'
content = re.sub(pattern, replacement, content)

with open('src/components/PlanningTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
