const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `                preparedText = preparedText.replace(/([.;:])\\s*([IVXLCDM]+\\s*[-–—\\.]\\s*)/g, "$1\\n$2");`;
const replace = `                preparedText = preparedText.replace(/(^|[^a-zA-Z])([IVXLCDM]+\\s*[-–—\\.]\\s*)/g, (match, p1, p2) => {
                  // Roman numerals can be tricky, but if they have a dash/dot and spaces, it's likely an inciso.
                  // E.g. " I - " or " I. "
                  // Avoid if preceded by "Título", "Capítulo", "Seção"
                  if (p1.match(/t[íi]tulo\\s*$|cap[íi]tulo\\s*$|se[çc][ãa]o\\s*$/i)) return match;
                  return p1 + "\\n" + p2;
                });`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
