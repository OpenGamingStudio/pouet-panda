import { BIOME_BLOCK, SPECIAL_ORDER } from './config';

export type BiomeId = 'bamboo' | (typeof SPECIAL_ORDER)[number];

export interface BiomeInfo {
  id: BiomeId;
  name: string;
  special: boolean;
  rule: string; // phrase du bandeau
  sky: string;
  bamboo: string; // couleur des tiges
  far: string; // plans de décor
  mid: string;
  ground: string;
  groundTop: string;
}

// Bambouseraie : même règle, seule la lumière change (matin, midi, soir, nuit).
export const BAMBOO_LIGHTS = [
  { name: 'matin', sky: '#8FD8FF', far: '#B9E7FF', mid: '#6FC08A', ground: '#7DB534', groundTop: '#9BCB3C' },
  { name: 'midi', sky: '#7CCBF5', far: '#A6DDFB', mid: '#5DB57A', ground: '#6FA82C', groundTop: '#9BCB3C' },
  { name: 'soir', sky: '#FFC48F', far: '#FFD9B0', mid: '#C98F6B', ground: '#8E9A2E', groundTop: '#B5C23C' },
  { name: 'nuit', sky: '#5A78C8', far: '#7490D8', mid: '#3E6A8A', ground: '#4E7A2A', groundTop: '#6E9A36' },
] as const;

export const SPECIALS: Record<(typeof SPECIAL_ORDER)[number], BiomeInfo> = {
  ice: {
    id: 'ice', name: 'Glace', special: true, rule: 'Le premier choc ne compte pas !',
    sky: '#C8F0FF', bamboo: '#FFFFFF', far: '#E3F8FF', mid: '#A9DDF0', ground: '#BFE6F5', groundTop: '#FFFFFF',
  },
  fire: {
    id: 'fire', name: 'Feu', special: true, rule: 'Mange un piment pour foncer !',
    sky: '#FFE3B8', bamboo: '#FF7A1A', far: '#FFD0A0', mid: '#E8A06A', ground: '#C4561A', groundTop: '#FF9A3C',
  },
  swamp: {
    id: 'swamp', name: 'Marais', special: true, rule: 'Gaz du marais : pets plus forts !',
    sky: '#D9F2C2', bamboo: '#6FA86B', far: '#C2E5A8', mid: '#3FB59A', ground: '#2E8F7A', groundTop: '#3FB59A',
  },
  storm: {
    id: 'storm', name: 'Orage', special: true, rule: 'Attention aux rafales !',
    sky: '#2B2A4A', bamboo: '#C7E27A', far: '#3E3D68', mid: '#55539A', ground: '#3B3A66', groundTop: '#6E6CB8',
  },
};

/** Numéro du bloc de 10 points pour un score. */
export function blockOf(score: number): number {
  return Math.floor(score / BIOME_BLOCK);
}

/** Rang (0, 1, 2…) de la paire dans son biome : score - 10×bloc. */
export function localOf(score: number): number {
  return score - blockOf(score) * BIOME_BLOCK;
}

export function biomeIdOf(score: number): BiomeId {
  const b = blockOf(score);
  if (b % 2 === 0) return 'bamboo';
  return SPECIAL_ORDER[((b - 1) / 2) % SPECIAL_ORDER.length]!;
}

export function biomeOf(score: number): BiomeInfo {
  const id = biomeIdOf(score);
  if (id !== 'bamboo') return SPECIALS[id];
  const light = BAMBOO_LIGHTS[(blockOf(score) / 2) % BAMBOO_LIGHTS.length]!;
  return {
    id: 'bamboo', name: 'Bambouseraie', special: false, rule: '',
    sky: light.sky, bamboo: '#9BCB3C', far: light.far, mid: light.mid, ground: light.ground, groundTop: light.groundTop,
  };
}
