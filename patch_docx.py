import re

with open('src/lib/exportMinutaDocx.ts', 'r') as f:
    text = f.read()

# 1. Update buildCorpoNormaPlainText
# Let's find: `    // 1. Acréscimos`
# We need to insert Ementa and Considerandos before it.

plain_text_insertion = """
    // 0.1 Ementa Alterada
    if (options.ementaArticlesFinal && options.ementaArticlesFinal.length > 0) {
      text += `Art. ${artigoAtoIndex}º. A Ementa da ${resolucoesAlteradas} passa a vigorar com a seguinte redação:\\n\\n`;
      text += `${options.ementaArticlesFinal[0].finalText || ""}\\n\\n`;
      artigoAtoIndex++;
    }

    // 0.2 Considerandos Alterados
    if (options.considerandosArticlesFinal && options.considerandosArticlesFinal.length > 0) {
      text += `Art. ${artigoAtoIndex}º. Os Considerandos da ${resolucoesAlteradas} passam a vigorar com as seguintes redações:\\n\\n`;
      text += `${options.considerandosArticlesFinal[0].finalText || ""}\\n\\n`;
      artigoAtoIndex++;
    }
"""

text = text.replace("    // 1. Acréscimos\n", plain_text_insertion + "    // 1. Acréscimos\n")


# 2. Update generateMinutaDocxBlob
# Let's find: `    // 7.1. Seção 1: Acréscimos (Art. 1º)`
# We need to insert Ementa and Considerandos before it.

docx_insertion = """
    // 7.0.1. Ementa Alterada
    if (options.ementaArticlesFinal && options.ementaArticlesFinal.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 160, after: 120, line: 280 },
          children: [
            new TextRun({ text: `Art. ${artigoAtoIndex}º. `, bold: true, font: FONT_FAMILY, size: BASE_FONT_SIZE }),
            new TextRun({ text: `A Ementa da ${resolucoesAlteradas} passa a vigorar com a seguinte redação:`, font: FONT_FAMILY, size: BASE_FONT_SIZE }),
          ],
        })
      );
      artigoAtoIndex++;
      
      const lines = (options.ementaArticlesFinal[0].finalText || "").split("\\n");
      lines.forEach(line => {
        const p = createParagraphFromNormativeLine(line, { isIndentedBlock: true, fontFamily: FONT_FAMILY, baseFontSize: BASE_FONT_SIZE });
        if (p) children.push(p);
      });
    }

    // 7.0.2. Considerandos Alterados
    if (options.considerandosArticlesFinal && options.considerandosArticlesFinal.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 160, after: 120, line: 280 },
          children: [
            new TextRun({ text: `Art. ${artigoAtoIndex}º. `, bold: true, font: FONT_FAMILY, size: BASE_FONT_SIZE }),
            new TextRun({ text: `Os Considerandos da ${resolucoesAlteradas} passam a vigorar com as seguintes redações:`, font: FONT_FAMILY, size: BASE_FONT_SIZE }),
          ],
        })
      );
      artigoAtoIndex++;
      
      const lines = (options.considerandosArticlesFinal[0].finalText || "").split("\\n");
      lines.forEach(line => {
        const p = createParagraphFromNormativeLine(line, { isIndentedBlock: true, fontFamily: FONT_FAMILY, baseFontSize: BASE_FONT_SIZE });
        if (p) children.push(p);
      });
    }
"""

text = text.replace("    // 7.1. Seção 1: Acréscimos (Art. 1º)\n", docx_insertion + "    // 7.1. Seção 1: Acréscimos (Art. 1º)\n")

with open('src/lib/exportMinutaDocx.ts', 'w') as f:
    f.write(text)

print("exportMinutaDocx reordered!")
