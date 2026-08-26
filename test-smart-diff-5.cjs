const diff = require('diff');

const oldText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e condições gerais para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Parágrafo Único. Os condomínios verticais residenciais e de uso misto já existentes terão prazo até 19 de janeiro de 2015 para implantar a hidrometração individualizada.`;

const newText = `CAPÍTULO I

DO OBJETO

Art. 1º Estabelecer os procedimentos e para a instalação de hidrômetros individualizados para cada unidade nos condomínios verticais e Horizontais residenciais e de uso misto localizados no Distrito Federal, conforme Lei nº 3.557, de 18 de janeiro de 2005, alterada pela Lei n.º 4.383, de 28 de julho de 2009.

Art. 1Aº prestador de serviços é responsável pelo manejo, acondicionamento, transporte, disposição final adequada e ambientalmente correta dos lodos.`;

const getSmartDiff = (oldText, newText) => {
  const oText = oldText || "";
  const nText = newText || "";
  if (!oText && !nText) return [];
  if (!oText) return [{ added: true, removed: false, value: nText }];
  if (!nText) return [{ added: false, removed: true, value: oText }];

  const oLines = oText.split('\n');
  const nLines = nText.split('\n');
  
  const lineDiffs = diff.diffArrays(oLines, nLines);
  
  let finalDiff = [];
  
  for (let i = 0; i < lineDiffs.length; i++) {
    const part = lineDiffs[i];
    const isLastPart = (i === lineDiffs.length - 1);
    
    if (!part.added && !part.removed) {
        finalDiff.push({ added: false, removed: false, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
    } else if (part.removed) {
        if (i + 1 < lineDiffs.length && lineDiffs[i+1].added) {
            const addedPart = lineDiffs[i+1];
            const isNextLastPart = (i + 1 === lineDiffs.length - 1);
            
            const oParas = part.value;
            const nParas = addedPart.value;
            
            const maxParas = Math.max(oParas.length, nParas.length);
            for (let j = 0; j < maxParas; j++) {
                const op = oParas[j] || "";
                const np = nParas[j] || "";
                
                const isLastLineInGroup = (j === maxParas - 1);
                const suffix = (isNextLastPart && isLastLineInGroup) ? '' : '\n';
                
                if (!op && !np) {
                    finalDiff.push({ added: false, removed: false, value: suffix });
                    continue; 
                }
                
                if (!op) {
                     finalDiff.push({ added: true, removed: false, value: np + suffix });
                     continue;
                }
                if (!np) {
                     finalDiff.push({ added: false, removed: true, value: op + suffix });
                     continue;
                }
                
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
                    finalDiff.push({ added: false, removed: true, value: op + suffix });
                    finalDiff.push({ added: true, removed: false, value: np + suffix });
                } else {
                    if (wd.length > 0) {
                        wd[wd.length - 1].value += suffix;
                    }
                    finalDiff.push(...wd);
                }
            }
            i++;
        } else {
            finalDiff.push({ added: false, removed: true, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
        }
    } else if (part.added) {
        finalDiff.push({ added: true, removed: false, value: part.value.join('\n') + (isLastPart ? '' : '\n') });
    }
  }
  return finalDiff;
};

console.log(getSmartDiff(oldText, newText));
