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

const getSmartDiff = (oText, nText) => {
  if (!oText && !nText) return [];
  if (!oText) return [{ added: true, removed: false, value: nText }];
  if (!nText) return [{ added: false, removed: true, value: oText }];

  // Split into paragraphs (keeping newlines as parts of the array or stripping them)
  const oParas = oText.split(/(?<=\n\n)/); // Split keeping the trailing newlines
  const nParas = nText.split(/(?<=\n\n)/);

  const paraDiff = diff.diffArrays(oParas, nParas);
  
  let finalDiff = [];
  
  for (let i = 0; i < paraDiff.length; i++) {
      const part = paraDiff[i];
      if (!part.added && !part.removed) {
          // Unchanged paragraphs
          finalDiff.push({ added: false, removed: false, value: part.value.join('') });
      } else if (part.removed) {
          // Look ahead to see if the next part is added (a replacement)
          if (i + 1 < paraDiff.length && paraDiff[i+1].added) {
              const addedPart = paraDiff[i+1];
              // We have a replacement. Compare the strings.
              const removedStr = part.value.join('');
              const addedStr = addedPart.value.join('');
              
              const wordDiffs = diff.diffWords(removedStr, addedStr);
              let unchangedAlphaLen = 0;
              wordDiffs.forEach(p => {
                if (!p.added && !p.removed) {
                  const alpha = p.value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
                  unchangedAlphaLen += alpha.length;
                }
              });
              const oldAlpha = removedStr.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
              
              const ratio = oldAlpha.length > 0 ? unchangedAlphaLen / oldAlpha.length : 0;
              
              if (oldAlpha.length > 5 && ratio < 0.40) {
                  // Too different, treat as separate removal and addition
                  finalDiff.push({ added: false, removed: true, value: removedStr });
                  finalDiff.push({ added: true, removed: false, value: addedStr });
              } else {
                  // Similar enough, keep word diffs
                  finalDiff.push(...wordDiffs);
              }
              i++; // Skip the added part since we handled it
          } else {
              // Just removed
              finalDiff.push({ added: false, removed: true, value: part.value.join('') });
          }
      } else if (part.added) {
           finalDiff.push({ added: true, removed: false, value: part.value.join('') });
      }
  }
  return finalDiff;
};

const result = getSmartDiff(oldText, newText);
console.log(result);

