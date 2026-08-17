const fs = require('fs');
let code = fs.readFileSync('src/components/PlanningTab.tsx', 'utf8');

const bad1 = `      const currentCode = editingTask.fiscalizacaoData?.codi        const match = currentCode.match(/FISC\\s*(?:OP|QA)?\\s*(\\d+)-(\\d+)\\s*(.*)/i);`;
const good1 = `      const currentCode = editingTask.fiscalizacaoData?.codigo;

      if (!currentCode) {
        needsRegen = true;
      } else {
        const match = currentCode.match(/FISC\\s*(?:OP|QA)?\\s*(\\d+)-(\\d+)\\s*(.*)/i);`;

code = code.replace(bad1, good1);

const bad2 = `        const generatedCode = \`FISC \${seqStr}-\${currentYear} \${sigla}\`;neratedCode = \`FISC \${targetTypeAbbr} \${seqStr}-\${currentYear} \${sigla}\`;`;
const good2 = `        const generatedCode = \`FISC \${seqStr}-\${currentYear} \${sigla}\`;`;

code = code.replace(bad2, good2);

fs.writeFileSync('src/components/PlanningTab.tsx', code, 'utf8');
