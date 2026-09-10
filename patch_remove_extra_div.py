with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# The extra div is right before m.group(2)
old_string = """                    </div>
                  )}
                </div>
              </div>
            </div>
              
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">"""

new_string = """                    </div>
                  )}
                </div>
              </div>
              
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl shrink-0">"""

if old_string in content:
    content = content.replace(old_string, new_string)
    with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed extra div!")
else:
    print("Could not find the extra div to remove.")
