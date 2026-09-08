with open('src/components/RegulatoryArticlesEditor.tsx', 'r') as f:
    content = f.read()

bad_all1 = """  const handleRepeatProposedAsOriginalAll = () => {
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

good_all1 = """  const handleRepeatProposedAsOriginalAll = () => {
    const updated = articles.map(art => {
      const textToCopy = art.proposedText !== undefined ? art.proposedText : (art.originalText || "");
      return {
        ...art,
        originalText: textToCopy
      };
    });
    setArticles(updated);
  };"""
content = content.replace(bad_all1, good_all1)

bad_all2 = """  const handleRepeatOriginalAsProposedAll = () => {
    if (window.confirm("Deseja copiar o texto atual vigente para o texto proposto em todos os dispositivos? Os textos propostos serão sobrescritos.")) {
      const updated = articles.map(art => ({
        ...art,
        proposedText: art.originalText || ""
      }));
      setArticles(updated);
    }
  };"""

good_all2 = """  const handleRepeatOriginalAsProposedAll = () => {
    const updated = articles.map(art => ({
      ...art,
      proposedText: art.originalText || ""
    }));
    setArticles(updated);
  };"""
content = content.replace(bad_all2, good_all2)


with open('src/components/RegulatoryArticlesEditor.tsx', 'w') as f:
    f.write(content)
