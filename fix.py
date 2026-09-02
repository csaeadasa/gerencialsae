with open("src/components/ResolutionsDashboard.tsx", "r") as f:
    text = f.read()

fix_old = """                          <span className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit uppercase">{res.tipo}</span>
                        </div>
                      </td>"""

fix_new = """                          <span className="text-[10px] text-slate-400 font-semibold mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit uppercase">{res.tipo}</span>
                          </div>
                        </div>
                      </td>"""

if fix_old in text:
    text = text.replace(fix_old, fix_new)
    with open("src/components/ResolutionsDashboard.tsx", "w") as f:
        f.write(text)
    print("Fixed")
else:
    print("Fix failed")
