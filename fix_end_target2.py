import re
with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace exactly this:
#                  )}
#                </div>
#              </div>
#            </div>
#              
#            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">

# With:
#                  )}
#                </div>
#              </div>
#              )}
#            </div>
#              
#            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">

old_block = """                  )}
                </div>
              </div>
            </div>
              
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">"""

new_block = """                  )}
                </div>
              </div>
              )}
            </div>
              
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed!")
else:
    print("Not found... checking regex")
    content = re.sub(
        r'(\}\s*</div>\s*</div>)\s*</div>(\s*<div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">)',
        r'\1\n              )}\n            </div>\2',
        content
    )
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed by regex!")
