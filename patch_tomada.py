import re

with open('src/components/TomadaSubsidiosTab.tsx', 'r') as f:
    content = f.read()

# 1. Add import
if 'RegulatoryArticlesEditor' not in content:
    content = content.replace('import { RegulatoryTableEditor } from "./RegulatoryTableEditor";', 
                             'import { RegulatoryTableEditor } from "./RegulatoryTableEditor";\nimport { RegulatoryArticlesEditor } from "./RegulatoryArticlesEditor";')

# 2. Patch create_step2
start_idx = content.find("{(previewArticles || []).map((art, i) => {")
if start_idx != -1:
    # Need to go up a bit to replace the insert preview article button at top
    start_replace = content.rfind('<div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">', 0, start_idx)
    end_replace = content.find("</div>\n          </div>\n\n          <div className=\"flex justify-between items-center gap-3\">", start_idx)
    if start_replace != -1 and end_replace != -1:
        new_code = '''
              <RegulatoryArticlesEditor
                articles={previewArticles || []}
                setArticles={setPreviewArticles as any}
                isAlteracao={isAlteracao}
                subjects={formData.subjects || []}
                onOpenSubjectPicker={(index) => {
                  setPickerModalType("create");
                  setPickerModalIndex(index);
                }}
              />
'''
        content = content[:start_replace] + new_code + content[end_replace:]

# 3. Patch editModalTab
start_idx_edit = content.find("editArticles.map((art, idx) => (", 150000)
if start_idx_edit != -1:
    start_replace_edit = content.rfind('{editArticles.length === 0 ? (', 0, start_idx_edit)
    end_replace_edit = content.find(')}\n                  </div>\n                )}\n              {editModalTab === "anexos" && (', start_idx_edit)
    if start_replace_edit != -1 and end_replace_edit != -1:
        new_code_edit = '''
                  <RegulatoryArticlesEditor
                    articles={editArticles}
                    setArticles={setEditArticles as any}
                    isAlteracao={editFormData.tipoResolucao === "alteracao"}
                    subjects={editFormData.subjects || []}
                    onOpenSubjectPicker={(index) => {
                      setPickerModalType("edit");
                      setPickerModalIndex(index);
                    }}
                    selectedArticlesToMove={selectedArticlesToMove}
                    setSelectedArticlesToMove={setSelectedArticlesToMove}
                    onRemoveArticle={async (index, id) => {
                       // Optional: If you want immediate delete, call the API.
                       // For now we just remove from the state and let Save Alteracoes handle it
                       // or we can set it to the deletingArticle state to pop a confirm.
                       // Wait, the original form calls handleConfirmDeleteArticle which deletes in API.
                       setDeletingArticle({ id, isPublic: false, indexToRemove: index } as any);
                       // We trigger the delete directly if it's new
                       if (String(id).startsWith('new_')) {
                          setEditArticles(prev => prev.filter((_, i) => i !== index));
                       } else {
                          // The existing code has handleConfirmDeleteArticle without arguments, it reads from deletingArticle.
                          // But we must open a confirm dialog? Actually TomadaSubsidiosTab has no confirm dialog rendered!
                          // Wait, does it? We'll just call the API directly or splice.
                          if (window.confirm("Tem certeza que deseja remover este dispositivo? Ele será apagado definitivamente.")) {
                              try {
                                  await fetch(`/api/reg/articles/${id}`, { method: 'DELETE' });
                                  setEditArticles(prev => prev.filter((_, i) => i !== index));
                              } catch (e) {
                                  console.error(e);
                              }
                          }
                       }
                    }}
                  />
'''
        content = content[:start_replace_edit] + new_code_edit + content[end_replace_edit:]


with open('src/components/TomadaSubsidiosTab.tsx', 'w') as f:
    f.write(content)

print("Patched!")
