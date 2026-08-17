import { INFRACCOES_AGUA, INFRACCOES_ESGOTO, InfracaoItem as RawInfracaoItem } from '../data/infracoesData';

export interface InfracaoItem {
  id: string;
  code: number;
  servico: 'Água' | 'Esgoto';
  nome: string;
  isCustom?: boolean;
}

export interface InfracoesStore {
  items: InfracaoItem[];
  inactiveIds: string[];
}

const STORAGE_INFRACOES_KEY = 'adasa_infracoes_items_v1';
const STORAGE_INACTIVE_INFRACOES_KEY = 'adasa_inactive_infracoes_v1';

export function getDefaultInfracoes(): InfracaoItem[] {
  const agua: InfracaoItem[] = INFRACCOES_AGUA.map(it => ({
    id: `agua-${it.code}`,
    code: it.code,
    servico: 'Água',
    nome: it.nome
  }));

  const esgoto: InfracaoItem[] = INFRACCOES_ESGOTO.map(it => ({
    id: `esgoto-${it.code}`,
    code: it.code,
    servico: 'Esgoto',
    nome: it.nome
  }));

  return [...agua, ...esgoto];
}

export function loadInfracoesStore(): InfracoesStore {
  let items: InfracaoItem[] = getDefaultInfracoes();
  let inactiveIds: string[] = [];

  try {
    const savedItems = localStorage.getItem(STORAGE_INFRACOES_KEY);
    if (savedItems) {
      const parsed = JSON.parse(savedItems);
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom infracoes items', e);
  }

  try {
    const savedInactives = localStorage.getItem(STORAGE_INACTIVE_INFRACOES_KEY);
    if (savedInactives) {
      const parsed = JSON.parse(savedInactives);
      if (Array.isArray(parsed)) {
        inactiveIds = parsed;
      }
    }
  } catch (e) {
    console.error('Error loading inactive infracoes', e);
  }

  return { items, inactiveIds };
}

export function saveInfracoesStore(store: InfracoesStore): void {
  try {
    localStorage.setItem(STORAGE_INFRACOES_KEY, JSON.stringify(store.items));
    localStorage.setItem(STORAGE_INACTIVE_INFRACOES_KEY, JSON.stringify(store.inactiveIds));
  } catch (e) {
    console.error('Error saving infracoes store', e);
  }
}
