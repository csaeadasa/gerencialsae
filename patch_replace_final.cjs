const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `                // Split even if missing punctuation before, but avoid splitting references like "do §1º"
                preparedText = preparedText.replace(/(^|[^a-zA-Z])(§\\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\\s+[uú]nico)/gi, (match, p1, p2) => {
                  const p1Lower = p1.toLowerCase();
                  if (p1Lower.includes("do ") || p1Lower.includes("no ") || p1Lower.includes("ao ") || p1Lower.includes(" o ") || p1Lower.match(/art\\.?\\s*$/)) {
                    return match;
                  }
                  return p1 + "\\n" + p2;
                });`;

const replace = `                preparedText = preparedText.replace(/(^|[\\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\\.?)\\s+)?(§\\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\\s+[uú]nico)/gi, (match, p1, prep, subunit) => {
                  if (prep) return match;
                  return p1 + "\\n" + subunit;
                });`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
