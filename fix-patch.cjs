const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('let diffParts = getSmartDiff(oText, nText);', 'let diffParts = diff.diffWords(oText, nText);');

fs.writeFileSync(file, content, 'utf8');
