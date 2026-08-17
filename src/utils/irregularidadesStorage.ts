import { IRREGULARIDADES_MAP } from '../components/RecursoRevisaoEditorConstants';

const STORAGE_MAP_KEY = 'adasa_custom_irregularidades_map_v2';
const STORAGE_INACTIVE_CAT_KEY = 'adasa_inactive_irregularidades_cat_v2';
const STORAGE_INACTIVE_ENC_KEY = 'adasa_inactive_irregularidades_enc_v2';

export interface IrregularidadesStore {
  map: Record<string, string[]>;
  inactiveCategories: string[];
  inactiveEncontradas: Record<string, string[]>;
}

export function loadIrregularidadesStore(): IrregularidadesStore {
  let map = { ...IRREGULARIDADES_MAP };
  let inactiveCategories: string[] = [];
  let inactiveEncontradas: Record<string, string[]> = {};

  try {
    const savedMap = localStorage.getItem(STORAGE_MAP_KEY);
    if (savedMap) {
      const parsed = JSON.parse(savedMap);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        map = parsed;
      }
    }
  } catch (e) {
    console.error('Error loading custom irregularidades map', e);
  }

  try {
    const savedInactCat = localStorage.getItem(STORAGE_INACTIVE_CAT_KEY);
    if (savedInactCat) {
      inactiveCategories = JSON.parse(savedInactCat) || [];
    }
  } catch (e) {
    console.error('Error loading inactive categories', e);
  }

  try {
    const savedInactEnc = localStorage.getItem(STORAGE_INACTIVE_ENC_KEY);
    if (savedInactEnc) {
      inactiveEncontradas = JSON.parse(savedInactEnc) || {};
    }
  } catch (e) {
    console.error('Error loading inactive encontradas', e);
  }

  return { map, inactiveCategories, inactiveEncontradas };
}

export function saveIrregularidadesStore(store: IrregularidadesStore): void {
  try {
    localStorage.setItem(STORAGE_MAP_KEY, JSON.stringify(store.map));
    localStorage.setItem(STORAGE_INACTIVE_CAT_KEY, JSON.stringify(store.inactiveCategories));
    localStorage.setItem(STORAGE_INACTIVE_ENC_KEY, JSON.stringify(store.inactiveEncontradas));
  } catch (e) {
    console.error('Error saving irregularidades store', e);
  }
}
