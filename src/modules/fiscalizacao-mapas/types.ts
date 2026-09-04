import type { Task } from "../../types";

export type MapasView = "fiscalizacoes" | "obras" | "acoes" | "rvf";
export type JsonRecord = Record<string, unknown>;
export interface PersistedRecord { id: number; externalId?: string; data: JsonRecord; importedAt?: string }
export interface RvfReport { id: number; titulo: string; ano?: number; mes?: number; urlOriginal: string; urlFinal?: string; dominio?: string; status: string; erroVerificacao?: string; updatedAt?: string }
export interface FiscalizacaoProjection { task: Task; latitude: number | null; longitude: number | null; year: string; conformity: number | null; overdue: number; dueSoon: number }
