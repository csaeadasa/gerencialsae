import re

with open("src/components/TomadaSubsidiosTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_item_state = """  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);"""
new_item_state = """  const [hideHighlights, setHideHighlights] = useState(false);\n  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);"""
content = content.replace(old_item_state, new_item_state)

old_item_render = """          <span className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-3">
            {isTable ? "Tabela da Contribuição Sugerida (Com destaques)" : "Texto da Contribuição Sugerida (Com destaques)"}
          </span>
          {isTable ? ("""
new_item_render = """          <div className="flex items-center justify-between mb-3">
            <span className="block text-xs font-black text-slate-600 uppercase tracking-wider">
              {isTable ? "Tabela da Contribuição Sugerida (Com destaques)" : "Texto da Contribuição Sugerida (Com destaques)"}
            </span>
            <button 
              type="button" 
              onClick={() => setHideHighlights(prev => !prev)} 
              className="text-[9px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-1.5 rounded-lg transition-colors border border-slate-200 shadow-sm"
            >
              {hideHighlights ? "Mostrar Destaques" : "Ocultar Destaques"}
            </button>
          </div>
          {isTable ? ("""
content = content.replace(old_item_render, new_item_render)

old_item_diff = """          ) : (
            <div className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
              {diffParts.map((part, pIdx) => {"""
new_item_diff = """          ) : hideHighlights ? (
            <div className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
              {c.proposedText || ""}
            </div>
          ) : (
            <div className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
              {diffParts.map((part, pIdx) => {"""
content = content.replace(old_item_diff, new_item_diff)

with open("src/components/TomadaSubsidiosTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch contrib item script finished")
