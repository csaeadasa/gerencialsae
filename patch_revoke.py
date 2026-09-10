import re

with open("src/components/RegulatoryArticlesEditor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_textarea = """                  <textarea 
                    className="w-full bg-white border border-indigo-200 rounded-lg p-3 resize-y focus:ring-2 focus:ring-indigo-600 text-sm font-medium text-slate-800 whitespace-pre-wrap outline-none"
                    value={art.proposedText !== undefined ? art.proposedText : art.originalText}
                    onChange={e => {
                      const newArts = [...articles];
                      newArts[i].proposedText = e.target.value;
                      setArticles(newArts);
                    }}
                    rows={Math.max(12, (art.proposedText || art.originalText || "").split("\\n").length)}
                  />"""

new_textarea = """                  <textarea 
                    className="w-full bg-white border border-indigo-200 rounded-lg p-3 resize-y focus:ring-2 focus:ring-indigo-600 text-sm font-medium text-slate-800 whitespace-pre-wrap outline-none"
                    value={art.proposedText !== undefined ? art.proposedText : art.originalText}
                    onChange={e => {
                      const newArts = [...articles];
                      newArts[i].proposedText = e.target.value;
                      setArticles(newArts);
                    }}
                    rows={Math.max(12, (art.proposedText || art.originalText || "").split("\\n").length)}
                    disabled={art.proposedText === ""}
                  />
                  {isAlteracao && (
                    <div className="flex items-center gap-2 mt-2 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                      <input
                        type="checkbox"
                        id={`revoke-${i}`}
                        checked={art.proposedText === ""}
                        onChange={(e) => {
                          const newArts = [...articles];
                          if (e.target.checked) {
                            newArts[i].proposedText = "";
                          } else {
                            newArts[i].proposedText = art.originalText || "";
                          }
                          setArticles(newArts);
                        }}
                        className="w-3.5 h-3.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor={`revoke-${i}`} className="text-[10px] font-bold text-rose-700 uppercase tracking-wider cursor-pointer select-none">
                        Propor revogação / exclusão deste dispositivo
                      </label>
                    </div>
                  )}"""

if "Propor revogação" not in content:
    content = content.replace(old_textarea, new_textarea)

with open("src/components/RegulatoryArticlesEditor.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch revoke checkbox python script finished")
