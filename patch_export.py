with open('src/lib/exportMinutaDocx.ts', 'r') as f:
    content = f.read()

bad1 = """  vigencia: string;
  assinante: string;
  textArticlesWithFinalText: any[];
  articlesWithAcrescidos: any[];
  articlesWithAlterados: any[];
  articlesWithRevogados: any[];
  tableArticlesWithFinalText: any[];
  tableInfos: any[];"""

good1 = """  vigencia: string;
  assinante: string;
  textArticlesWithFinalText: any[];
  articlesWithAcrescidos: any[];
  articlesWithAlterados: any[];
  articlesWithRevogados: any[];
  tableArticlesWithFinalText: any[];
  tableInfos: any[];
  ementaArticlesFinal?: any[];
  considerandosArticlesFinal?: any[];"""

content = content.replace(bad1, good1)

bad2 = """      const artTableIndex = tableArticlesWithFinalText.length > 0 ? articleCounter++ : null;
      const artVigenciaIndex = articleCounter;"""

good2 = """      const artTableIndex = tableArticlesWithFinalText.length > 0 ? articleCounter++ : null;
      const artEmentaIndex = (options.ementaArticlesFinal && options.ementaArticlesFinal.length > 0) ? articleCounter++ : null;
      const artConsiderandosIndex = (options.considerandosArticlesFinal && options.considerandosArticlesFinal.length > 0) ? articleCounter++ : null;
      const artVigenciaIndex = articleCounter;"""

content = content.replace(bad2, good2)

bad3 = """      // 5. ARTIGO DE VIGÊNCIA (Alteração)
      docChildren.push(
        new Paragraph({"""

good3 = """      // 4.5. EMENTA ALTERADA
      if (options.ementaArticlesFinal && options.ementaArticlesFinal.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 425 },
            children: [
              new TextRun({ text: `Art. ${artEmentaIndex}º. `, bold: true }),
              new TextRun({ text: `A Ementa da ${resolucoesAlteradas} passa a vigorar com a seguinte redação:` }),
            ],
          })
        );
        docChildren.push(...createIndentedNormativeBlock(options.ementaArticlesFinal[0].finalText || ""));
      }

      // 4.6. CONSIDERANDOS ALTERADOS
      if (options.considerandosArticlesFinal && options.considerandosArticlesFinal.length > 0) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 240, after: 120 },
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 425 },
            children: [
              new TextRun({ text: `Art. ${artConsiderandosIndex}º. `, bold: true }),
              new TextRun({ text: `Os Considerandos da ${resolucoesAlteradas} passam a vigorar com as seguintes redações:` }),
            ],
          })
        );
        docChildren.push(...createIndentedNormativeBlock(options.considerandosArticlesFinal[0].finalText || ""));
      }

      // 5. ARTIGO DE VIGÊNCIA (Alteração)
      docChildren.push(
        new Paragraph({"""

content = content.replace(bad3, good3)

with open('src/lib/exportMinutaDocx.ts', 'w') as f:
    f.write(content)
