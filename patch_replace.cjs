const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// The line: preparedText = preparedText.replace(/([.;:])\s*(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi, "$1\n$2");
// We should replace it with one that splits even if there's no period, provided it looks like a new subunit start.
// But we must be careful not to split "nos termos do § 1º". Usually "do §" or "ao §" or "o §" is lowercase or preceded by "do ", "no ", "ao ".
// Actually, if it's "Parágrafo único" with capital P, it's almost always a subunit.
// If it's "§", it's a subunit if it's at the start of a sentence or right after the caput.
// Let's just allow a space before it, BUT NOT if it's preceded by " do ", " no ", " ao ", " o ", " dos ", " aos ", " art. ".

const search = `                preparedText = preparedText.replace(/([.;:])\\s*(§\\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\\s+[uú]nico)/gi, "$1\\n$2");`;
const replace = `                // Split even if missing punctuation before, but avoid splitting references like "do §1º"
                preparedText = preparedText.replace(/(^|[^a-zA-Z])(§\\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\\s+[uú]nico)/gi, (match, p1, p2) => {
                  const p1Lower = p1.toLowerCase();
                  if (p1Lower.includes("do ") || p1Lower.includes("no ") || p1Lower.includes("ao ") || p1Lower.includes(" o ") || p1Lower.match(/art\\.?\\s*$/)) {
                    return match;
                  }
                  return p1 + "\\n" + p2;
                });`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
