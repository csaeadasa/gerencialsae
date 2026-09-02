import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = r"""            </RequirePermission>
          \) : activeTab === "gerencial" \? \("""

replacement = """            </RequirePermission>
          ) : activeTab === "fisc_operational" ? (
            <RequirePermission moduleId="fisc_operational" action="view" fallback={<div className="p-8 text-center text-slate-500">Acesso negado.</div>}>
            <motion.div
              key="fisc_operational"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <FiscalizacaoPainel showToast={showToast} currentUser={currentUser} />
            </motion.div>
            </RequirePermission>
          ) : activeTab === "recurso_painel" ? (
            <RequirePermission moduleId="recurso_painel" action="view" fallback={<div className="p-8 text-center text-slate-500">Acesso negado.</div>}>
            <motion.div
              key="recurso_painel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <RecursoPainel showToast={showToast} currentUser={currentUser} />
            </motion.div>
            </RequirePermission>
          ) : activeTab === "gerencial" ? ("""

content = re.sub(target, replacement, content, count=1)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Tabs added")
