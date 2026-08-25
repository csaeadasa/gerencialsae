import fs from 'fs';
async function test() {
  try {
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default.PDFParse || pdfParseModule.default;
    const dataBuffer = fs.readFileSync('test.pdf');
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    await parser.destroy();
    console.log(data);
  } catch(e) {
    console.error("ERRO:", e);
  }
}
test();
