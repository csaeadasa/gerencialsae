const fs = require('fs');
const js = fs.readFileSync('dist/assets/index-DZunAG4I.js', 'utf-8');
const regex = /lineNumber:\s*(\d+)/g;
let match;
let lines = [];
while ((match = regex.exec(js)) !== null) {
  lines.push(parseInt(match[1]));
}
lines.sort((a,b) => a-b);
let uniqueLines = [...new Set(lines)];
console.log(uniqueLines.length);
