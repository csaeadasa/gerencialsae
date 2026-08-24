const fs = require('fs');
const ts = require('typescript');

const content = fs.readFileSync('src/components/TomadaSubsidiosTab.tsx', 'utf8');
const sourceFile = ts.createSourceFile(
  'TomadaSubsidiosTab.tsx',
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function traverse(node) {
  if (node.kind === ts.SyntaxKind.JsxElement) {
     const open = node.openingElement.tagName.getText();
     const close = node.closingElement.tagName.getText();
     if (open !== close) {
        console.log(`Mismatch at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line}: <${open}>...</${close}>`);
     }
  }
  ts.forEachChild(node, traverse);
}
traverse(sourceFile);
console.log('Done');
