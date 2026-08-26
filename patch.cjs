const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const smartDiffCode = `
export const getSmartDiff = (oldText: string, newText: string) => {
  const oText = oldText || "";
  const nText = newText || "";
  if (!oText && !nText) return [];
  if (!oText) return [{ added: true, removed: false, value: nText }];
  if (!nText) return [{ added: false, removed: true, value: oText }];

  let diffParts = diff.diffWords(oText, nText);
  
  let unchangedAlphaLen = 0;
  diffParts.forEach(p => {
    if (!p.added && !p.removed) {
      const alpha = p.value.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
      unchangedAlphaLen += alpha.length;
    }
  });
  
  const oldAlpha = oText.replace(/[^a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
  
  // Se o texto original tem algum conteúdo e preservou menos de 35% de seus caracteres originais 
  // (excluindo pontuação), consideramos uma exclusão e substituição completa (Dispositivo integral).
  if (oldAlpha.length > 5 && (unchangedAlphaLen / oldAlpha.length) < 0.35) {
    return [
      { count: oText.length, added: false, removed: true, value: oText },
      { count: 2, added: false, removed: false, value: "\\n\\n" },
      { count: nText.length, added: true, removed: false, value: nText }
    ];
  }
  
  return diffParts;
};

`;

content = content.replace('interface TomadaSubsidiosTabProps', smartDiffCode + 'interface TomadaSubsidiosTabProps');
// replace diff.diffWords with getSmartDiff
content = content.replace(/diff\.diffWords/g, 'getSmartDiff');

fs.writeFileSync(file, content, 'utf8');
