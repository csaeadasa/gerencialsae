import re

with open("src/components/RegulatoryTableView.tsx", "r") as f:
    content = f.read()


new_rows = """<tbody className="divide-y divide-slate-100">
            {(diffResult?.mergedRows || tableData.rows.map((row, idx) => ({ type: 'unchanged', propIdx: idx, origIdx: null, cells: row }))).map((mergedRow, mapIdx) => {
              const rIdx = mergedRow.propIdx;
              const isRemoved = mergedRow.type === 'removed';
              const isAddedRow = mergedRow.type === 'added';
              const row = mergedRow.cells;
              
              return (
                <tr
                  key={mapIdx}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    isRemoved ? "bg-rose-50/40 opacity-75" : (mapIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white")
                  )}
                >
                  <td className="w-10 px-3 py-2 text-center font-bold text-slate-400 border-r border-slate-200 bg-slate-50/60 select-none text-[11px] shrink-0">
                    {isRemoved ? (
                      <span className="text-rose-500 line-through" title="Linha excluída">{mergedRow.origIdx !== null ? mergedRow.origIdx + 1 : ""}</span>
                    ) : (
                      <span className={cn(isAddedRow && "text-emerald-600")}>{mergedRow.origIdx !== null ? mergedRow.origIdx + 1 : "+"}</span>
                    )}
                  </td>
                  {tableData.headers.map((_, cIdx) => {
                    const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "";
                    const diffKey = isRemoved ? `removed_${mergedRow.origIdx}_${cIdx}` : `${rIdx}_${cIdx}`;
                    const cellDiff = diffResult?.cellDiffs[diffKey];
                    const isModified = cellDiff?.type === "modified";
                    const isAdded = cellDiff?.type === "added";
                    const colShort = isColShort(cIdx);

                    return (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3 py-2 border-r border-slate-100 last:border-r-0 leading-relaxed",
                          colShort ? "text-center align-middle font-medium" : "text-left",
                          (isModified || isAdded) && "bg-emerald-50 text-emerald-950 font-bold",
                          isRemoved ? "bg-rose-50/50 text-rose-700 font-medium line-through" : "text-slate-800"
                        )}
                      >
                        <div>{val || <span className="text-slate-300">-</span>}</div>
                        {isModified && cellDiff?.oldValue && !isRemoved && (
                          <div className="text-[9px] font-normal text-rose-600 line-through mt-0.5">
                            Antes: {cellDiff.oldValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>"""


pattern = re.compile(r"<tbody className=\"divide-y divide-slate-100\">[\s\S]*?</tbody>", re.MULTILINE)
content = pattern.sub(new_rows, content)

with open("src/components/RegulatoryTableView.tsx", "w") as f:
    f.write(content)

