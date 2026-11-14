import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { freshSave, load, write, type Store } from '../src/save';
import { buy, equip } from '../src/shop';

function fake(init: Record<string, string> = {}): Store & { m: Record<string, string> } {
  const m = { ...init };
  return { m, getItem: (k) => m[k] ?? null, setItem: (k, v) => void (m[k] = v) };
}

describe('sauvegarde', () => {
  it('repart d\'une sauvegarde neuve sans rien stocker', () => {
    const l = load(fake());
    expect(l.data).toEqual(freshSave());
    expect(l.persistent).toBe(true);
  });

  it('aller-retour', () => {
    const st = fake();
    const l = load(st);
    l.data.best = 12;
    l.data.coins = 80;
    expect(write(st, l)).toBe(true);
    expect(load(st).data.best).toBe(12);
  });

  it('JSON corrompu : copie conservée, partie neuve, pas de plantage', () => {
    const st = fake({ [SAVE_KEY]: '{pas du json' });
    const l = load(st);
    expect(l.data).toEqual(freshSave());
    expect(st.m[SAVE_KEY + '.corrupt']).toBe('{pas du json');
    for (const bad of ['null', '[1]', '"x"', '12']) expect(load(fake({ [SAVE_KEY]: bad })).data).toEqual(freshSave());
  });

  it('version future : lecture des champs connus, aucune écriture', () => {
    const st = fake({ [SAVE_KEY]: JSON.stringify({ v: 99, best: 7, nouveau: true }) });
    const l = load(st);
    expect(l.data.best).toBe(7);
    expect(l.writable).toBe(false);
    expect(write(st, l)).toBe(false);
    expect(JSON.parse(st.m[SAVE_KEY]!).v).toBe(99);
  });

  it('valide les valeurs : entiers ≥ 0, ids inconnus retirés, équipement non possédé remis au défaut', () => {
    const st = fake({
      [SAVE_KEY]: JSON.stringify({
        v: 1, best: -4, coins: 'beaucoup', totalCoins: 3.9, games: NaN,
        owned: ['fur.gold', 'fur.truc', 5], equipped: { fur: 'fur.red', hat: 'hat.crown', sound: 'cloud.cream' },
      }),
    });
    const d = load(st).data;
    expect(d.best).toBe(0);
    expect(d.coins).toBe(0);
    expect(d.totalCoins).toBe(3);
    expect(d.owned).toContain('fur.gold');
    expect(d.owned).not.toContain('fur.truc');
    expect(d.equipped.fur).toBe('fur.classic');
    expect(d.equipped.hat).toBe('hat.none');
    expect(d.equipped.sound).toBe('sound.pouet');
  });

  it('navigation privée : stockage absent ou qui jette', () => {
    expect(load(null).persistent).toBe(false);
    const boom: Store = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    const l = load(boom);
    expect(l.persistent).toBe(false);
    expect(write(boom, l)).toBe(false);
  });
});

describe('boutique', () => {
  it('un achat débite, équipe, et refuse sans assez de pièces', () => {
    const s = freshSave();
    s.coins = 59;
    expect(buy(s, 'fur.red')).toBe('poor');
    expect(s.coins).toBe(59);
    s.coins = 100;
    expect(buy(s, 'fur.red')).toBe('ok');
    expect(s.coins).toBe(40);
    expect(s.equipped.fur).toBe('fur.red');
    expect(buy(s, 'fur.red')).toBe('owned');
    expect(equip(s, 'fur.classic')).toBe(true);
    expect(equip(s, 'fur.gold')).toBe(false);
    expect(buy(s, 'nimporte')).toBe('unknown');
  });
});
