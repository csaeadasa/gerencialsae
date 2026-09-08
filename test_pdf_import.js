async function run() {
  try {
    const pdfParseModule = await import("pdf-parse");
    console.log("pdfParseModule:", pdfParseModule);
    console.log("keys:", Object.keys(pdfParseModule));
    const pdf = pdfParseModule.default || pdfParseModule;
    console.log("pdf function?", typeof pdf);
    if (pdfParseModule.default) {
       console.log("default type:", typeof pdfParseModule.default);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
