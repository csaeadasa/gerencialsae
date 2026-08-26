const diff = require('diff');

const oldText = "Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.";
const newText = "Art. 1A É de responsabilidade do condomínio ou do empreendedor o projeto da instalação hidráulica predial considerando as perdas de carga nos hidrômetros de modo a assegurar o seu correto funcionamento.";

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
