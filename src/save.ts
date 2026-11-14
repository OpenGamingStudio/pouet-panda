import { SAVE_KEY, SAVE_VERSION } from './config';
import { DEFAULTS, itemById, type Shelf } from './shop';
import type { BiomeId } from './biomes';

export type MotionPref = 'auto' | 'yes' | 'no';

export interface SaveData {
  v: number;
  best: number;
  coins: number;
  totalCoins: number;
  games: number;
  owned: string[];
  equipped: Record<Shelf, string>;
  settings: { sound: boolean; music: boolean; reducedMotion: MotionPref; volume: number; assist: boolean; flapKey: string };
  biomesSeen: BiomeId[];
}

/** Stockage minimal (localStorage ou un faux pour les tests). */
export interface Store {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

/** Touches réservées (pause, navigation) : refusées pour le saut. */
export const RESERVED_KEYS = ['Escape', 'KeyP', 'Tab', 'Enter', 'Space', 'ArrowUp'];

const BIOMES: BiomeId[] = ['bamboo', 'ice', 'fire', 'swamp', 'storm'];

export function freshSave(): SaveData {
  return {
    v: SAVE_VERSION,
    best: 0,
    coins: 0,
    totalCoins: 0,
    games: 0,
    owned: Object.values(DEFAULTS),
    equipped: { ...DEFAULTS },
    settings: { sound: true, music: true, reducedMotion: 'auto', volume: 100, assist: false, flapKey: 'KeyW' },
    biomesSeen: ['bamboo'],
  };
}

const int = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

/** Migrations en chaîne : migrate[n] passe la version n à n+1. */
export const migrate: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {};

/** Nettoie un objet lu : entiers ≥ 0, ids inconnus retirés, équipement remis au défaut si non possédé. */
export function sanitize(raw: Record<string, unknown>): SaveData {
  const s = freshSave();
  s.best = int(raw.best);
  s.coins = int(raw.coins);
  s.totalCoins = int(raw.totalCoins);
  s.games = int(raw.games);
  const owned = Array.isArray(raw.owned) ? raw.owned : [];
  for (const id of owned) {
    if (typeof id === 'string' && itemById(id) && !s.owned.includes(id)) s.owned.push(id);
  }
  const eq = (raw.equipped ?? {}) as Record<string, unknown>;
  for (const shelf of Object.keys(DEFAULTS) as Shelf[]) {
    const id = eq[shelf];
    if (typeof id === 'string' && s.owned.includes(id) && itemById(id)?.shelf === shelf) s.equipped[shelf] = id;
  }
  const st = (raw.settings ?? {}) as Record<string, unknown>;
  if (typeof st.sound === 'boolean') s.settings.sound = st.sound;
  if (typeof st.music === 'boolean') s.settings.music = st.music;
  if (st.reducedMotion === 'yes' || st.reducedMotion === 'no' || st.reducedMotion === 'auto') {
    s.settings.reducedMotion = st.reducedMotion;
  }
  if (typeof st.volume === 'number' && Number.isFinite(st.volume)) s.settings.volume = Math.max(0, Math.min(100, Math.round(st.volume)));
  if (typeof st.assist === 'boolean') s.settings.assist = st.assist;
  if (typeof st.flapKey === 'string' && /^[A-Za-z0-9]{1,24}$/.test(st.flapKey) && !RESERVED_KEYS.includes(st.flapKey)) s.settings.flapKey = st.flapKey;
  const seen = Array.isArray(raw.biomesSeen) ? raw.biomesSeen : [];
  for (const b of seen) if (BIOMES.includes(b as BiomeId) && !s.biomesSeen.includes(b as BiomeId)) s.biomesSeen.push(b as BiomeId);
  return s;
}

export interface Loaded {
  data: SaveData;
  /** false : version future ou stockage absent, on n'écrit pas. */
  writable: boolean;
  /** true : le stockage est utilisable (sinon message « Progression non sauvegardée »). */
  persistent: boolean;
}

export function load(store: Store | null): Loaded {
  if (!store) return { data: freshSave(), writable: true, persistent: false };
  let text: string | null;
  try {
    text = store.getItem(SAVE_KEY);
  } catch {
    return { data: freshSave(), writable: true, persistent: false };
  }
  if (text === null) return { data: freshSave(), writable: true, persistent: true };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('forme');
  } catch {
    try {
      store.setItem(SAVE_KEY + '.corrupt', text);
    } catch {
      /* rien de plus à faire */
    }
    return { data: freshSave(), writable: true, persistent: true };
  }
  let obj = raw as Record<string, unknown>;
  let v = int(obj.v);
  if (v === 0) v = 1;
  if (v > SAVE_VERSION) return { data: sanitize(obj), writable: false, persistent: true };
  while (v < SAVE_VERSION) {
    const m = migrate[v];
    if (!m) break;
    obj = m(obj);
    v++;
  }
  const data = sanitize(obj);
  data.v = SAVE_VERSION;
  return { data, writable: true, persistent: true };
}

/** Écrit la sauvegarde ; renvoie false si le stockage refuse (mode privé, quota). */
export function write(store: Store | null, loaded: Loaded): boolean {
  if (!store || !loaded.writable) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(loaded.data));
    return true;
  } catch {
    return false;
  }
}
