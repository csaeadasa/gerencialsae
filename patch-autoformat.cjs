const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `    const currentArtIdStr = String(contributingArticleId);
    const currentUserId = effectiveUser?.id ? Number(effectiveUser.id) : null;
    const authorSignature = (effectiveUser?.name || effectiveUser?.email || "Usuário").trim();
    const authorEmail = (effectiveUser?.email || "").trim();

    try {`;

const replace = `    const currentArtIdStr = String(contributingArticleId);
    const currentUserId = effectiveUser?.id ? Number(effectiveUser.id) : null;
    const authorSignature = (effectiveUser?.name || effectiveUser?.email || "Usuário").trim();
    const authorEmail = (effectiveUser?.email || "").trim();

    const currentArt = currentArticles.find(a => String(a.id) === currentArtIdStr);
    let finalProposedText = proposedText;

    if (currentArt && !isSuppressing) {
      const originalTextForArt = currentArt.originalText || "";
      const baseMatch = originalTextForArt.match(/(?:^|\\n)\\s*(?:Art\\.|Artigo)\\s*(\\d+)/i);
      if (baseMatch) {
        const baseNum = baseMatch[1];
        let letterIndex = 0;
        let formatApplied = false;

        finalProposedText = proposedText.replace(/(^|\\n)(\\s*)(Art\\.|Artigo)(\\s+)(\\d+)(?:\\s*-\\s*)?([A-Za-z])?(º|°|o|-)?/gi, (match, prefix, spaces, artWord, spaces2, num, existingLetter, suffix) => {
          if (existingLetter || num === baseNum) return match;
          formatApplied = true;
          const letter = String.fromCharCode(65 + letterIndex);
          letterIndex++;
          return \`\${prefix}\${spaces}\${artWord}\${spaces2}\${baseNum}\${letter}\${suffix || 'º'}\`;
        });

        if (formatApplied) {
          showToast("Formatação Automática", "A numeração de novos artigos foi ajustada para letras maiúsculas (padrão de técnica legislativa).", "info");
        }
      }
    }

    try {`;

content = content.replace(search, replace);

content = content.replace(/proposedText: isSuppressing \? "" : proposedText/g, 'proposedText: isSuppressing ? "" : finalProposedText');

fs.writeFileSync(file, content, 'utf8');
