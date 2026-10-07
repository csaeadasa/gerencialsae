/**
 * Gerenciamento centralizado de Nível de Acesso (Público vs Privado) dos Painéis Gerenciais da SAE
 * Domínio oficial dos links públicos: https://gerencialsae.vercel.app/
 */

import { useState, useEffect, useCallback } from 'react';

export const PUBLIC_DOMAIN = 'https://gerencialsae.vercel.app';

export interface PanelAccessInfo {
  id: string;
  name: string;
  shortName: string;
  isPublic: boolean;
  publicParam: string;
  description: string;
  iconName: string;
}

export const INITIAL_PANEL_ACCESS_MAP: Record<string, boolean> = {
  overview_panels: true,       // Visão Geral Consolidada
  reg_painel: true,            // Painel de Resoluções / Estoque Regulatório
  reg_agenda_painel: true,     // Painel da Agenda Regulatória
  reg_subsidios_painel: true,  // Painel de Participação Social
  pub_painel: true,            // Painel de Publicações
  planning: false,             // Plano de Atividades
  analyze: false,              // Balanço Hídrico
  fisc_operational: false,     // Fiscalização
  recurso_painel: false,       // Qualidade do Atendimento / Ouvidoria
};

export const PANEL_METADATA_LIST: Array<{
  id: string;
  name: string;
  shortName: string;
  publicParam: string;
  description: string;
  category: string;
}> = [
  {
    id: 'overview_panels',
    name: 'Visão Geral Consolidada',
    shortName: 'Visão Consolidada',
    publicParam: 'overview_panels',
    description: 'Dashboard executivo integrado reunindo gráficos e indicadores de todos os painéis.',
    category: 'Executivo',
  },
  {
    id: 'planning',
    name: 'Plano de Atividades',
    shortName: 'Atividades',
    publicParam: 'planning',
    description: 'Acompanhamento do andamento geral de tarefas, metas e cronogramas das áreas.',
    category: 'Operacional',
  },
  {
    id: 'reg_painel',
    name: 'Painel de Resoluções',
    shortName: 'Resoluções',
    publicParam: 'reg_painel',
    description: 'Estoque regulatório, acervo de resoluções vigentes, atas e normas da agência.',
    category: 'Regulação',
  },
  {
    id: 'reg_agenda_painel',
    name: 'Painel da Agenda Regulatória',
    shortName: 'Agenda Regulatória',
    publicParam: 'reg_agenda_painel',
    description: 'Acompanhamento de metas, temas, indicadores gráficos e entregas da agenda.',
    category: 'Regulação',
  },
  {
    id: 'reg_subsidios_painel',
    name: 'Painel de Participação Social',
    shortName: 'Participação Social',
    publicParam: 'reg_subsidios_painel',
    description: 'Consultas públicas, tomadas de subsídios, audiências e análise de contribuições.',
    category: 'Regulação',
  },
  {
    id: 'analyze',
    name: 'Painel do Balanço Hídrico',
    shortName: 'Balanço Hídrico',
    publicParam: 'analyze',
    description: 'Projeções de oferta e demanda, índices de criticidade, mapas e subsistemas.',
    category: 'Recursos Hídricos',
  },
  {
    id: 'fisc_operational',
    name: 'Painel de Fiscalização',
    shortName: 'Fiscalização',
    publicParam: 'fisc_operational',
    description: 'Monitoramento de constatações, vistorias técnicas e termos emitidos.',
    category: 'Fiscalização',
  },
  {
    id: 'recurso_painel',
    name: 'Painel de Qualidade do Atendimento',
    shortName: 'Qualidade do Atendimento',
    publicParam: 'recurso_painel',
    description: 'Acompanhamento de demandas de ouvidoria, prazos, penalidades e julgamentos.',
    category: 'Atendimento & Ouvidoria',
  },
  {
    id: 'pub_painel',
    name: 'Painel de Publicações',
    shortName: 'Publicações',
    publicParam: 'pub_painel',
    description: 'Acervo bibliográfico, relatórios técnicos, boletins periódicos e pesquisas.',
    category: 'Biblioteca',
  },
];

const STORAGE_KEY = 'sae_panel_access_config_v2';
const EVENT_NAME = 'sae_panel_access_change';

/**
 * Lê as permissões de acesso salvas no localStorage
 */
export function getStoredPanelAccess(): Record<string, boolean> {
  if (typeof window === 'undefined') return INITIAL_PANEL_ACCESS_MAP;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_PANEL_ACCESS_MAP };
    const parsed = JSON.parse(raw);
    return { ...INITIAL_PANEL_ACCESS_MAP, ...parsed };
  } catch {
    return { ...INITIAL_PANEL_ACCESS_MAP };
  }
}

/**
 * Salva as permissões no localStorage e notifica os ouvintes
 */
export function savePanelAccess(accessMap: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accessMap));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: accessMap }));
  } catch (err) {
    console.error('Erro ao salvar permissões de painel:', err);
  }
}

/**
 * Altera o nível de acesso de um painel específico
 */
export function togglePanelAccess(panelId: string): boolean {
  const current = getStoredPanelAccess();
  const nextVal = !current[panelId];
  current[panelId] = nextVal;
  savePanelAccess(current);
  return nextVal;
}

/**
 * Define o nível de acesso explicitamente
 */
export function setPanelAccess(panelId: string, isPublic: boolean) {
  const current = getStoredPanelAccess();
  current[panelId] = isPublic;
  savePanelAccess(current);
}

/**
 * Verifica se um painel é público
 */
export function isPanelPublic(panelId: string): boolean {
  const current = getStoredPanelAccess();
  return Boolean(current[panelId]);
}

/**
 * Gera a URL pública oficial para o painel com o domínio solicitado
 */
export function getPanelPublicUrl(panelId: string): string {
  if (panelId === 'hub' || panelId === 'publico_hub') {
    return `${PUBLIC_DOMAIN}/?public=publico_hub`;
  }
  return `${PUBLIC_DOMAIN}/?public=${panelId}`;
}

/**
 * Gera a tag de incorporação iframe pública
 */
export function getPanelEmbedCode(panelId: string, title?: string): string {
  const url = getPanelPublicUrl(panelId);
  const panelTitle = title || 'Painel Gerencial SAE';
  return `<iframe src="${url}" width="100%" height="800" frameborder="0" title="${panelTitle}" allowfullscreen></iframe>`;
}

/**
 * Hook React para observar e alternar o status dos painéis em tempo real
 */
export function usePanelAccess() {
  const [panelAccess, setPanelAccessState] = useState<Record<string, boolean>>(getStoredPanelAccess);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setPanelAccessState({ ...e.detail });
      } else {
        setPanelAccessState(getStoredPanelAccess());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const toggleAccess = useCallback((panelId: string) => {
    const updatedVal = togglePanelAccess(panelId);
    return updatedVal;
  }, []);

  const checkIsPublic = useCallback((panelId: string) => {
    return Boolean(panelAccess[panelId]);
  }, [panelAccess]);

  return {
    panelAccess,
    toggleAccess,
    checkIsPublic,
    getPublicUrl: getPanelPublicUrl,
    getEmbedCode: getPanelEmbedCode,
  };
}
