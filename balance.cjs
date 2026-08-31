const fs = require('fs');
const content = fs.readFileSync('src/components/TomadaSubsidiosTab.tsx', 'utf-8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<>')) {
    console.log(`Opened at ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('</>')) {
    console.log(`Closed at ${i + 1}: ${line.trim()}`);
  }
}
