import re

with open("src/lib/auth.tsx", "r", encoding="utf-8") as f:
    content = f.read()

replacement = """  const checkPermission = (moduleId: ModuleId, action: ActionType): boolean => {
    // Modo de apresentação público (TV) permite visualizar painéis sem login
    const isTvMode = typeof window !== 'undefined' && window.location.search.includes('modo=tv');
    if (isTvMode && action === 'view') {
      return true;
    }

    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;"""

content = content.replace("""  const checkPermission = (moduleId: ModuleId, action: ActionType): boolean => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.roleId);
    if (!role) return false;""", replacement)

with open("src/lib/auth.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
