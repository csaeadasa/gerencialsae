import type { FiscalizacaoProjection, JsonRecord } from "./types";
import type { Task } from "../../types";

export const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export function coordinate(value: unknown, kind: "lat" | "lng") {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).trim().replace(",", "."));
  const limit = kind === "lat" ? 90 : 180;
  return Number.isFinite(parsed) && parsed >= -limit && parsed <= limit ? parsed : null;
}
export function projectTask(task: Task): FiscalizacaoProjection {
  const data = task.fiscalizacaoData;
  const latitude = coordinate(data?.latitude, "lat");
  const longitude = coordinate(data?.longitude, "lng");
  const detailed = data?.constatacoes || [];
  const conformity = detailed.length ? detailed.filter(item => normalize(item.situacao) === "conforme").length / detailed.length * 100 : data?.mapasMetadata?.conformidadeInformada ?? null;
  const now = new Date(); const soon = new Date(now); soon.setDate(now.getDate() + 15);
  const pending = detailed.filter(item => normalize(item.situacao).includes("nao conforme") && item.alertaPrazo !== false && item.situacaoNaoConforme !== "Tratada Adequadamente" && item.prazoCorrecao);
  return { task, latitude: latitude !== null && longitude !== null ? latitude : null, longitude: latitude !== null && longitude !== null ? longitude : null, year: String(data?.mapasMetadata?.ano || task.startDate?.slice(0, 4) || data?.documentos?.[0]?.data?.slice(0, 4) || ""), conformity, overdue: pending.filter(item => new Date(`${item.prazoCorrecao}T23:59:59`) < now).length, dueSoon: pending.filter(item => { const date = new Date(`${item.prazoCorrecao}T23:59:59`); return date >= now && date <= soon; }).length };
}
export function projectImportedFiscalizacao(row: JsonRecord, index: number): FiscalizacaoProjection {
  const value = (...aliases: string[]) => String(Object.entries(row).find(([key]) => aliases.some(alias => normalize(key) === normalize(alias)))?.[1] ?? "").trim();
  const numberValue = (raw: string) => { const parsed = Number(raw.replace(/\./g, "").replace(",", ".").replace("%", "")); return Number.isFinite(parsed) ? parsed : undefined; };
  const originalStatus = value("Situação", "Situacao");
  const normalizedStatus = normalize(originalStatus);
  const status = normalizedStatus.includes("concluida") ? "completed" : normalizedStatus.includes("andamento") ? "in_progress" : "pending";
  const codigo = value("ID", "Código", "Codigo");
  const objetivo = value("Objetivo", "Objetivo da ação");
  const task: Task = {
    id: -(index + 1), title: objetivo || `Fiscalização ${codigo}`, description: objetivo,
    startDate: null, endDate: null, status, parentId: null, progress: status === "completed" ? 100 : 0,
    type: "fiscalizacao", seiProcess: value("Processo SEI", "Nº Processo SEI", "Processo"),
    fiscalizacaoData: {
      codigo, objetivo, regiaoAdministrativa: value("Região", "Região Administrativa"), latitude: value("Latitude"), longitude: value("Longitude"),
      tipo: normalize(value("Direta/Indireta")).includes("indireta") ? "Indireta" : "Direta",
      programacao: normalize(value("Programada", "Programação")).includes("nao") ? "Não Programada" : "Programada",
      imagens: [], documentos: [], constatacoes: [], termosNotificacao: [], autosDeInfracao: [],
      mapasMetadata: { ano: numberValue(value("Ano")), origem: "Importado", identificacaoExterna: codigo, situacaoOriginal: originalStatus, conformidadeInformada: numberValue(value("Conformidade")), constataçõesAgregadas: numberValue(value("Constatações")), naoConformidadesAgregadas: numberValue(value("Não Conformes")), recomendacoes: numberValue(value("Recomendações")), determinacoes: numberValue(value("Determinações")), termosNotificacaoAgregados: numberValue(value("TN")), autosInfracaoAgregados: numberValue(value("AI")), tac: numberValue(value("TAC")), coordenadaOrigem: value("Latitude") && value("Longitude") ? "real" : undefined }
    }
  };
  return projectTask(task);
}
export const brl = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0);
export function downloadCsv(name: string, records: JsonRecord[]) {
  const headers = Array.from(new Set(records.flatMap(Object.keys)));
  const safe = (value: unknown) => { let text = String(value ?? ""); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
  const csv = "\uFEFF" + [headers.map(safe).join(","), ...records.map(row => headers.map(key => safe(row[key])).join(","))].join("\r\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
export async function readWorkbook(file: File): Promise<Record<string, JsonRecord[]>> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const XLSX = await import("xlsx"); const book = XLSX.read(await file.text(), { type: "string" });
    return { CSV: XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" }) as JsonRecord[] };
  }
  const XLSX = await import("xlsx"); const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  return Object.fromEntries(book.SheetNames.map(name => [name, XLSX.utils.sheet_to_json(book.Sheets[name], { defval: "", raw: false }) as JsonRecord[]]));
}
