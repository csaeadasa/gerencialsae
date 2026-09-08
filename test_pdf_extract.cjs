const fs = require('fs');
fs.writeFileSync('dummy.pdf', '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

async function test() {
  const pdfModule = require('pdf-parse');
  try {
    const PDFParse = pdfModule.PDFParse;
    const parser = new PDFParse({ data: fs.readFileSync('dummy.pdf') });
    const result = await parser.getText();
    console.log(result);
  } catch(e) {
    console.error("error: ", e);
  }
}
test();
