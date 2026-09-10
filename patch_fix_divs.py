with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# find the offending lines
for i, line in enumerate(lines):
    if "Nenhum dispositivo encontrado nesta minuta" in line:
        start_idx = i
        break

# The structure is:
# 9608                      Nenhum dispositivo encontrado nesta minuta.
# 9609                    </div>
# 9610                  )}
# 9611                </div>
# 9612              </div>
# 9613            </div>
# 9614
# 9615            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">

# At 9613, it closes the modal body. We want it to be inside the modal body, so the modal body should only close ONCE before the footer.
# Wait, in the original:
#   <div className="p-5 flex-1 ...">
#      ...
#   </div>
#   <div className="p-4 border-t ...">

# So we want:
#   <div className="p-5 flex-1 ...">
#      <div className="pt-2">
#         ...
#      </div>
#   </div>
#   <div className="p-4 border-t ...">

# Let's just fix it by replacing the bad div closures.
