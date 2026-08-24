const fs = require('fs');
let code = fs.readFileSync('src/components/TomadaSubsidiosTab.tsx', 'utf8');

const oldDelete = `const handleDeleteTomada = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta Tomada de Subsídios?")) {
      setTomadas(tomadas.filter(t => t.id !== id));
      setArticles(articles.filter(a => a.tomadaId !== id));
      setContributions(contributions.filter(c => articles.find(a => a.id === c.articleId)?.tomadaId !== id));
      showToast("Sucesso", "Tomada excluída com sucesso.", "success");
    }
  };`;

const newDelete = `const handleDeleteTomada = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja excluir esta Tomada de Subsídios? Esta ação é irreversível.")) {
      try {
        const res = await fetch(\`/api/reg/tomadas/\${id}\`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setTomadas(tomadas.filter(t => t.id !== id));
          // If we had a global list of articles/contributions, we could filter them out, but we refetched them anyway.
          showToast("Sucesso", "Tomada excluída com sucesso.", "success");
          fetchTomadas(); // Refresh list to be sure
        } else {
          showToast("Erro", "Falha ao excluir a tomada", "error");
        }
      } catch (error) {
        console.error(error);
        showToast("Erro", "Erro no servidor ao excluir", "error");
      }
    }
  };`;

code = code.replace(oldDelete, newDelete);

fs.writeFileSync('src/components/TomadaSubsidiosTab.tsx', code);
console.log("Delete patched.");
