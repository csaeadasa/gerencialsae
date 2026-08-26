const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `                if (items.length === 0) return "";
                
                let combined = "";
                if (items.length === 1) {
                  combined = items[0];
                } else if (items.length === 2) {
                  combined = \`\${items[0]} e \${items[1]}\`;
                } else {
                  const last = items.pop();
                  combined = \`\${items.join(", ")} e \${last}\`;
                }

                return \`Ficam revogados \${combined}, da \${base}.\`;
              };`;

const replace = `                if (items.length === 0) return "";
                
                let combined = "";
                let isPlural = false;
                
                if (items.length === 1) {
                  combined = items[0];
                  if (combined.includes(" e ")) isPlural = true;
                } else if (items.length === 2) {
                  combined = \`\${items[0]} e \${items[1]}\`;
                  isPlural = true;
                } else {
                  const last = items.pop();
                  combined = \`\${items.join(", ")} e \${last}\`;
                  isPlural = true;
                }

                if (isPlural) {
                  return \`Ficam revogados \${combined}, da \${base}.\`;
                }
                return \`Fica revogado \${combined}, da \${base}.\`;
              };`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
