const diff = require('diff');

const oldText = "Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração.";
const newText = "Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de dezembro de 2015 para implementar a hidrometração individualizada.";

const diffParts = diff.diffWords(oldText, newText);

let unchangedAlphaLen = 0;
diffParts.forEach(p => {
    if (!p.added && !p.removed) {
        const alpha = p.value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
        unchangedAlphaLen += alpha.length;
    }
});

const oldAlpha = oldText.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
console.log("Unchanged alpha:", unchangedAlphaLen, "Old alpha:", oldAlpha.length);
console.log("Ratio:", unchangedAlphaLen / oldAlpha.length);
