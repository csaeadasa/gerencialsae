const fs = require('fs');
const pdf = require('pdf-parse');

async function parse() {
  try {
    const file = process.argv[2];
    const dataBuffer = fs.readFileSync(file);
    const data = await pdf(dataBuffer);
    console.log(JSON.stringify({ success: true, text: data.text }));
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
  }
}
parse();
