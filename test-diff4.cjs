const diff = require('diff');

const oldText = "Art. 1";
const newText = "Artigo Primeiro";

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
