import re

with open("src/App.tsx", "r") as f:
    content = f.read()

target = """) : activeTab === "pub_painel" ? (
            <RequirePermission moduleId="pub_painel" action="view" fallback={<div className="p-8 text-center text-white/50">Acesso negado.</div>}>
            <motion.div
              key="pub_painel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <PublicationsModule view="painel" showToast={showToast} />
            </motion.div>
            </RequirePermission>
          ) : null}"""

replacement = """) : activeTab === "pub_painel" ? (
            <RequirePermission moduleId="pub_painel" action="view" fallback={<div className="p-8 text-center text-slate-500">Acesso negado.</div>}>
            <motion.div
              key="pub_painel"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <PublicationsModule view="painel" showToast={showToast} />
            </motion.div>
            </RequirePermission>
          ) : activeTab === "gerencial" ? (
            <motion.div
              key="gerencial"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <ManagerialHub 
                onOpenPlanning={() => handleTabChange("planning")}
                onOpenResolutions={() => handleTabChange("reg_painel")}
                onOpenWaterBalance={() => handleTabChange("analyze")}
                onOpenPublications={() => handleTabChange("pub_painel")}
                onOpenRegulatoryAgenda={() => handleTabChange("reg_agenda_painel")}
                onOpenParticipacaoSocialPainel={() => handleTabChange("reg_subsidios_painel")}
                isPublic={false}
                showOnlyPublic={false}
                showToast={showToast}
              />
            </motion.div>
          ) : activeTab === "public_hub" ? (
            <motion.div
              key="public_hub"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              <ManagerialHub 
                onOpenPlanning={() => handleTabChange("planning")}
                onOpenResolutions={() => handleTabChange("reg_painel")}
                onOpenWaterBalance={() => handleTabChange("analyze")}
                onOpenPublications={() => handleTabChange("pub_painel")}
                onOpenRegulatoryAgenda={() => handleTabChange("reg_agenda_painel")}
                onOpenParticipacaoSocialPainel={() => handleTabChange("reg_subsidios_painel")}
                isPublic={false}
                showOnlyPublic={true}
                showToast={showToast}
              />
            </motion.div>
          ) : null}"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/App.tsx", "w") as f:
        f.write(content)
    print("Patched successfully!")
else:
    print("Target not found. Let's look closer.")

