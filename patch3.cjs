const fs = require('fs');
const file = 'src/components/TomadaSubsidiosTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update POST body
content = content.replace(
  '          authorName: authorSignature,\n          authorEmail,\n          proposedText,\n          justification,',
  '          authorName: authorSignature,\n          authorEmail,\n          proposedText: isSuppressing ? "" : proposedText,\n          justification,'
);

// Update POST client state
content = content.replace(
  '              authorName: authorSignature,\n              proposedText,\n              justification,',
  '              authorName: authorSignature,\n              proposedText: isSuppressing ? "" : proposedText,\n              justification,'
);

// Update cleanup in POST
content = content.replace(
  '          showToast("Sucesso", "Sua proposta de alteração foi registrada!", "success");\n          setProposedText("");',
  '          showToast("Sucesso", "Sua proposta de alteração foi registrada!", "success");\n          setProposedText("");\n          setIsSuppressing(false);'
);

fs.writeFileSync(file, content, 'utf8');
