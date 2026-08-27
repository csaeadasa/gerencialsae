/**
 * Utilitários para suporte a dispositivos em formato de Tabela / Matriz de Dados
 * no módulo de Participação Social e Tomada de Subsídios.
 */

export interface RegulatoryTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface CellDiff {
  rowIndex: number;
  colIndex: number;
  oldValue: string;
  newValue: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface TableDiffResult {
  hasChanges: boolean;
  totalChangedCells: number;
  addedRowsCount: number;
  removedRowsCount: number;
  cellDiffs: Record<string, CellDiff>; // key: `${rowIndex}_${colIndex}`
  headerDiffs: Record<number, { oldValue: string; newValue: string; modified: boolean }>;
}

export const DEFAULT_TABLE_TEMPLATES: { name: string; description: string; data: RegulatoryTable }[] = [
  {
    name: "Estrutura Tarifária",
    description: "Tarifas por categoria e faixas de consumo de água/esgoto",
    data: {
      title: "Tabela Tarifária - Serviços de Abastecimento de Água e Esgoto",
      headers: ["Categoria de Usuário", "Faixa de Consumo (m³/mês)", "Tarifa Vigente (R$/m³)", "Tarifa Proposta (R$/m³)", "Variação (%)"],
      rows: [
        ["Residencial Padrão", "0 a 10", "3,85", "4,15", "+7,79%"],
        ["Residencial Padrão", "11 a 25", "5,90", "6,35", "+7,63%"],
        ["Residencial Padrão", "26 a 50", "9,80", "10,50", "+7,14%"],
        ["Comercial / Industrial", "0 a 10", "6,50", "7,00", "+7,69%"],
        ["Comercial / Industrial", "Acima de 10", "11,20", "12,05", "+7,59%"],
        ["Pública", "Única", "8,40", "9,05", "+7,74%"]
      ]
    }
  },
  {
    name: "Cronograma de Metas",
    description: "Metas progressivas de atendimento ou universalização",
    data: {
      title: "Quadro de Metas Progressivas de Universalização e Atendimento",
      headers: ["Indicador de Desempenho", "Unidade", "2026", "2027", "2028", "2029", "2030"],
      rows: [
        ["Índice de Atendimento de Água (IN055)", "%", "99,0%", "99,2%", "99,4%", "99,7%", "99,9%"],
        ["Índice de Coleta de Esgoto (IN056)", "%", "92,5%", "94,0%", "95,5%", "97,0%", "99,0%"],
        ["Índice de Tratamento de Esgoto (IN046)", "%", "90,0%", "92,0%", "94,0%", "96,0%", "98,0%"],
        ["Índice de Perdas na Distribuição (IN049)", "%", "31,0%", "29,5%", "28,0%", "26,5%", "25,0%"]
      ]
    }
  },
  {
    name: "Padrões de Qualidade",
    description: "Parâmetros e limites regulatórios de conformidade",
    data: {
      title: "Parâmetros de Qualidade e Limites Regulatórios",
      headers: ["Parâmetro Físico-Químico", "Unidade", "VMR Vigente", "VMR Proposto", "Frequência Mínima"],
      rows: [
        ["Turbidez na Saída do Tratamento", "uT", "≤ 0,5", "≤ 0,3", "A cada 2 horas"],
        ["Cloro Residual Livre", "mg/L", "0,2 a 2,0", "0,5 a 2,0", "Contínua"],
        ["pH da Água Tratada", "Unidades", "6,0 a 9,0", "6,5 a 8,5", "A cada 2 horas"],
        ["Coliformes Totais", "% ausência", "≥ 95%", "≥ 98%", "Semanal"]
      ]
    }
  },
  {
    name: "Prazos e Sanções",
    description: "Matriz de infrações, penalidades e prazos de regularização",
    data: {
      title: "Classificação de Infrações e Prazos para Correção",
      headers: ["Código", "Descrição da Infração", "Gravidade", "Prazo Correção (dias)", "Multa Base (UFIR/DF)"],
      rows: [
        ["INF-01", "Interrupção injustificada do fornecimento > 24h", "Gravíssima", "1", "15.000"],
        ["INF-02", "Não envio de relatório periódico regulatório", "Média", "10", "3.000"],
        ["INF-03", "Atraso no atendimento a reclamações de vazamento", "Grave", "3", "7.500"]
      ]
    }
  }
];

/**
 * Verifica se um texto representa um JSON de Tabela Regulada válido
 */
export const isTableJson = (text?: string | null): boolean => {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.headers) &&
      Array.isArray(parsed.rows)
    );
  } catch {
    return false;
  }
};

/**
 * Converte string ou objeto para a estrutura RegulatoryTable
 */
export const parseTableData = (text?: string | RegulatoryTable | null, defaultTitle?: string): RegulatoryTable => {
  if (!text) {
    return {
      title: defaultTitle || "Tabela de Dispositivo",
      headers: ["Coluna 1", "Coluna 2", "Coluna 3"],
      rows: [
        ["", "", ""],
        ["", "", ""]
      ]
    };
  }

  if (typeof text === "object") {
    const obj = text as any;
    if (obj && Array.isArray(obj.headers) && Array.isArray(obj.rows)) {
      return {
        title: obj.title || defaultTitle || "Tabela de Dispositivo",
        headers: obj.headers,
        rows: obj.rows
      };
    }
  }

  if (typeof text === "string" && isTableJson(text)) {
    try {
      const parsed = JSON.parse(text);
      return {
        title: parsed.title || defaultTitle || "Tabela de Dispositivo",
        headers: Array.isArray(parsed.headers) ? parsed.headers : ["Coluna 1", "Coluna 2"],
        rows: Array.isArray(parsed.rows) ? parsed.rows : [["", ""]]
      };
    } catch {
      // fallback
    }
  }

  // Se for texto colado delimitado por tabulação (TSV) ou markdown
  return parsePastedSpreadsheet(typeof text === "string" ? text : "", defaultTitle);
};

/**
 * Serializa a tabela para string JSON
 */
export const tableDataToJson = (table: RegulatoryTable): string => {
  return JSON.stringify(
    {
      title: table.title || "",
      headers: table.headers || [],
      rows: table.rows || []
    },
    null,
    2
  );
};

export const serializeTableData = tableDataToJson;

/**
 * Converte tabela para Markdown formatado
 */
export const tableDataToMarkdown = (table: RegulatoryTable): string => {
  if (!table || !table.headers || table.headers.length === 0) return "";
  let md = "";
  if (table.title) {
    md += `### ${table.title}\n\n`;
  }
  md += `| ${table.headers.join(" | ")} |\n`;
  md += `| ${table.headers.map(() => "---").join(" | ")} |\n`;
  for (const row of table.rows) {
    const paddedRow = table.headers.map((_, i) => (row[i] !== undefined && row[i] !== null ? String(row[i]).replace(/\|/g, "\\|") : ""));
    md += `| ${paddedRow.join(" | ")} |\n`;
  }
  return md;
};

/**
 * Converte dados colados de planilhas (Excel, Sheets, Word) em estrutura RegulatoryTable
 */
export const parsePastedSpreadsheet = (rawText: string, defaultTitle?: string): RegulatoryTable => {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return {
      title: defaultTitle || "Tabela de Dispositivo",
      headers: ["Coluna 1", "Coluna 2"],
      rows: [["", ""]]
    };
  }

  // Detecta se é markdown (| Col 1 | Col 2 |)
  if (lines[0].startsWith("|") && lines[0].endsWith("|")) {
    const parsedRows = lines
      .filter(l => !l.match(/^\|?\s*[-:]+[-| :]*\|?$/)) // remove separador |---|---|
      .map(line =>
        line
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map(cell => cell.trim())
      );

    if (parsedRows.length > 0) {
      const headers = parsedRows[0];
      const rows = parsedRows.slice(1);
      return {
        title: defaultTitle || "Tabela de Dispositivo",
        headers,
        rows: rows.length > 0 ? rows : [headers.map(() => "")]
      };
    }
  }

  // Detecta delimitador (tab para Excel/Word, ponto e vírgula ou vírgula)
  let delimiter = "\t";
  if (!lines[0].includes("\t")) {
    if (lines[0].includes(";")) delimiter = ";";
    else if (lines[0].includes(",") && (lines[0].match(/,/g) || []).length > (lines[0].match(/;/g) || []).length) delimiter = ",";
  }

  const parsedMatrix = lines.map(line => line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, "")));

  const headers = parsedMatrix[0];
  const rows = parsedMatrix.slice(1);

  return {
    title: defaultTitle || "Tabela de Dispositivo",
    headers: headers.length > 0 ? headers : ["Coluna 1", "Coluna 2"],
    rows: rows.length > 0 ? rows : [headers.map(() => "")]
  };
};

/**
 * Calcula a matriz de diferenças detalhada entre uma tabela original e uma proposta
 */
export const compareTables = (
  origTable: RegulatoryTable,
  proposedTable: RegulatoryTable
): TableDiffResult => {
  const result: TableDiffResult = {
    hasChanges: false,
    totalChangedCells: 0,
    addedRowsCount: 0,
    removedRowsCount: 0,
    cellDiffs: {},
    headerDiffs: {}
  };

  const maxHeaders = Math.max(origTable.headers.length, proposedTable.headers.length);
  for (let c = 0; c < maxHeaders; c++) {
    const oldH = (origTable.headers[c] || "").trim();
    const newH = (proposedTable.headers[c] || "").trim();
    if (oldH !== newH) {
      result.hasChanges = true;
      result.headerDiffs[c] = {
        oldValue: oldH,
        newValue: newH,
        modified: true
      };
    }
  }

  const origRowCount = origTable.rows.length;
  const propRowCount = proposedTable.rows.length;
  const maxRows = Math.max(origRowCount, propRowCount);

  if (propRowCount > origRowCount) {
    result.addedRowsCount = propRowCount - origRowCount;
    result.hasChanges = true;
  } else if (propRowCount < origRowCount) {
    result.removedRowsCount = origRowCount - propRowCount;
    result.hasChanges = true;
  }

  for (let r = 0; r < maxRows; r++) {
    const origRow = origTable.rows[r] || [];
    const propRow = proposedTable.rows[r] || [];
    const isRowAdded = r >= origRowCount;
    const isRowRemoved = r >= propRowCount;

    const maxCols = Math.max(origRow.length, propRow.length, maxHeaders);

    for (let c = 0; c < maxCols; c++) {
      const oldVal = (origRow[c] !== undefined && origRow[c] !== null ? String(origRow[c]) : "").trim();
      const newVal = (propRow[c] !== undefined && propRow[c] !== null ? String(propRow[c]) : "").trim();

      if (isRowAdded) {
        result.hasChanges = true;
        result.totalChangedCells++;
        result.cellDiffs[`${r}_${c}`] = {
          rowIndex: r,
          colIndex: c,
          oldValue: "",
          newValue: newVal,
          type: "added"
        };
      } else if (isRowRemoved) {
        result.hasChanges = true;
        result.totalChangedCells++;
        result.cellDiffs[`${r}_${c}`] = {
          rowIndex: r,
          colIndex: c,
          oldValue: oldVal,
          newValue: "",
          type: "removed"
        };
      } else if (oldVal !== newVal) {
        result.hasChanges = true;
        result.totalChangedCells++;
        result.cellDiffs[`${r}_${c}`] = {
          rowIndex: r,
          colIndex: c,
          oldValue: oldVal,
          newValue: newVal,
          type: "modified"
        };
      }
    }
  }

  return result;
};

/**
 * Formata o conteúdo para exportação em planilhas (Excel) e relatórios tabulares,
 * convertendo objetos/JSON de tabelas em identificadores limpos e legíveis em vez de JSON cru.
 */
export const formatContentForExport = (
  rawText?: string | null,
  isSuppressing?: boolean,
  isTableContext?: boolean,
  options?: { includePreviewRows?: boolean; maxPreviewRows?: number }
): string => {
  const isTable = isTableContext !== undefined ? isTableContext : isTableJson(rawText);

  if (isSuppressing) {
    return isTable ? "[TABELA] Supressão Integral da Tabela" : "[SUPRESSÃO] Exclusão total do dispositivo";
  }

  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  if (!isTableJson(rawText)) {
    return rawText;
  }

  try {
    const table = parseTableData(rawText);
    const numRows = table.rows ? table.rows.length : 0;
    const numCols = table.headers ? table.headers.length : 0;
    const title = table.title ? table.title.trim() : "Tabela Estruturada";

    let label = `[TABELA] ${title} (${numRows} ${numRows === 1 ? "linha" : "linhas"} × ${numCols} colunas)`;

    if (options?.includePreviewRows && numRows > 0) {
      const maxRows = options.maxPreviewRows || 5;
      const headersStr = table.headers.filter(Boolean).join(" | ");
      if (headersStr) {
        label += `\nCabeçalhos: ${headersStr}`;
      }
      const previewRows = table.rows.slice(0, maxRows).map((r, i) => `• L${i + 1}: ${r.join(" | ")}`);
      label += `\n${previewRows.join("\n")}`;
      if (numRows > maxRows) {
        label += `\n(... e mais ${numRows - maxRows} linhas)`;
      }
    }

    return label;
  } catch {
    return rawText;
  }
};

/**
 * Formata o conteúdo para renderização em relatórios HTML e PDF
 */
export const formatContentForPdf = (
  rawText?: string | null,
  isSuppressing?: boolean,
  isTableContext?: boolean,
  originalText?: string
): string => {
  const escapeHtml = (unsafe: string) => {
    return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  const isTable = isTableContext !== undefined ? isTableContext : isTableJson(rawText);

  if (isSuppressing) {
    if (isTable) {
      return `<div style="color: #be123c; font-weight: bold; padding: 5px 8px; background-color: #ffe4e6; border: 1px solid #fecdd3; border-radius: 6px; font-size: 11px;">[TABELA] Supressão Integral da Tabela</div>`;
    }
    const textToShow = originalText || rawText || "Sugestão de exclusão integral do dispositivo.";
    return `<div style="color: #9f1239; background-color: #ffe4e6; border: 1px solid #fda4af; padding: 4px 8px; border-radius: 4px; text-decoration: line-through; font-weight: 500; font-size: 11px;">${escapeHtml(textToShow)}</div>`;
  }

  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  if (!isTableJson(rawText)) {
    return `<div style="white-space: pre-wrap; font-family: inherit; font-size: 11px; line-height: 1.4;">${escapeHtml(rawText)}</div>`;
  }

  try {
    const table = parseTableData(rawText);
    const numRows = table.rows ? table.rows.length : 0;
    const numCols = table.headers ? table.headers.length : 0;
    const title = table.title ? table.title.trim() : "Tabela Estruturada";

    return `
      <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin: 2px 0; font-family: inherit;">
        <div style="background-color: #1A3E8A; color: white; padding: 5px 8px; font-weight: bold; font-size: 10px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">[TABELA] ${escapeHtml(title)}</span>
          <span style="font-size: 9px; opacity: 0.9; background-color: rgba(255,255,255,0.2); padding: 1px 5px; border-radius: 3px;">${numRows} lin. × ${numCols} col.</span>
        </div>
      </div>
    `;
  } catch {
    return `<div style="white-space: pre-wrap; font-family: inherit; font-size: 11px;">${escapeHtml(rawText)}</div>`;
  }
};
