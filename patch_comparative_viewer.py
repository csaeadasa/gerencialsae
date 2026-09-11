import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the entire `renderUserContributionComparison` arrow function with a component
# Wait, if we replace it with a component, we also need to change the call sites from `renderUserContributionComparison(base, suggested, contentType)` to `<ComparativeViewer baseText={base} suggestedText={suggested} contentType={contentType} />`

# Let's see the calls to `renderUserContributionComparison`:
# 1) `{renderUserContributionComparison((art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") ? art.proposedText : (art.originalText || ""), uContrib.proposedText, art.contentType)}`
# 2) `{renderUserContributionComparison((art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") ? art.proposedText : (art.originalText || ""), proposedText, art.contentType)}`

# There might be others, let's find them via regex:
# `renderUserContributionComparison\(([^,]+),\n?\s*([^,]+),\n?\s*([^)]+)\)`

import re

# First replace the function definition
func_def_start = content.find("const renderUserContributionComparison = (baseText: string, suggestedText: string, contentType?: 'text' | 'table' | 'ementa' | 'considerandos') => {")

if func_def_start != -1:
    # We need to find the matching closing bracket
    bracket_count = 0
    in_str = False
    str_char = ''
    func_def_end = -1
    for i in range(func_def_start, len(content)):
        c = content[i]
        if c in ("'", '"', '`'):
            if not in_str:
                in_str = True
                str_char = c
            elif str_char == c:
                in_str = False
        elif c == '{' and not in_str:
            bracket_count += 1
        elif c == '}' and not in_str:
            bracket_count -= 1
            if bracket_count == 0:
                func_def_end = i + 1
                break
    
    if func_def_end != -1:
        func_body = content[func_def_start:func_def_end]
        
        # New component definition
        new_comp = """const ComparativeViewer: React.FC<{
  baseText: string;
  suggestedText: string;
  contentType?: 'text' | 'table' | 'ementa' | 'considerandos';
}> = ({ baseText, suggestedText, contentType }) => {
  const [hideHighlights, setHideHighlights] = useState(false);
  const isTable = contentType === 'table' || isTableJson(baseText) || isTableJson(suggestedText);

  if (isTable) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 px-3.5 py-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <TableIcon size={15} className="text-emerald-700 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Comparativo: Tabela da Minuta × Proposta de Alteração
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            Células modificadas pelo cidadão são destacadas em verde
          </span>
        </div>
        <RegulatoryTableView
          data={suggestedText || baseText}
          originalData={baseText}
        />
      </div>
    );
  }

  const diffParts = getSmartDiff(baseText || "", suggestedText || "");
  const hasAdded = diffParts.some(p => p.added);
  const hasRemoved = diffParts.some(p => p.removed);
  const isIdentical = !hasAdded && !hasRemoved;

  return (
    <div className="space-y-3">
      {/* Header com Legenda Clara */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 px-3.5 py-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-emerald-700 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Comparativo: Texto Proposto em Consulta (Minuta) × Texto da Contribuição Sugerida
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
          <span className="text-emerald-700 underline decoration-2 decoration-emerald-500/50 underline-offset-2">
            [+ Texto Inserido]
          </span>
          <span className="text-rose-500/80 line-through decoration-rose-500/80">
            [- Texto Excluído]
          </span>
        </div>
      </div>

      {/* Grade Comparativa de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Painel 1: Texto Proposto da Minuta */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
              1. Texto Proposto em Consulta (Minuta)
            </span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs h-full">
            <div className="text-sm text-slate-700 font-medium leading-relaxed break-words">
              {baseText || <span className="text-slate-400 italic">Nenhum texto base definido.</span>}
            </div>
          </div>
        </div>

        {/* Painel 2: Contribuição Sugerida com Destaque de Inserções e Exclusões */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                2. Texto da Contribuição Sugerida (Com destaques)
              </span>
            </div>
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHideHighlights(!hideHighlights); }} 
              className="text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm"
            >
              {hideHighlights ? "Mostrar Destaques" : "Ocultar Destaques"}
            </button>
          </div>
          <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-2xs ring-2 ring-emerald-500/20 h-full">
            {isIdentical ? (
              <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                Redação idêntica ao texto proposto da minuta (nenhuma alteração textual detectada).
              </div>
            ) : hideHighlights ? (
              <div className="text-sm text-slate-800 font-medium leading-relaxed break-words">
                {suggestedText || ""}
              </div>
            ) : (
              <div className="text-sm text-slate-800 font-medium leading-relaxed break-words">
                {diffParts.map((part, pIdx) => {
                  if (part.added) {
                    return (
                      <span
                        key={pIdx}
                        className="text-emerald-700 font-semibold underline decoration-2 decoration-emerald-500/50 underline-offset-2"
                        title="Texto inserido na sua proposta"
                      >
                        {part.value}
                      </span>
                    )
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={pIdx}
                        className="text-rose-500/80 line-through decoration-rose-500/80 font-medium"
                        title="Texto excluído na sua proposta"
                      >
                        {part.value}
                      </span>
                    )
                  }
                  return <span key={pIdx}>{part.value}</span>;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};"""

        content = content.replace(func_body, new_comp)

# We need to replace the call sites:
# Call Site 1:
call1 = """{renderUserContributionComparison(
                                (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "")
                                  ? art.proposedText
                                  : (art.originalText || ""),
                                uContrib.proposedText,
                                art.contentType
                              )}"""
repl1 = """<ComparativeViewer 
                                baseText={(art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") ? art.proposedText : (art.originalText || "")} 
                                suggestedText={uContrib.proposedText} 
                                contentType={art.contentType} 
                              />"""
content = content.replace(call1, repl1)

call2 = """{renderUserContributionComparison(
                              (art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "")
                                ? art.proposedText
                                : (art.originalText || ""),
                              proposedText,
                              art.contentType
                            )}"""
repl2 = """<ComparativeViewer 
                              baseText={(art.proposedText !== undefined && art.proposedText !== null && art.proposedText.trim() !== "") ? art.proposedText : (art.originalText || "")} 
                              suggestedText={proposedText} 
                              contentType={art.contentType} 
                            />"""
content = content.replace(call2, repl2)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch ComparativeViewer python script finished")
