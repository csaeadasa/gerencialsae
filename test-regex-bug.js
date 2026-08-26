const rawText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.`;

let preparedText = rawText;
preparedText = preparedText.replace(/(^|[\s.;:])(?:(do|no|ao|o|dos|nos|aos|os|art\.?)\s+)?(§\s*[0-9]+[ºª]?(?:-[A-Za-z0-9]+)?|Par[aá]grafo\s+[uú]nico)/gi, (match, p1, prep, subunit) => {
  if (prep) return match;
  return p1 + "\n" + subunit;
});

const lines = preparedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
console.log(lines);

let currentSubunit = null;
let subunits = [];
for (const line of lines) {
  const cleanLine = line.replace(/^["'“]+/, "").replace(/["'”]+$/, "").trim();
  const parMatch = cleanLine.match(/^(?:§\s*([0-9]+[ºª]?(?:-[A-Za-z0-9]+)?)|Par[aá]grafo\s+[uú]nico)[\.:\s\-–—]*/i);
  if (parMatch) {
     console.log("Found par:", parMatch[0]);
  }
}
