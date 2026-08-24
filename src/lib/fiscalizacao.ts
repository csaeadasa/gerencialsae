import type { ChecklistItem } from "../types";

export const FISCALIZACAO_ETAPAS = [
  "Planejamento",
  "Execução",
  "Monitoramento",
  "Finalizada",
] as const;

export type FiscalizacaoEtapa = (typeof FISCALIZACAO_ETAPAS)[number];

export const FISCALIZACAO_ETAPA_INICIAL: FiscalizacaoEtapa = FISCALIZACAO_ETAPAS[0];

export const FISCALIZACAO_CHECKLIST_ITENS = [
  "Ordem de Serviço",
  "Plano de Ação da Fiscalização",
  "Agendamento da ação fiscalizatória",
  "Realização da ação fiscalizatória",
  "Registro das conformidades e não conformidades",
  "Solicitação de informações complementares",
  "Elaboração de Relatório de Fiscalização",
  "Encaminhamento do Relatório à Superintendência e à prestadora",
] as const;

const normalizeChecklistText = (text: string) => text.trim().toLocaleLowerCase("pt-BR");

export const ensureFiscalizacaoChecklist = (checklist: ChecklistItem[] = []): ChecklistItem[] => {
  const completedChecklist = checklist.map(item => ({ ...item }));
  const existingTexts = new Set(completedChecklist.map(item => normalizeChecklistText(item.text)));
  const usedIds = new Set(completedChecklist.map(item => item.id));

  FISCALIZACAO_CHECKLIST_ITENS.forEach((text, index) => {
    if (existingTexts.has(normalizeChecklistText(text))) return;

    const baseId = `fiscalizacao-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    completedChecklist.push({ id, text, completed: false });
    existingTexts.add(normalizeChecklistText(text));
    usedIds.add(id);
  });

  return completedChecklist;
};

export const createFiscalizacaoChecklist = (): ChecklistItem[] => ensureFiscalizacaoChecklist();
