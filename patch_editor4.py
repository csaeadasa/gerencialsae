with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

# 1. Fix handleRepeatProposedAsOriginalAll logic
bad_all1 = """  const handleRepeatProposedAsOriginalAll = () => {
    if (window.confirm("Deseja copiar o texto proposto para o texto atual vigente em todos os dispositivos? Os textos atuais serão sobrescritos.")) {
      const updated = articles.map(art => {
        const textToCopy = (art.proposedText !== undefined && art.proposedText !== null && art.proposedText !== "")
          ? art.proposedText
          : (art.originalText || "");
        return {
          ...art,
          originalText: textToCopy
        };
      });
      setArticles(updated);
    }
  };"""

good_all1 = """  const handleRepeatProposedAsOriginalAll = () => {
    if (window.confirm("Deseja copiar o texto proposto para o texto atual vigente em todos os dispositivos? Os textos atuais serão sobrescritos.")) {
      const updated = articles.map(art => {
        const textToCopy = art.proposedText !== undefined ? art.proposedText : (art.originalText || "");
        return {
          ...art,
          originalText: textToCopy
        };
      });
      setArticles(updated);
    }
  };"""
content = content.replace(bad_all1, good_all1)

# 2. Fix individual proposed -> original
bad_indiv1 = """                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Texto Atual Vigente da Resolução <span className="text-rose-500 font-black">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          const textToCopy = (art.proposedText !== undefined && art.proposedText !== null && art.proposedText !== "")
                            ? art.proposedText
                            : (art.originalText || "");
                          newArts[i].originalText = textToCopy;
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                        title="Copiar texto proposto deste dispositivo para o texto original vigente"
                      >
                        <Copy size={11} /> Repetir proposto
                      </button>
                    </div>"""

good_indiv1 = """                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Texto Atual Vigente da Resolução <span className="text-rose-500 font-black">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          const textToCopy = art.proposedText !== undefined ? art.proposedText : (art.originalText || "");
                          newArts[i].originalText = textToCopy;
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                        title="Copiar texto proposto deste dispositivo para o texto original vigente"
                      >
                        <Copy size={11} /> Repetir Texto Proposto como Texto Atual
                      </button>
                    </div>"""
content = content.replace(bad_indiv1, good_indiv1)

# 3. Add individual original -> proposed
bad_indiv2 = """                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Texto Proposto (Área Técnica)</label>
                  <textarea """

good_indiv2 = """                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Texto Proposto (Área Técnica)</label>
                    {isAlteracao && (
                      <button
                        type="button"
                        onClick={() => {
                          const newArts = [...articles];
                          newArts[i].proposedText = art.originalText || "";
                          setArticles(newArts);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200"
                        title="Copiar texto atual vigente deste dispositivo para o texto proposto"
                      >
                        <Copy size={11} /> Repetir Texto Atual como Texto Proposto
                      </button>
                    )}
                  </div>
                  <textarea """
content = content.replace(bad_indiv2, good_indiv2)


with open('src/components/RegulatoryArticlesEditor.tsx', 'w') as f:
    f.write(content)
