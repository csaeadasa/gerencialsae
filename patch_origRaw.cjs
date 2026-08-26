const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const search = `                const baseLabelSource = (art.originalText && art.originalText.trim()) || (art.finalText && art.finalText.trim()) || "";
                const artLabel = extractArticleLabel(baseLabelSource, art.order || idx + 1);
                
                const origRaw = (art.originalText || "").trim();`;

const replace = `                const baseLabelSource = (art.originalText && art.originalText.trim()) || (art.proposedText && art.proposedText.trim()) || (art.finalText && art.finalText.trim()) || "";
                const artLabel = extractArticleLabel(baseLabelSource, art.order || idx + 1);
                
                const origRaw = (art.originalText || art.proposedText || "").trim();`;

content = content.replace(search, replace);
fs.writeFileSync(file, content, 'utf8');
