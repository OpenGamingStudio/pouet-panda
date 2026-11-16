import type { SaveData } from './save';

export type Shelf = 'fur' | 'cloud' | 'hat' | 'face' | 'neck' | 'sound';

export interface Item {
  id: string;
  shelf: Shelf;
  name: string;
  price: number;
}

export const SHELVES: { id: Shelf; name: string }[] = [
  { id: 'fur', name: 'Pelage' },
  { id: 'cloud', name: 'Nuage' },
  { id: 'hat', name: 'Chapeau' },
  { id: 'face', name: 'Visage' },
  { id: 'neck', name: 'Cou' },
  { id: 'sound', name: 'Son' },
];

export const ITEMS: Item[] = [
  { id: 'fur.classic', shelf: 'fur', name: 'Classique', price: 0 },
  { id: 'fur.red', shelf: 'fur', name: 'Panda roux', price: 60 },
  { id: 'fur.polar', shelf: 'fur', name: 'Polaire', price: 120 },
  { id: 'fur.gold', shelf: 'fur', name: 'Doré', price: 400 },
  { id: 'fur.rainbow', shelf: 'fur', name: 'Arc-en-ciel', price: 800 },
  { id: 'cloud.cream', shelf: 'cloud', name: 'Crème', price: 0 },
  { id: 'cloud.green', shelf: 'cloud', name: 'Vert pomme', price: 40 },
  { id: 'cloud.bubbles', shelf: 'cloud', name: 'Bulles roses', price: 90 },
  { id: 'cloud.glitter', shelf: 'cloud', name: 'Paillettes', price: 200 },
  { id: 'cloud.rainbow', shelf: 'cloud', name: 'Arc-en-ciel', price: 500 },
  { id: 'hat.none', shelf: 'hat', name: 'Aucun', price: 0 },
  { id: 'hat.beanie', shelf: 'hat', name: 'Bonnet', price: 50 },
  { id: 'hat.cap', shelf: 'hat', name: 'Casquette', price: 80 },
  { id: 'hat.bamboo', shelf: 'hat', name: 'Bambou', price: 100 },
  { id: 'hat.chef', shelf: 'hat', name: 'Toque', price: 150 },
  { id: 'hat.crown', shelf: 'hat', name: 'Couronne', price: 300 },
  { id: 'hat.party', shelf: 'hat', name: 'Cône de fête', price: 90 },
  { id: 'hat.headphones', shelf: 'hat', name: 'Casque audio', price: 130 },
  { id: 'hat.pirate', shelf: 'hat', name: 'Pirate', price: 180 },
  { id: 'hat.wizard', shelf: 'hat', name: 'Magicien', price: 220 },
  { id: 'hat.duck', shelf: 'hat', name: 'Canard sur la tête', price: 260 },
  { id: 'hat.halo', shelf: 'hat', name: 'Auréole', price: 350 },
  { id: 'face.none', shelf: 'face', name: 'Aucun', price: 0 },
  { id: 'face.glasses', shelf: 'face', name: 'Lunettes rondes', price: 60 },
  { id: 'face.clown', shelf: 'face', name: 'Nez de clown', price: 70 },
  { id: 'face.mustache', shelf: 'face', name: 'Moustache', price: 90 },
  { id: 'face.shades', shelf: 'face', name: 'Lunettes de soleil', price: 110 },
  { id: 'neck.none', shelf: 'neck', name: 'Aucun', price: 0 },
  { id: 'neck.bowtie', shelf: 'neck', name: 'Nœud papillon', price: 60 },
  { id: 'neck.scarf', shelf: 'neck', name: 'Écharpe', price: 100 },
  { id: 'neck.medal', shelf: 'neck', name: 'Médaille d\'or', price: 200 },
  { id: 'sound.pouet', shelf: 'sound', name: 'Pouet', price: 0 },
  { id: 'sound.trumpet', shelf: 'sound', name: 'Trompette', price: 70 },
  { id: 'sound.duck', shelf: 'sound', name: 'Canard', price: 70 },
  { id: 'sound.horn', shelf: 'sound', name: 'Klaxon', price: 120 },
  { id: 'sound.tuba', shelf: 'sound', name: 'Mini-tuba', price: 250 },
];

export const DEFAULTS: Record<Shelf, string> = {
  fur: 'fur.classic',
  cloud: 'cloud.cream',
  hat: 'hat.none',
  face: 'face.none',
  neck: 'neck.none',
  sound: 'sound.pouet',
};

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export function itemsOf(shelf: Shelf): Item[] {
  return ITEMS.filter((i) => i.shelf === shelf);
}

export type BuyResult = 'ok' | 'owned' | 'poor' | 'unknown';

/** Achète (si les moyens suffisent) et équipe directement. Modifie `save`. */
export function buy(save: SaveData, id: string): BuyResult {
  const item = itemById(id);
  if (!item) return 'unknown';
  if (save.owned.includes(id)) return 'owned';
  if (save.coins < item.price) return 'poor';
  save.coins -= item.price;
  save.owned.push(id);
  save.equipped[item.shelf] = id;
  return 'ok';
}

/** Équipe un objet déjà possédé. */
export function equip(save: SaveData, id: string): boolean {
  const item = itemById(id);
  if (!item || !save.owned.includes(id)) return false;
  save.equipped[item.shelf] = id;
  return true;
}
