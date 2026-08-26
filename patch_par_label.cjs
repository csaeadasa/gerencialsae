const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/l\.startsWith\("§"\) \|\| l\.startsWith\("parágrafo"\)/g, 'l.startsWith("§") || l.startsWith("parágrafo") || l.startsWith("paragrafo")');

fs.writeFileSync(file, content, 'utf8');
