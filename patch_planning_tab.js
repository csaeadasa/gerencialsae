const fs = require('fs');
const content = fs.readFileSync('src/components/PlanningTab.tsx', 'utf-8');

const targetLine = `  }, [editingTask.areaIds, categories, responsibles]);`;

const hookCode = `
  // Synchronize Fiscalizacao Code
  useEffect(() => {
    if (editingTask && editingTask.type === 'fiscalizacao') {
      // Only generate if it doesn't have an ID (new task) or if it doesn't have a code
      if (!editingTask.id || !editingTask.fiscalizacaoData?.codigo) {
        const currentYear = new Date().getFullYear();
        let maxSeq = 0;
        tasks.forEach(t => {
          if (t.type === 'fiscalizacao' && t.fiscalizacaoData?.codigo) {
             const match = t.fiscalizacaoData.codigo.match(/FISC (\\d+)-(\\d+)/);
             if (match) {
               const seq = parseInt(match[1], 10);
               const year = parseInt(match[2], 10);
               if (year === currentYear && seq > maxSeq) {
                 maxSeq = seq;
               }
             }
          }
        });
        const nextSeq = maxSeq + 1;
        const seqStr = nextSeq.toString().padStart(3, '0');
        let sigla = "UNKNOWN";
        if (editingTask.areaIds && editingTask.areaIds.length > 0) {
          const primaryArea = areas.find(a => a.id === editingTask.areaIds![0]);
          if (primaryArea && primaryArea.abbreviation) {
            sigla = primaryArea.abbreviation;
          } else if (primaryArea) {
            sigla = primaryArea.name.substring(0, 4).toUpperCase();
          }
        }
        const generatedCode = \`FISC \${seqStr}-\${currentYear} \${sigla}\`;
        
        if (!editingTask.fiscalizacaoData || editingTask.fiscalizacaoData.codigo !== generatedCode) {
          setEditingTask(prev => ({
            ...prev,
            fiscalizacaoData: {
              ...(prev.fiscalizacaoData || {
                codigo: "",
                objetivo: "",
                regiaoAdministrativa: "",
                latitude: "",
                longitude: "",
                tipo: "Direta",
                programacao: "Programada",
                imagens: [],
                documentos: [],
                constatacoes: [],
                termosNotificacao: []
              }),
              codigo: generatedCode
            }
          }));
        }
      }
    }
  }, [editingTask.type, editingTask.areaIds, editingTask.id, editingTask.fiscalizacaoData?.codigo, tasks, areas]);
`;

if (!content.includes('// Synchronize Fiscalizacao Code')) {
    const newContent = content.replace(targetLine, targetLine + '\n' + hookCode);
    fs.writeFileSync('src/components/PlanningTab.tsx', newContent);
    console.log("Hook inserted successfully.");
} else {
    console.log("Hook already exists.");
}
