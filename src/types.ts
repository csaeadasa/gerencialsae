/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FiscalizacaoEtapa } from './lib/fiscalizacao';

export type ActionType = 'view' | 'create' | 'edit' | 'delete';
export type ModuleId = 
  | 'planning_dashboard' | 'planning_tasks' | 'planning_plans' | 'planning_areas' | 'planning_categories' | 'planning_responsibles' | 'planning_models'
  | 'water_balances' | 'systems' | 'supply_sources' | 'demands' | 'explore' | 'analyze' | 'templates'
  | 'reg_cadastro' | 'reg_painel' | 'reg_agenda' | 'reg_agenda_painel'
  | 'pub_cadastro' | 'pub_painel'
  | 'fisc_operational' | 'recurso_painel'
  | 'dashboard' | 'geo' | 'users' | 'backup';

export interface AppPermission {
  moduleId: ModuleId;
  actions: ActionType[];
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: AppPermission[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  agency?: string;
  status: 'active' | 'inactive';
}

export interface System {
  id: number;
  code?: string;
  name: string;
  waterBalanceId?: number;
}

export interface Region {
  id: number;
  code?: string;
  name: string;
  systemId: number;
  description?: string;
  waterBalanceId?: number;
}

export interface DemandEntry {
  regionId: number;
  year: number;
  population: number;
  coverage: number; // 0 to 1
  perCapitaConsumption: number; // L/hab.dia
  losses: number; // 0 to 1
}

export interface DemandModifiers {
  population: number;
  coverage: number | null;
  perCapitaConsumption: number;
  losses: number | null;
}

export interface Demand {
  id: number;
  name: string;
  description?: string;
  entries: DemandEntry[];
  modifiers: DemandModifiers;
  waterBalanceId?: number;
}

export interface SupplySource {
  id: number;
  code?: string;
  systemId: number;
  name: string;
  type: string;
  grantedFlow: number;
  operationalFlow: number;
  unavailableFlow: number;
  unavailabilityReason: string;
  waterBalanceId?: number;
}

export type AdjustmentType = 'Aumento da vazão' | 'Redução da vazão' | 'Transferência';

export interface OperationalAdjustment {
  id: number;
  systemId: number;
  type: AdjustmentType;
  description: string;
  startYear: number;
  endYear: number;
  flowValue: number;
  waterBalanceId?: number;
  linkedAdjustmentId?: number;
}

export interface WaterBalance {
  id: number;
  description: string;
  responsible: string;
  deliveryDate: string;
  receivedBy: string;
  receiptDate: string;
  status: 'Validado' | 'Pendente';
}

export interface CalculationResult extends DemandEntry {
  projectedDemand: number; // L/s
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  read: boolean;
  createdAt: string;
  link?: string;
  relatedTaskId?: number;
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskLink {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}

export interface DocumentoFiscalizacao {
  id: string;
  tipo: string;
  numeroSei: string;
  data: string;
  objetivo: string;
  destinatario: string;
}

export interface ConstatacaoFiscalizacao {
  id: string;
  codigo: string;
  descricao: string;
  situacao: 'Conforme' | 'Não Conforme';
  descricaoNaoConformidade?: string;
  prazoCorrecao?: string; // used when inside Termo
  alertaPrazo?: boolean; // defaults to true, when false ignores prazo
  situacaoNaoConforme?: 'Tratada Adequadamente' | 'Não Tratada'; // used when inside Termo
}

export interface TermoNotificacao {
  id: string;
  numeroSei: string;
  dataEmissao: string;
  dataResposta: string;
  respondidoEm?: string;
  constatacoesIds: string[]; // references ConstatacaoFiscalizacao
}

export interface AutoDeInfracao {
  id: string;
  numeroSei: string;
  dataEmissao: string;
  referencia: string;
  caracterizacao: string;
  infracoes: string;
  penalidade: 'Advertência' | 'Multa' | 'Embargo de obras' | 'Interdição administrativa' | 'Caducidade da concessão' | string;
  descricaoPenalidade: string;
  dataLimiteRecurso: string;
  constatacoesIds: string[]; // references ConstatacaoFiscalizacao
}

export interface FiscalizacaoData {
  codigo: string;
  etapa?: FiscalizacaoEtapa;
  objetivo: string;
  regiaoAdministrativa: string;
  latitude: string;
  longitude: string;
  tipo: 'Direta' | 'Indireta';
  tipoFiscalizacao?: 'Operacional' | 'Atendimento' | string;
  servico?: 'Água' | 'Esgoto' | 'Atendimento' | string;
  programacao: 'Programada' | 'Não Programada';
  imagens: string[];
  documentos: DocumentoFiscalizacao[];
  constatacoes: ConstatacaoFiscalizacao[];
  termosNotificacao: TermoNotificacao[];
  autosDeInfracao?: AutoDeInfracao[];
  datasEtapas?: Record<string, string>;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | string;
  parentId: number | null;
  progress: number;
  weight?: number;
  isProgrammed?: boolean;
  seiProcess?: string;
  priority?: string;
  categoryIds?: number[];
  assignedTo?: string;
  createdBy?: string;
  createdAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  checklist?: ChecklistItem[];
  planId?: number | null;
  areaIds?: number[];
  responsibleIds?: number[];
  dependsOnTaskId?: number | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  comments?: TaskComment[];
  links?: TaskLink[];
  type?: 'default' | 'fiscalizacao' | 'demanda_ouvidoria' | 'recurso_revisao' | 'recurso';
  fiscalizacaoData?: FiscalizacaoData;
  ouvidoriaData?: RecursoData;
  recursoData?: RecursoData;
  recursoRevData?: RecursoRevisaoData;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  isActive?: boolean;
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Area {
  id: number;
  name: string;
  abbreviation?: string;
  categoryIds?: number[];
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Category {
  id: number;
  name: string;
  areaIds: number[];
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface Responsible {
  id: number;
  name: string;
  email?: string;
  role?: string;
  areaIds: number[];
  createdAt?: string | null;
  createdBy?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  userId?: number | null;
}


export interface RecursoData {
  nomeUsuario?: string;
  enderecoUsuario?: string;
  regiaoAdministrativa?: string;
  classificacaoImovel?: 'Comercial' | 'Residencial' | 'Não se aplica' | string;
  apuracao?: string;
  tipoManifestacao?: 'Denúncia' | 'Reclamação' | 'Solicitação' | string;
  servico?: 'Água' | 'Esgoto' | 'Comercial' | string;
  categoria?: string;
  numeroSei?: string;
  posicionamentoOuvidoria?: string;
  posicionamentoSAE?: string;
  posicionamentoJuridico?: string;
  posicionamentoDiretoria?: string;
  situacao?: 'Recebido' | 'Em Análise Técnica' | 'Tramitado para a Ouvidoria' | 'Encaminhado à Diretoria' | 'Retornado da Diretoria' | 'Finalizado' | string;
  resultadoProcesso?: 'Atendido' | 'Atendido Parcialmente' | 'Não Atendido' | 'Acordo' | 'Desistência do Usuário' | 'Em Análise' | string;
  complexidade?: 'Alta' | 'Média' | 'Baixa' | string;
  observacao?: string;
  datasEtapas?: Record<string, string>;
}

export interface RecursoRevisaoData {
  numeroProcesso?: string;
  numeroSei?: string;
  numeroNotaTecnica?: string;
  recorrente?: string;
  cpfCnpj?: string;
  inscricaoCaesb?: string;
  autoInfracaoOrigem?: string;
  regiaoAdministrativa?: string;
  latitude?: string;
  longitude?: string;
  servico?: 'Água' | 'Esgoto' | 'Comercial' | 'Drenagem' | string;
  tipoRecurso?: string;
  classificacaoImovel?: 'Público' | 'Residencial' | 'Comercial' | 'Industrial' | string;
  tipoInfracao?: string;
  irregularidade?: string;
  irregularidadeEncontrada?: string;
  qtdeIrregularidades?: number | string;
  situacao?: string;
  resultado?: string;
  dataProtocolo?: string;
  dataDistribuicao?: string;
  relator?: string;
  valorMultaQuestionada?: number | string;
  valorMultaMantida?: number | string;
  resumoRecurso?: string;
  parecerTecnico?: string;
  parecerJuridico?: string;
  decisaoDiretoria?: string;
  reuniaoPublicaDiretoria?: string;
  observacao?: string;
  datasEtapas?: Record<string, string>;
}
