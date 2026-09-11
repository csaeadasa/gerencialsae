import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_gerenciar = """          {/* Painel 2: Contribuição Sugerida com Destaque de Inserções e Exclusões */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                2. Texto da Contribuição Sugerida (Com destaques)
              </span>
            </div>
            <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-2xs ring-2 ring-emerald-500/20 h-full">
              {isIdentical ? (
                <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                  Redação idêntica ao texto proposto da minuta (nenhuma alteração textual detectada).
                </div>
              ) : (
                <div className="text-sm text-slate-800 font-medium leading-relaxed break-words">"""

new_gerenciar = """          {/* Painel 2: Contribuição Sugerida com Destaque de Inserções e Exclusões */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3.5 py-2 rounded-lg">
                  2. Texto da Contribuição Sugerida (Com destaques)
                </span>
              </div>
              <button 
                type="button" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleHighlight(uContrib.id); }} 
                className="text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm"
              >
                {hideHighlightsSet.has(uContrib.id) ? "Mostrar Destaques" : "Ocultar Destaques"}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-2xs ring-2 ring-emerald-500/20 h-full">
              {isIdentical ? (
                <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                  Redação idêntica ao texto proposto da minuta (nenhuma alteração textual detectada).
                </div>
              ) : hideHighlightsSet.has(uContrib.id) ? (
                <div className="text-sm text-slate-800 font-medium leading-relaxed break-words">
                  {uContrib.proposedText || ""}
                </div>
              ) : (
                <div className="text-sm text-slate-800 font-medium leading-relaxed break-words">"""

content = content.replace(old_gerenciar, new_gerenciar)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch gerenciar highlights python script finished")
