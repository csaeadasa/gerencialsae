import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

async function test() {
  try {
    const dataBuffer = fs.readFileSync('sample.pdf');
    const data = await pdfParse(dataBuffer);
    console.log(data.text);
  } catch (e) {
    console.error("ERRO:", e);
  }
}
test();
