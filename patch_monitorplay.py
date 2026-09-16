import re
with open('src/components/ManagerialHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { \n  ArrowRight, \n  FolderKanban,',
    'import { \n  ArrowRight, \n  FolderKanban,\n  MonitorPlay, \n  Play,'
)
# Ensure Play is imported from lucide-react (used in modal)
if 'Play,' not in content:
  content = content.replace('  ArrowRight,', '  ArrowRight,\n  MonitorPlay,\n  Play,')

with open('src/components/ManagerialHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
