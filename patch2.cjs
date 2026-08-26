const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add isSuppressing state
content = content.replace(
  'const [proposedText, setProposedText] = useState("");',
  'const [proposedText, setProposedText] = useState("");\n  const [isSuppressing, setIsSuppressing] = useState(false);'
);

// Update handleStartContribute
content = content.replace(
  '    setProposedText(baseText);\n    setJustification("");',
  '    setProposedText(baseText);\n    setIsSuppressing(false);\n    setJustification("");'
);

// Update handleStartEditContribution
content = content.replace(
  '    setProposedText(contrib.proposedText || "");\n    setJustification(contrib.justification || "");',
  '    setProposedText(contrib.proposedText || "");\n    setIsSuppressing(!contrib.proposedText || contrib.proposedText.trim() === "");\n    setJustification(contrib.justification || "");'
);

// Update validation
content = content.replace(
  '    if (!proposedText.trim() || !justification.trim()) {\n      showToast("Aviso", "Preencha o texto da contribuição e a justificativa.", "warning");',
  '    if ((!isSuppressing && !proposedText.trim()) || !justification.trim()) {\n      showToast("Aviso", "Preencha a proposta de alteração (ou marque a opção de supressão) e a justificativa técnica.", "warning");'
);

// Update body in PUT
content = content.replace(
  '          body: JSON.stringify({\n            proposedText,\n            justification,',
  '          body: JSON.stringify({\n            proposedText: isSuppressing ? "" : proposedText,\n            justification,'
);
// Update body in PUT (client state)
content = content.replace(
  '                userId: currentUserId,\n                proposedText,\n                justification,',
  '                userId: currentUserId,\n                proposedText: isSuppressing ? "" : proposedText,\n                justification,'
);

// Update cleanup in PUT
content = content.replace(
  '          setProposedText("");\n          setJustification("");\n          setContributingArticleId(null);',
  '          setProposedText("");\n          setIsSuppressing(false);\n          setJustification("");\n          setContributingArticleId(null);'
);

// Note: Need to update POST as well
// Let's check the POST part.
fs.writeFileSync(file, content, 'utf8');
