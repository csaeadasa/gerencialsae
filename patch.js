const fs = require('fs');
let code = fs.readFileSync('src/components/PlanningTab.tsx', 'utf8');

const oldLogic = `      let needsRegen = false;
      const currentCode = editingTask.fiscalizacaoData?.codigo;

      if (!currentCode) {
        needsRegen = true;
      } else {
        const match = currentCode.match(/FISC\\s*(OP|QA)?\\s*(\\d+)-(\\d+)\\s*(.*)/i);
        if (match) {
          const codeTypeAbbr = match[1] ? match[1].toUpperCase() : "OP";
          const codeYear = parseInt(match[3], 10);
          const codeSigla = match[4] ? match[4].trim() : "";

          if (codeTypeAbbr !== targetTypeAbbr) {
            needsRegen = true;
          }
          if (codeYear !== currentYear) {
            needsRegen = true;
          }
          if (codeSigla !== sigla) {
            needsRegen = true;
          }
        } else {
          needsRegen = true;
        }
      }

      if (needsRegen) {
        let maxSeq = 0;
        tasks.forEach(t => {
          if (t.id !== editingTask.id && t.type === 'fiscalizacao' && t.fiscalizacaoData?.codigo) {
             const match = t.fiscalizacaoData.codigo.match(/FISC\\s*(OP|QA)?\\s*(\\d+)-(\\d+)/i);
             if (match) {
               const typeAbbr = match[1] ? match[1].toUpperCase() : "OP";
               const seq = parseInt(match[2], 10);
               const year = parseInt(match[3], 10);
               if (year === currentYear && typeAbbr === targetTypeAbbr && seq > maxSeq) {
                 maxSeq = seq;
               }
             }
          }
        });

        const nextSeq = maxSeq + 1;
        const seqStr = nextSeq.toString().padStart(3, '0');
        const generatedCode = \`FISC \${targetTypeAbbr} \${seqStr}-\${currentYear} \${sigla}\`;`;

const newLogic = `      let needsRegen = false;
      const currentCode = editingTask.fiscalizacaoData?.codigo;

      if (!currentCode) {
        needsRegen = true;
      } else {
        // Also support parsing legacy codes that might have OP/QA
        const match = currentCode.match(/FISC\\s*(?:OP|QA)?\\s*(\\d+)-(\\d+)\\s*(.*)/i);
        if (match) {
          const codeYear = parseInt(match[2], 10);
          const codeSigla = match[3] ? match[3].trim() : "";

          if (codeYear !== currentYear) {
            needsRegen = true;
          }
          if (codeSigla !== sigla) {
            needsRegen = true;
          }
        } else {
          needsRegen = true;
        }
      }

      if (needsRegen) {
        let maxSeq = 0;
        tasks.forEach(t => {
          if (t.id !== editingTask.id && t.type === 'fiscalizacao' && t.fiscalizacaoData?.codigo) {
             const tType = t.fiscalizacaoData.tipoFiscalizacao || "Operacional";
             if (tType === currentTipo) {
               const match = t.fiscalizacaoData.codigo.match(/FISC\\s*(?:OP|QA)?\\s*(\\d+)-(\\d+)/i);
               if (match) {
                 const seq = parseInt(match[1], 10);
                 const year = parseInt(match[2], 10);
                 if (year === currentYear && seq > maxSeq) {
                   maxSeq = seq;
                 }
               }
             }
          }
        });

        const nextSeq = maxSeq + 1;
        const seqStr = nextSeq.toString().padStart(3, '0');
        const generatedCode = \`FISC \${seqStr}-\${currentYear} \${sigla}\`;`;

if (code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync('src/components/PlanningTab.tsx', code, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Could not find old logic");
}
