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

export const createFiscalizacaoChecklist = () =>
  FISCALIZACAO_CHECKLIST_ITENS.map((text, index) => ({
    id: `fiscalizacao-${index + 1}`,
    text,
    completed: false,
  }));
