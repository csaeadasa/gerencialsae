const diff = require('diff');

const oldText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.`;

const newText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais e Horizontais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Art. 1Aº prestador de serviços é responsável pelo manejo, acondicionamento, transporte, disposição final adequada e ambientalmente correta dos lodos.`;

const oText = oldText || "";
const nText = newText || "";

// Split into paragraphs
const oParas = oText.split(/\n\n+/);
const nParas = nText.split(/\n\n+/);

// If the number of paragraphs doesn't match, we might have a harder time matching them up.
// Actually, diff.diffArrays on paragraphs could work. Or we could just use diff.diffLines.
// But let's see how diffLines behaves.
const diffLines = diff.diffLines(oText, nText);
console.log("DIFF LINES:");
diffLines.forEach(l => console.log(l));

// Wait, diffLines compares line by line. If a line is partially changed, it will show the whole line as removed and the whole new line as added.
// Is that what we want? The user said "Sempre que ocorrer a exclusão de dispositivo completo, mostre todo o dispositvo riscado e isole essa exclusão de novas inserções."
// But they still want word-level diffs for small changes, like "condições gerais" removed and "e Horizontais" added in Art. 1º.
// So we need word-level diff for Art. 1º, but full replacement for the Parágrafo Único.

