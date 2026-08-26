const diff = require('diff');

const oldText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.`;

const newText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais e Horizontais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Art. 1Aº prestador de serviços é responsável pelo manejo, acondicionamento, transporte, disposição final adequada e ambientalmente correta dos lodos.`;

const getSmartDiff = (oText, nText) => {
  if (!oText && !nText) return [];
  if (!oText) return [{ added: true, removed: false, value: nText }];
  if (!nText) return [{ added: false, removed: true, value: oText }];

  // diffLines effectively treats paragraphs as lines if they don't have hard wraps
  // But wait, if someone adds a hard wrap, it might break. Let's use it first.
  // Actually, we can use a custom split using diff.diffArrays
  // Let's split by double newline.
  const oBlocks = oText.split(/(?<=\n\n)/);
  const nBlocks = nText.split(/(?<=\n\n)/);
  // No, diffArrays grouped contiguous removes. That was the problem!
  // BUT we can use diff.diffLines, which also groups contiguous removes.
  
  // Wait, if we use diffLines, contiguous removed lines are grouped!
  // Yes, diff groups all contiguous removes and contiguous adds.
  // So if multiple lines are modified, they become one big remove and one big add.
  // We can STILL apply the ratio test to the whole group. But what if one line is slightly modified and the next line is completely replaced?
  // They would be grouped together, and the overall ratio might be > 0.35, resulting in word-diffing the whole group (which causes interlacing for the completely replaced line).

  // To solve this, we must NOT let them group blindly, or we map over the lines OURSELVES.
  // Let's implement a simple line-by-line comparison.
  // We can split oText and nText by `\n`.
  const oLines = oText.split('\n');
  const nLines = nText.split('\n');
  
  // Use diff.diffArrays to diff the lines.
  const lineDiffs = diff.diffArrays(oLines, nLines);
  
  let finalDiff = [];
  
  for (let i = 0; i < lineDiffs.length; i++) {
    const part = lineDiffs[i];
    if (!part.added && !part.removed) {
        // unchanged
        finalDiff.push({ added: false, removed: false, value: part.value.join('\n') + (i < lineDiffs.length - 1 ? '\n' : '') });
    } else if (part.removed) {
        // Is the next part an addition?
        if (i + 1 < lineDiffs.length && lineDiffs[i+1].added) {
            const addedPart = lineDiffs[i+1];
            
            // Now we have a group of removed lines and a group of added lines.
            // Let's process them.
            // If they are just 1 removed and 1 added, we compare.
            // What if there are multiple? We can just compare the whole removed string vs added string.
            const removedStr = part.value.join('\n');
            const addedStr = addedPart.value.join('\n');
            
            // To prevent interlacing of unrelated paragraphs, we can split them back and compare paragraph by paragraph?
            // Actually, if we just diff the whole removedStr and addedStr, we are back to square one.
            // But wait! If we do a line-by-line LCS mapping FIRST, we can match lines perfectly.
            
            // Let's use diffWords to see the overall diff.
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
            
            if (oldAlpha.length > 5 && ratio < 0.35) {
                finalDiff.push({ added: false, removed: true, value: removedStr + (i < lineDiffs.length - 1 ? '\n' : '') });
                finalDiff.push({ added: true, removed: false, value: addedStr + (i + 1 < lineDiffs.length - 1 ? '\n' : '') });
            } else {
                // If they are similar enough overall, but might contain unrelated paragraphs...
                // We should really do this paragraph by paragraph!
                
                // Let's process each line in the removed group against lines in the added group.
                // But it's easier to just do it this way:
                const oParas = removedStr.split('\n');
                const nParas = addedStr.split('\n');
                
                // Let's pad them so they have the same length.
                const maxParas = Math.max(oParas.length, nParas.length);
                for(let j=0; j<maxParas; j++) {
                    const op = oParas[j] || "";
                    const np = nParas[j] || "";
                    
                    if (!op && !np) continue;
                    if (!op) {
                         finalDiff.push({ added: true, removed: false, value: np + (j < maxParas - 1 ? '\n' : '') });
                         continue;
                    }
                    if (!np) {
                         finalDiff.push({ added: false, removed: true, value: op + (j < maxParas - 1 ? '\n' : '') });
                         continue;
                    }
                    
                    // Diff this specific paragraph
                    const wd = diff.diffWords(op, np);
                    let ua = 0;
                    wd.forEach(p => {
                      if (!p.added && !p.removed) {
                        ua += p.value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '').length;
                      }
                    });
                    const oa = op.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '').length;
                    const r = oa > 0 ? ua / oa : 0;
                    
                    if (oa > 5 && r < 0.35) {
                        finalDiff.push({ added: false, removed: true, value: op + '\n' });
                        finalDiff.push({ added: true, removed: false, value: np + (j < maxParas - 1 ? '\n' : '') });
                    } else {
                        // For the last element of wd, add newline if needed
                        if (j < maxParas - 1) {
                            if (wd.length > 0) wd[wd.length - 1].value += '\n';
                        }
                        finalDiff.push(...wd);
                    }
                }
            }
            i++;
        } else {
            finalDiff.push({ added: false, removed: true, value: part.value.join('\n') + (i < lineDiffs.length - 1 ? '\n' : '') });
        }
    } else if (part.added) {
        finalDiff.push({ added: true, removed: false, value: part.value.join('\n') + (i < lineDiffs.length - 1 ? '\n' : '') });
    }
  }
  
  return finalDiff;
};

console.log(getSmartDiff(oldText, newText));
