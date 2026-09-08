with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

bad_str = """                <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'text';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType !== 'table'
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Texto Normativo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'table';
                      if (!isTableJson(art.proposedText || art.originalText)) {
                        const parsedT = parseTableData(art.proposedText || art.originalText || "Item\\tDescrição\\tValor\\n1\\tTarifa Base\\t100,00");
                        newArts[i].proposedText = serializeTableData(parsedT);
                      }
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'table'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <TableIcon size={12} /> Tabela (Matriz Regulada)
                  </button>
                </div>"""

good_str = """                <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 border border-slate-300/60 flex-wrap gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'text';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      (!art.contentType || art.contentType === 'text')
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Texto Normativo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'ementa';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'ementa'
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Ementa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'considerandos';
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'considerandos'
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} /> Considerandos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newArts = [...articles];
                      newArts[i].contentType = 'table';
                      if (!isTableJson(art.proposedText || art.originalText)) {
                        const parsedT = parseTableData(art.proposedText || art.originalText || "Item\\tDescrição\\tValor\\n1\\tTarifa Base\\t100,00");
                        newArts[i].proposedText = serializeTableData(parsedT);
                      }
                      setArticles(newArts);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1.5",
                      art.contentType === 'table'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <TableIcon size={12} /> Tabela
                  </button>
                </div>"""

content = content.replace(bad_str, good_str)

with open('src/components/RegulatoryArticlesEditor.tsx', 'w') as f:
    f.write(content)
