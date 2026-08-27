import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  convertMillimetersToTwip,
} from "docx";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { RegulatoryTable } from "./tableStructure";

export interface ExportMinutaDocxOptions {
  tipoAto: string;
  numero: string;
  data: string;
  ementa: string;
  processoSEI: string;
  meioParticipacao: string;
  consultNumber: string;
  considerandos: string;
  model: "nova" | "alteracao";
  resolucoesAlteradas: string;
  vigencia: string;
  assinante: string;
  
  // Model: Nova
  textArticlesWithFinalText: Array<{
    id: string | number;
    finalText?: string;
    proposedText?: string;
    originalText?: string;
    order?: number;
  }>;

  // Model: Alteração
  articlesWithAcrescidos: Array<{
    artLabel: string;
    isEntireArticleNew: boolean;
    blockText: string;
  }>;
  articlesWithAlterados: Array<{
    artLabel: string;
    blockText: string;
  }>;
  formattedAlteradosLabels: string;
  revogadosBlockText?: string;

  // Tables
  tableArticlesCount: number;
  tableInfos: Array<{
    title: string;
    identifier: string;
    parsedTable: RegulatoryTable;
  }>;

  // Optional Custom Template ArrayBuffer (uploaded by user)
  customTemplateBuffer?: ArrayBuffer | Uint8Array;
}

export function isChapterOrSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^(CAP[ÍI]TULO|T[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|LIVRO)\s+([IVXLCDM0-9]+|ÚNICO|UNICO)(\s*[\-\–\—\:]\s*.*|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-\–\—\:\,\.]+)?$/i.test(trimmed);
}

export function isChapterSubtitle(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^(DO|DA|DOS|DAS|DE|DISPOSI[ÇC][ÕO]ES|DISPOSI[ÇC][ÃA]O)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\-\–\—\:\,\.]+$/i.test(trimmed) && trimmed.length < 120 && trimmed === trimmed.toUpperCase();
}

export function parseNormativePrefix(trimmed: string): { prefix: string; rest: string } | null {
  const artMatch = trimmed.match(
    /^(“?\s*Art\.\s*[0-9]+[ºA-Za-z\.\-_]*\s*[\.-]?|“?\s*\§\s*[0-9]+[ºA-Za-z\.\-_]*\s*[\.-]?|“?\s*Parágrafo\s+único[\.-]?|“?\s*[IVXLCDM]+\s*[\.-]|“?\s*[a-z]\)\s*)/i
  );
  if (artMatch) {
    return {
      prefix: artMatch[0],
      rest: trimmed.substring(artMatch[0].length),
    };
  }
  return null;
}

function createParagraphFromNormativeLine(
  line: string,
  options: {
    isIndentedBlock?: boolean;
    fontFamily?: string;
    baseFontSize?: number;
  } = {}
): Paragraph | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const font = options.fontFamily || "Times New Roman";
  const size = options.baseFontSize || 24;

  if (isChapterOrSectionHeader(trimmed) || isChapterSubtitle(trimmed)) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120, line: 280 },
      children: [
        new TextRun({
          text: trimmed,
          bold: true,
          font: font,
          size: size,
          color: "000000",
        }),
      ],
    });
  }

  const parsed = parseNormativePrefix(trimmed);
  if (parsed) {
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: options.isIndentedBlock
        ? { left: convertMillimetersToTwip(15), right: convertMillimetersToTwip(10) }
        : { firstLine: convertMillimetersToTwip(20) },
      spacing: { before: 80, after: 120, line: 280 },
      children: [
        new TextRun({
          text: parsed.prefix,
          bold: true,
          font: font,
          size: size,
        }),
        new TextRun({
          text: parsed.rest,
          font: font,
          size: size,
        }),
      ],
    });
  }

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: options.isIndentedBlock
      ? { left: convertMillimetersToTwip(15), right: convertMillimetersToTwip(10) }
      : { firstLine: convertMillimetersToTwip(20) },
    spacing: { before: 60, after: 100, line: 280 },
    children: [
      new TextRun({
        text: trimmed,
        font: font,
        size: size,
      }),
    ],
  });
}

export function buildCorpoNormaPlainText(options: ExportMinutaDocxOptions): string {
  const {
    model,
    textArticlesWithFinalText,
    articlesWithAcrescidos,
    articlesWithAlterados,
    formattedAlteradosLabels,
    revogadosBlockText,
    resolucoesAlteradas,
    tableInfos,
    vigencia,
  } = options;

  let text = "";

  if (model === "nova") {
    if (textArticlesWithFinalText.length === 0 && tableInfos.length === 0) {
      text += `[Nenhum dispositivo com texto final cadastrado. Salve a revisão e texto final dos dispositivos na aba de Análise Técnica.]\n\n`;
    } else {
      textArticlesWithFinalText.forEach((art) => {
        const body = (art.finalText && art.finalText.trim()) || "";
        if (body) {
          text += `${body.trim()}\n\n`;
        }
      });
    }
  } else {
    let artigoAtoIndex = 1;

    // 1. Acréscimos
    if (articlesWithAcrescidos.length > 0) {
      text += `Art. ${artigoAtoIndex}º. A ${resolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:\n\n`;
      articlesWithAcrescidos.forEach((ana) => {
        if (ana.blockText) {
          text += `${ana.blockText.trim()}\n\n`;
        }
      });
      artigoAtoIndex++;
    }

    // 2. Alterações
    if (articlesWithAlterados.length > 0) {
      const isSingular =
        articlesWithAlterados.length === 1 &&
        !formattedAlteradosLabels.startsWith("Cláusula") &&
        !formattedAlteradosLabels.startsWith("Tabela");

      if (isSingular) {
        text += `Art. ${artigoAtoIndex}º. O art. ${formattedAlteradosLabels}, da ${resolucoesAlteradas}, passa a vigorar com a seguinte redação:\n\n`;
      } else {
        text += `Art. ${artigoAtoIndex}º. Os artigos ${formattedAlteradosLabels}, da ${resolucoesAlteradas}, passam a vigorar com as seguintes redações:\n\n`;
      }

      articlesWithAlterados.forEach((ana) => {
        if (ana.blockText) {
          text += `${ana.blockText.trim()}\n\n`;
        }
      });
      artigoAtoIndex++;
    }

    // 3. Revogações
    if (revogadosBlockText && revogadosBlockText.trim()) {
      text += `Art. ${artigoAtoIndex}º. ${revogadosBlockText.trim()}\n\n`;
      artigoAtoIndex++;
    }

    // 4. Tabelas Alteradas
    if (tableInfos.length > 0) {
      if (tableInfos.length === 1) {
        text += `Art. ${artigoAtoIndex}º. A Tabela ${tableInfos[0].identifier}, do Anexo da ${resolucoesAlteradas}, passa a vigorar com a redação dada pelo Anexo desta Resolução.\n\n`;
      } else {
        const tableListStr = tableInfos.map(t => t.identifier).join(", ");
        text += `Art. ${artigoAtoIndex}º. As Tabelas ${tableListStr}, do Anexo da ${resolucoesAlteradas}, passam a vigorar com a redação dada pelo Anexo desta Resolução.\n\n`;
      }
      artigoAtoIndex++;
    }

    // 5. Vigência
    const cleanVigencia = vigencia.trim() || "Esta Resolução entra em vigor na data de sua publicação.";
    text += `Art. ${artigoAtoIndex}º. ${cleanVigencia}\n\n`;
  }

  return text.trim();
}

function buildAnexoPlainText(tableInfos: ExportMinutaDocxOptions["tableInfos"]): string {
  if (tableInfos.length === 0) return "";
  let text = "";
  tableInfos.forEach((tbl) => {
    text += `${tbl.title}\n\n`;
    const headers = tbl.parsedTable.headers || [];
    const rows = tbl.parsedTable.rows || [];
    text += headers.join("\t") + "\n";
    rows.forEach(r => {
      text += r.join("\t") + "\n";
    });
    text += "\n";
  });
  return text.trim();
}

export async function generateMinutaDocxBlob(options: ExportMinutaDocxOptions): Promise<Blob> {
  // If user provided a custom Word template (.docx / .dotx)
  if (options.customTemplateBuffer) {
    try {
      const zip = new PizZip(options.customTemplateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });

      const cleanTipoAto = (options.tipoAto || "RESOLUÇÃO").toUpperCase();
      const tituloAto = `${cleanTipoAto} Nº ${options.numero}, DE ${options.data}.`;
      const corpoNorma = buildCorpoNormaPlainText(options);
      const anexoTexto = buildAnexoPlainText(options.tableInfos);
      const preambulo = `O DIRETOR-PRESIDENTE DA AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL – Adasa, Ad Referendum da Diretoria Colegiada, no uso das atribuições que lhe confere o art. 7º, inciso III, do Regimento Interno desta Agência, aprovado pela Resolução nº 16, de 17 de setembro de 2014, tendo em vista o que dispõe o art. 23, inciso II e VII, da Lei n.º 4.285, 26 de dezembro de 2008, o constante no processo SEI nº ${options.processoSEI || "00197-00000000/2026-00"}, as contribuições da ${options.meioParticipacao || "Consulta Pública"} nº ${options.consultNumber || "001/2026"}, e`;

      doc.render({
        // Standard tags commonly found in Word templates
        tipo_ato: cleanTipoAto,
        tipoAto: cleanTipoAto,
        numero: options.numero,
        data: options.data,
        titulo: tituloAto,
        titulo_ato: tituloAto,
        ementa: options.ementa || "",
        processo_sei: options.processoSEI || "",
        processoSEI: options.processoSEI || "",
        preambulo: preambulo,
        considerandos: options.considerandos || "",
        corpo: corpoNorma,
        texto_corpo: corpoNorma,
        artigos: corpoNorma,
        dispositivos: corpoNorma,
        resolucao: corpoNorma,
        resolucao_alterada: options.resolucoesAlteradas || "",
        vigencia: options.vigencia || "",
        assinante: options.assinante || "DIRETOR-PRESIDENTE",
        anexo: anexoTexto,
        tabelas: anexoTexto,
      });

      const outBuffer = doc.getZip().generate({
        type: "uint8array",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      return new Blob([outBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
    } catch (templateError) {
      console.warn("Erro ao preencher tags no template Word customizado. Gerando documento pelo formatador estruturado padrão.", templateError);
      // If template tags rendering fails, fallback to generate structured native document below
    }
  }

  // Native docx generation with standard typography & tables
  const {
    tipoAto,
    numero,
    data,
    ementa,
    processoSEI,
    meioParticipacao,
    consultNumber,
    considerandos,
    model,
    resolucoesAlteradas,
    vigencia,
    assinante,
    textArticlesWithFinalText,
    articlesWithAcrescidos,
    articlesWithAlterados,
    formattedAlteradosLabels,
    revogadosBlockText,
    tableArticlesCount,
    tableInfos,
  } = options;

  const children: Array<Paragraph | Table> = [];

  const FONT_FAMILY = "Times New Roman";
  const BASE_FONT_SIZE = 24; // 12pt in half-points
  const EMENTA_FONT_SIZE = 20; // 10pt in half-points
  const TABLE_FONT_SIZE = 20; // 10pt in half-points
  const HEADER_FONT_SIZE = 22; // 11pt in half-points

  // 1. Título do Ato Normativo (ex.: RESOLUÇÃO Nº 01, DE 27 DE AGOSTO DE 2026)
  const cleanTipoAto = (tipoAto || "RESOLUÇÃO").toUpperCase();
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 240, line: 280 },
      children: [
        new TextRun({
          text: `${cleanTipoAto} Nº ${numero}, DE ${data}.`,
          bold: true,
          font: FONT_FAMILY,
          size: BASE_FONT_SIZE,
          color: "000000",
        }),
      ],
    })
  );

  // 3. Ementa da Resolução (Alinhada com recuo à esquerda de 7.5cm / 4252 twips)
  if (ementa && ementa.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: convertMillimetersToTwip(75) },
        spacing: { before: 120, after: 280, line: 240 },
        children: [
          new TextRun({
            text: ementa.trim(),
            italics: true,
            font: FONT_FAMILY,
            size: EMENTA_FONT_SIZE,
            color: "1e293b",
          }),
        ],
      })
    );
  }

  // 4. Preâmbulo Oficial
  const preambuloText = `O DIRETOR-PRESIDENTE DA AGÊNCIA REGULADORA DE ÁGUAS, ENERGIA E SANEAMENTO BÁSICO DO DISTRITO FEDERAL – Adasa, Ad Referendum da Diretoria Colegiada, no uso das atribuições que lhe confere o art. 7º, inciso III, do Regimento Interno desta Agência, aprovado pela Resolução nº 16, de 17 de setembro de 2014, tendo em vista o que dispõe o art. 23, inciso II e VII, da Lei n.º 4.285, 26 de dezembro de 2008, o constante no processo SEI nº ${processoSEI || "00197-00000000/2026-00"}, as contribuições da ${meioParticipacao || "Consulta Pública"} nº ${consultNumber || "001/2026"}, e`;

  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent: { firstLine: convertMillimetersToTwip(20) },
      spacing: { before: 120, after: 180, line: 280 },
      children: [
        new TextRun({
          text: preambuloText,
          font: FONT_FAMILY,
          size: BASE_FONT_SIZE,
        }),
      ],
    })
  );

  // 5. Considerandos (se houver)
  if (considerandos && considerandos.trim()) {
    const considerandosList = considerandos.split("\n").filter(c => c.trim());
    considerandosList.forEach(c => {
      const cleanC = c.trim().replace(/;$/, "");
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 60, after: 120, line: 280 },
          children: [
            new TextRun({
              text: `${cleanC};`,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );
    });
  }

  // 6. RESOLVE:
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      indent: { firstLine: convertMillimetersToTwip(20) },
      spacing: { before: 180, after: 200, line: 280 },
      children: [
        new TextRun({
          text: "RESOLVE:",
          bold: true,
          font: FONT_FAMILY,
          size: BASE_FONT_SIZE,
        }),
      ],
    })
  );

  // 7. Corpo da Norma
  if (model === "nova") {
    // Modelo de Nova Norma
    if (textArticlesWithFinalText.length === 0 && tableArticlesCount === 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 120, after: 120, line: 280 },
          children: [
            new TextRun({
              text: "[Nenhum dispositivo com texto final cadastrado. Salve a revisão e texto final dos dispositivos na aba de Análise Técnica.]",
              italics: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
              color: "64748B",
            }),
          ],
        })
      );
    } else {
      textArticlesWithFinalText.forEach(art => {
        const body = (art.finalText && art.finalText.trim()) || "";
        if (!body) return;

        const articleParagraphs = body.split("\n").filter(p => p.trim());
        articleParagraphs.forEach(pText => {
          const p = createParagraphFromNormativeLine(pText, {
            isIndentedBlock: false,
            fontFamily: FONT_FAMILY,
            baseFontSize: BASE_FONT_SIZE,
          });
          if (p) children.push(p);
        });
      });
    }
  } else {
    // Modelo de Alteração de Norma Existente
    let artigoAtoIndex = 1;

    // 7.1. Seção 1: Acréscimos (Art. 1º)
    if (articlesWithAcrescidos.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 140, after: 120, line: 280 },
          children: [
            new TextRun({
              text: `Art. ${artigoAtoIndex}º. `,
              bold: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
            new TextRun({
              text: `A ${resolucoesAlteradas}, passa a vigorar acrescida dos seguintes artigos:`,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );
      artigoAtoIndex++;

      articlesWithAcrescidos.forEach(ana => {
        if (!ana.blockText) return;
        const lines = ana.blockText.split("\n");
        lines.forEach(line => {
          const p = createParagraphFromNormativeLine(line, {
            isIndentedBlock: true,
            fontFamily: FONT_FAMILY,
            baseFontSize: BASE_FONT_SIZE,
          });
          if (p) children.push(p);
        });
      });
    }

    // 7.2. Seção 2: Novas Redações (Art. 2º)
    if (articlesWithAlterados.length > 0) {
      const isSingular =
        articlesWithAlterados.length === 1 &&
        !formattedAlteradosLabels.startsWith("Cláusula") &&
        !formattedAlteradosLabels.startsWith("Tabela");

      const preambleText = isSingular
        ? `O art. ${formattedAlteradosLabels}, da ${resolucoesAlteradas}, passa a vigorar com a seguinte redação:`
        : `Os artigos ${formattedAlteradosLabels}, da ${resolucoesAlteradas}, passam a vigorar com as seguintes redações:`;

      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 160, after: 120, line: 280 },
          children: [
            new TextRun({
              text: `Art. ${artigoAtoIndex}º. `,
              bold: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
            new TextRun({
              text: preambleText,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );
      artigoAtoIndex++;

      articlesWithAlterados.forEach(ana => {
        if (!ana.blockText) return;
        const lines = ana.blockText.split("\n");
        lines.forEach(line => {
          const p = createParagraphFromNormativeLine(line, {
            isIndentedBlock: true,
            fontFamily: FONT_FAMILY,
            baseFontSize: BASE_FONT_SIZE,
          });
          if (p) children.push(p);
        });
      });
    }

    // 7.3. Seção 3: Revogações (Art. 3º)
    if (revogadosBlockText && revogadosBlockText.trim()) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 160, after: 120, line: 280 },
          children: [
            new TextRun({
              text: `Art. ${artigoAtoIndex}º. `,
              bold: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
            new TextRun({
              text: revogadosBlockText.trim(),
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );
      artigoAtoIndex++;
    }

    // 7.4. Seção 3.5: Tabelas do Anexo da Resolução Alterada
    if (tableInfos.length > 0) {
      const tableSentence =
        tableInfos.length === 1
          ? `A Tabela ${tableInfos[0].identifier}, do Anexo da ${resolucoesAlteradas}, passa a vigorar com a redação dada pelo Anexo desta Resolução.`
          : `As Tabelas ${tableInfos.map(t => t.identifier).join(", ")}, do Anexo da ${resolucoesAlteradas}, passam a vigorar com a redação dada pelo Anexo desta Resolução.`;

      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: convertMillimetersToTwip(20) },
          spacing: { before: 160, after: 120, line: 280 },
          children: [
            new TextRun({
              text: `Art. ${artigoAtoIndex}º. `,
              bold: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
            new TextRun({
              text: tableSentence,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );
      artigoAtoIndex++;
    }

    // 7.5. Seção 4: Artigo de Vigência
    const cleanVigencia = vigencia.trim() || "Esta Resolução entra em vigor na data de sua publicação.";
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertMillimetersToTwip(20) },
        spacing: { before: 160, after: 240, line: 280 },
        children: [
          new TextRun({
            text: `Art. ${artigoAtoIndex}º. `,
            bold: true,
            font: FONT_FAMILY,
            size: BASE_FONT_SIZE,
          }),
          new TextRun({
            text: cleanVigencia,
            font: FONT_FAMILY,
            size: BASE_FONT_SIZE,
          }),
        ],
      })
    );
  }

  // 8. Fecho / Assinatura
  const cleanAssinante = assinante.trim() || "DIRETOR-PRESIDENTE";
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 60, line: 260 },
      children: [
        new TextRun({
          text: cleanAssinante,
          bold: true,
          font: FONT_FAMILY,
          size: BASE_FONT_SIZE,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240, line: 240 },
      children: [
        new TextRun({
          text: "Agência Reguladora de Águas, Energia e Saneamento Básico do Distrito Federal - Adasa",
          font: FONT_FAMILY,
          size: HEADER_FONT_SIZE,
          color: "475569",
        }),
      ],
    })
  );

  // 9. Seção de Anexo(s) com Tabelas Normativas Aprovadas
  if (tableInfos.length > 0) {
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 180, line: 280 },
        children: [
          new TextRun({
            text: tableInfos.length > 1 ? "ANEXO I" : "ANEXO",
            bold: true,
            font: FONT_FAMILY,
            size: 28,
          }),
        ],
      })
    );

    const cellBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: "94A3B8",
    };

    const cellBorders = {
      top: cellBorder,
      bottom: cellBorder,
      left: cellBorder,
      right: cellBorder,
    };

    tableInfos.forEach((tbl) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 140, line: 260 },
          children: [
            new TextRun({
              text: tbl.title.toUpperCase(),
              bold: true,
              font: FONT_FAMILY,
              size: BASE_FONT_SIZE,
            }),
          ],
        })
      );

      const tableData = tbl.parsedTable;
      const headers = tableData.headers && tableData.headers.length > 0 ? tableData.headers : ["Item", "Descrição", "Valor"];
      const rows = tableData.rows && tableData.rows.length > 0 ? tableData.rows : [["1", "-", "-"]];

      const wordTableRows: TableRow[] = [];

      wordTableRows.push(
        new TableRow({
          tableHeader: true,
          children: headers.map((h, colIdx) => {
            const isCodeCol = colIdx === 0 && (h.toLowerCase().includes("item") || h.includes("#") || h.toLowerCase().includes("art") || h.toLowerCase().includes("código") || h.toLowerCase().includes("codigo"));
            const isValueCol = colIdx === headers.length - 1 && (h.toLowerCase().includes("fator") || h.toLowerCase().includes("valor") || h.toLowerCase().includes("coef") || h.toLowerCase().includes("mult"));

            return new TableCell({
              borders: cellBorders,
              shading: { fill: "F1F5F9" },
              margins: {
                top: convertMillimetersToTwip(2.5),
                bottom: convertMillimetersToTwip(2.5),
                left: convertMillimetersToTwip(3),
                right: convertMillimetersToTwip(3),
              },
              children: [
                new Paragraph({
                  alignment: isCodeCol || isValueCol ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: h.trim() || `Coluna ${colIdx + 1}`,
                      bold: true,
                      font: FONT_FAMILY,
                      size: TABLE_FONT_SIZE,
                      color: "0F172A",
                    }),
                  ],
                }),
              ],
            });
          }),
        })
      );

      rows.forEach((row, rIdx) => {
        const isZebra = rIdx % 2 === 1;
        wordTableRows.push(
          new TableRow({
            children: headers.map((_, colIdx) => {
              const cellText = row[colIdx] !== undefined ? String(row[colIdx]) : "";
              const h = headers[colIdx] || "";
              const isCodeCol = colIdx === 0 && (h.toLowerCase().includes("item") || h.includes("#") || h.toLowerCase().includes("art") || h.toLowerCase().includes("código") || h.toLowerCase().includes("codigo"));
              const isValueCol = colIdx === headers.length - 1 && (h.toLowerCase().includes("fator") || h.toLowerCase().includes("valor") || h.toLowerCase().includes("coef") || h.toLowerCase().includes("mult"));

              return new TableCell({
                borders: cellBorders,
                shading: isZebra ? { fill: "F8FAFC" } : undefined,
                margins: {
                  top: convertMillimetersToTwip(2),
                  bottom: convertMillimetersToTwip(2),
                  left: convertMillimetersToTwip(3),
                  right: convertMillimetersToTwip(3),
                },
                children: [
                  new Paragraph({
                    alignment: isCodeCol || isValueCol ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [
                      new TextRun({
                        text: cellText.trim(),
                        font: FONT_FAMILY,
                        size: TABLE_FONT_SIZE,
                        color: "1E293B",
                      }),
                    ],
                  }),
                ],
              });
            }),
          })
        );
      });

      children.push(
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: wordTableRows,
        })
      );

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: [],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(30),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
