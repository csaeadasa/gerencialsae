export const FISCALIZACAO_ETAPAS = [
  "Planejamento",
  "Execução",
  "Monitoramento",
  "Finalizada",
] as const;

export type FiscalizacaoEtapa = (typeof FISCALIZACAO_ETAPAS)[number];

export const FISCALIZACAO_ETAPA_INICIAL: FiscalizacaoEtapa = FISCALIZACAO_ETAPAS[0];
