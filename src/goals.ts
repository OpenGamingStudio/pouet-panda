import type { BiomeId } from './biomes';
import type { SaveData } from './save';

/** Ce qu'une partie a produit, ou le cumul du joueur : de quoi juger succès et défi. */
export interface RunStats {
  score: number;
  coins: number;
  /** Biomes atteints pendant la partie. */
  biomes: BiomeId[];
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  /** Vrai quand le succès est mérité (partie terminée, sauvegarde déjà mise à jour). */
  test: (run: RunStats, d: SaveData) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'Premier pet', desc: 'Termine une partie.', test: (_r, d) => d.games >= 1 },
  { id: 'score10', name: 'Petit vol', desc: 'Atteins 10 de score.', test: (r) => r.score >= 10 },
  { id: 'score30', name: 'Panda planeur', desc: 'Atteins 30 de score.', test: (r) => r.score >= 30 },
  { id: 'score60', name: 'Roi des airs', desc: 'Atteins 60 de score.', test: (r) => r.score >= 60 },
  { id: 'coins20', name: 'Pièces en poche', desc: 'Ramasse 20 pièces en une partie.', test: (r) => r.coins >= 20 },
  { id: 'rich', name: 'Panda riche', desc: 'Cumule 200 pièces au total.', test: (_r, d) => d.totalCoins >= 200 },
  { id: 'explorer', name: 'Explorateur', desc: 'Découvre les 5 biomes.', test: (_r, d) => d.biomesSeen.length >= 5 },
  { id: 'regular', name: 'Habitué', desc: 'Joue 10 parties.', test: (_r, d) => d.games >= 10 },
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);

export interface Challenge {
  id: string;
  desc: string;
  test: (run: RunStats) => boolean;
}

/** Défis du jour : un par jour, choisi par la date (pas d'horloge réseau, pas de triche contre soi-même à gagner). */
export const CHALLENGES: Challenge[] = [
  { id: 'score15', desc: 'Atteins 15 de score en une partie.', test: (r) => r.score >= 15 },
  { id: 'score25', desc: 'Atteins 25 de score en une partie.', test: (r) => r.score >= 25 },
  { id: 'coins8', desc: 'Ramasse 8 pièces en une partie.', test: (r) => r.coins >= 8 },
  { id: 'coins15', desc: 'Ramasse 15 pièces en une partie.', test: (r) => r.coins >= 15 },
  { id: 'ice', desc: 'Traverse le biome Glace.', test: (r) => r.biomes.includes('ice') },
  { id: 'fire', desc: 'Entre dans le biome Feu.', test: (r) => r.biomes.includes('fire') },
  { id: 'swamp', desc: 'Entre dans le biome Marais.', test: (r) => r.biomes.includes('swamp') },
];

export interface DailyState {
  /** Jour local AAAA-MM-JJ. */
  day: string;
  id: string;
  done: boolean;
}

export const DAILY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Jour local AAAA-MM-JJ. */
export function dayKey(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Défi du jour : même date, même défi. */
export function challengeFor(day: string): Challenge {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHALLENGES[h % CHALLENGES.length];
}

export const challengeById = (id: string): Challenge | undefined => CHALLENGES.find((c) => c.id === id);

/** Remet le défi sur le jour donné s'il a changé. Renvoie true si l'état a bougé. */
export function rollDaily(d: SaveData, day: string): boolean {
  if (d.daily.day === day && challengeById(d.daily.id)) return false;
  d.daily = { day, id: challengeFor(day).id, done: false };
  return true;
}

export interface GoalResult {
  newAchievements: Achievement[];
  dailyJustDone: Challenge | null;
}

/** À appeler après la mise à jour des totaux de la sauvegarde. Modifie `d`. */
export function evaluate(d: SaveData, run: RunStats, day: string): GoalResult {
  rollDaily(d, day);
  const newAchievements: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!d.achievements.includes(a.id) && a.test(run, d)) {
      d.achievements.push(a.id);
      newAchievements.push(a);
    }
  }
  let dailyJustDone: Challenge | null = null;
  const c = challengeById(d.daily.id);
  if (c && !d.daily.done && c.test(run)) {
    d.daily.done = true;
    dailyJustDone = c;
  }
  return { newAchievements, dailyJustDone };
}
