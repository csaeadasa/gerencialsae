with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

bad_str = """  return (
    <div className="space-y-4 pr-2 pb-4">
      <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">"""

good_str = """  const handleRepeatProposedAsOriginalAll = () => {
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
  };

  const handleRepeatOriginalAsProposedAll = () => {
    if (window.confirm("Deseja copiar o texto atual vigente para o texto proposto em todos os dispositivos? Os textos propostos serão sobrescritos.")) {
      const updated = articles.map(art => ({
        ...art,
        proposedText: art.originalText || ""
      }));
      setArticles(updated);
    }
  };

  return (
    <div className="space-y-4 pr-2 pb-4">
      {isAlteracao && (
        <div className="flex flex-wrap items-center justify-end gap-2 mb-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-slate-500 uppercase mr-auto flex items-center gap-1.5"><Copy size={14}/> Ações em Lote:</span>
          <button
            type="button"
            onClick={handleRepeatProposedAsOriginalAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-sm transition-all"
            title="Copia o texto proposto de cada dispositivo para o campo de texto vigente"
          >
            <Copy size={13} /> Repetir Texto Proposto como Texto Atual
          </button>
          <button
            type="button"
            onClick={handleRepeatOriginalAsProposedAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shadow-sm transition-all"
            title="Copia o texto atual vigente de cada dispositivo para o campo de texto proposto"
          >
            <Copy size={13} /> Repetir Texto Atual como Texto Proposto
          </button>
        </div>
      )}
      <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity">"""

content = content.replace(bad_str, good_str)

with open('src/components/RegulatoryArticlesEditor.tsx', 'w') as f:
    f.write(content)
