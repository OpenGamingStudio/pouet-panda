import './style.css';
import * as C from './config';
import { biomeOf, SPECIALS, type BiomeId } from './biomes';
import { Audio } from './audio';
import { blendBiome, drawPanda, drawScene, Fx, makeView, INK, type Look, type View } from './render';
import { freshSave, load, RESERVED_KEYS, write, type Loaded, type MotionPref, type Store } from './save';
import { buy, equip, itemById, itemsOf, SHELVES, type Item, type Shelf } from './shop';
import { Clock, Sim } from './sim';

// ------------------------------------------------------------ utilitaires

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error('élément manquant : ' + id);
  return el as T;
};

function setHidden(id: string, hidden: boolean): void {
  $(id).toggleAttribute('hidden', hidden); // les SVG n'ont pas de propriété hidden
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function storage(): Store | null {
  try {
    const s = window.localStorage;
    s.setItem('pouetpanda.probe', '1');
    s.removeItem('pouetpanda.probe');
    return s;
  } catch {
    return null;
  }
}

const seed = () => (Math.random() * 0xffffffff) >>> 0;

// ------------------------------------------------------------ état

const store = storage();
let saved: Loaded = load(store);
const audio = new Audio();
const fx = new Fx();
let sim = new Sim(seed());
let clock = new Clock(sim);

type Screen = 'menu' | 'play' | 'pause' | 'over' | 'shop' | 'settings';
let screen: Screen = 'menu';
let overAt = 0; // horloge (s) à laquelle le panneau de fin est apparu
let finished = false;
let shake = 0;
let idleScroll = 0;

let shown = biomeOf(0); // biome affiché (mélangé pendant le fondu)
let prevBiome = shown;
let nextBiome = shown;
let fade = 1;
let shownId: BiomeId = 'bamboo';

const stage = $<HTMLCanvasElement>('stage');
const ctx = stage.getContext('2d')!;
let view: View = makeView(360, 640, 1);

const look = (): Look => ({ fur: saved.data.equipped.fur, cloud: saved.data.equipped.cloud, hat: saved.data.equipped.hat });

function persist(): void {
  if (!write(store, saved) && !saved.persistent) toast('Progression non sauvegardée');
}

/** Annonce pour les lecteurs d'écran (région aria-live polie). Les messages d'un même instant sont lus ensemble ; la région est vidée d'abord pour que deux messages identiques soient lus. */
let liveTimer = 0;
let livePending: string[] = [];
function announce(msg: string): void {
  const l = $('live');
  if (livePending.length === 0) l.textContent = '';
  livePending.push(msg);
  window.clearTimeout(liveTimer);
  liveTimer = window.setTimeout(() => {
    l.textContent = livePending.join(' ');
    livePending = [];
  }, 80);
}

let toastTimer = 0;
function toast(msg: string): void {
  const t = $('toast');
  t.replaceChildren();
  t.append(el('p', 'panel px-4 py-2 text-lg font-bold', msg));
  t.hidden = false;
  announce(msg);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), 5000);
}

// ------------------------------------------------------------ réglages

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
function reduced(): boolean {
  const p = saved.data.settings.reducedMotion;
  return p === 'yes' || (p === 'auto' && motionQuery.matches);
}
/** Nom lisible d'une touche (event.code). */
function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const arrows: Record<string, string> = { ArrowLeft: 'Flèche gauche', ArrowRight: 'Flèche droite', ArrowDown: 'Flèche bas', ArrowUp: 'Flèche haut' };
  return arrows[code] ?? code;
}

function applySettings(): void {
  const s = saved.data.settings;
  audio.sound = s.sound;
  audio.music = s.music;
  audio.volume = s.volume / 100;
  audio.apply();
  sim.assist = s.assist;
  setHidden('hud-assist', !s.assist);
  document.documentElement.classList.toggle('reduce', reduced());
  $('set-sound').setAttribute('aria-checked', String(s.sound));
  $('set-sound-v').textContent = s.sound ? 'Oui' : 'Non';
  $('set-music').setAttribute('aria-checked', String(s.music));
  $('set-music-v').textContent = s.music ? 'Oui' : 'Non';
  $('set-assist').setAttribute('aria-checked', String(s.assist));
  $('set-assist-v').textContent = s.assist ? 'Oui' : 'Non';
  $<HTMLInputElement>('set-volume').value = String(s.volume);
  $('set-volume-v').textContent = `${s.volume} %`;
  if (!capturing) $('set-key-v').textContent = keyLabel(s.flapKey);
  document.querySelectorAll<HTMLElement>('[data-motion]').forEach((b) => {
    const on = b.dataset.motion === s.reducedMotion;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1; // un seul arrêt de tabulation pour le groupe, flèches pour choisir
  });
  $('hint').textContent = hintText();
}
let capturing = false; // attente d'une touche pour le saut

function hintText(): string {
  return `Touche l'écran ou appuie sur Espace, ↑ ou ${keyLabel(saved.data.settings.flapKey)} pour péter !`;
}
motionQuery.addEventListener('change', applySettings);

// ------------------------------------------------------------ écrans

const SECTIONS: Record<Screen, string | null> = {
  menu: 'menu', play: null, pause: 'pause', over: 'over', shop: 'shop', settings: 'settings',
};

/** Où va le focus à l'arrivée sur un écran (le titre est lu par le lecteur d'écran). */
const FIRST_FOCUS: Partial<Record<Screen, string>> = {
  menu: 'btn-play', pause: 'btn-resume', over: 'btn-again', shop: 'shop-title', settings: 'settings-title',
};
let settingsFrom: Screen = 'menu';
let countdown = 0; // décompte (s) après une pause

function show(next: Screen, focusId?: string): void {
  screen = next;
  for (const id of ['menu', 'pause', 'over', 'shop', 'settings']) $(id).hidden = SECTIONS[next] !== id;
  $('hud').hidden = !(next === 'play' || next === 'pause');
  $('hud').inert = next === 'pause'; // le dialogue de pause garde le focus
  if (next !== 'play') {
    $('hint-box').hidden = true;
    $('banner').hidden = true;
    $('countdown').hidden = true;
    countdown = 0;
  }
  if (next === 'menu') refreshMenu();
  if (next === 'shop') openShop();
  if (next === 'settings') applySettings();
  if (next === 'menu') resetWorld();
  const target = focusId ?? FIRST_FOCUS[next];
  if (target) $(target).focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function refreshMenu(): void {
  $('menu-best').textContent = String(saved.data.best);
  $('menu-coins').textContent = String(saved.data.coins);
}

function resetWorld(): void {
  sim = new Sim(seed());
  clock = new Clock(sim);
  fx.puffs = [];
  shown = prevBiome = nextBiome = biomeOf(0);
  shownId = 'bamboo';
  fade = 1;
  finished = false;
  shake = 0;
  audio.setBiome('bamboo');
  sim.assist = saved.data.settings.assist;
  setBiomeLabel('bamboo');
}

function startGame(): void {
  audio.unlock();
  audio.startMusic();
  resetWorld();
  setScore(0);
  $('hud-coins').textContent = '0';
  announce(`Partie prête. ${hintText()}`);
  setHidden('hud-ice', true);
  setHidden('hud-fire', true);
  show('play');
  $('hint-box').hidden = false;
}

function setScore(n: number): void {
  const box = $('hud-score-digits');
  box.replaceChildren();
  for (const ch of String(n)) box.append(el('span', 'digit', ch));
  $('hud-score-sr').textContent = `Score ${n}`;
}

function setBiomeLabel(id: BiomeId): void {
  $('hud-biome').textContent = id === 'bamboo' ? 'Bambouseraie' : SPECIALS[id].name;
}

function flapInput(): void {
  if (screen !== 'play' || countdown > 0) return;
  if (sim.phase !== 'ready' && sim.phase !== 'playing') return;
  audio.unlock();
  sim.flap();
  $('hint-box').hidden = true;
}

/** Pause à tout moment de la partie (attente du premier appui, vol, chute). */
function pauseGame(): void {
  if (screen !== 'play' || sim.phase === 'dead') return;
  show('pause');
}

function resumeGame(): void {
  if (screen !== 'pause') return;
  show('play');
  if (sim.phase === 'ready') $('hint-box').hidden = false;
  if (sim.phase === 'playing') {
    countdown = C.RESUME_COUNTDOWN; // le jeu reprend après un court décompte
    announce('Reprise');
  }
}

function toMenu(): void {
  audio.stopMusic();
  show('menu');
}

// ------------------------------------------------------------ événements du jeu

function showBanner(id: BiomeId): void {
  const b = id === 'bamboo' ? null : SPECIALS[id];
  const box = $('banner');
  box.replaceChildren();
  const text = b ? `Biome ${b.name} !` : 'Retour à la bambouseraie';
  setBiomeLabel(id);
  announce(b ? `Biome ${b.name}. ${b.rule}` : text);
  const panel = el('div', 'panel drop px-5 py-2 text-center');
  panel.append(el('p', 'text-3xl font-bold', text));
  if (b) panel.append(el('p', 'text-lg', b.rule));
  box.append(panel);
  box.hidden = false;
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => (box.hidden = true), C.BANNER_TIME * 1000);
}
let bannerTimer = 0;

function handleEvents(): void {
  for (const e of sim.events) {
    switch (e.t) {
      case 'flap':
        audio.fart(saved.data.equipped.sound);
        fx.fart(C.PANDA_X, sim.y, saved.data.equipped.cloud, reduced());
        break;
      case 'score':
        setScore(e.score);
        audio.point();
        $('hud-score').classList.remove('bump');
        void $('hud-score').offsetWidth;
        $('hud-score').classList.add('bump');
        if (e.score % 5 === 0) announce(`Score ${e.score}`);
        break;
      case 'coin':
        audio.coin();
        $('hud-coins').textContent = String(sim.coins);
        announce(`Pièce : ${sim.coins}`);
        break;
      case 'bonus':
        audio.coin();
        $('hud-coins').textContent = String(sim.coins);
        announce(`Bonus de biome : ${sim.coins} pièces`);
        break;
      case 'biome': {
        prevBiome = shown;
        nextBiome = biomeOf(e.score);
        shownId = e.id;
        fade = reduced() ? 1 : 0;
        audio.setBiome(e.id);
        audio.biomeChange();
        showBanner(e.id);
        if (!saved.data.biomesSeen.includes(e.id)) saved.data.biomesSeen.push(e.id);
        setHidden('hud-ice', true);
        break;
      }
      case 'shield':
        setHidden('hud-ice', false);
        announce('Bouclier de glace : le prochain choc ne compte pas');
        break;
      case 'gustWarn':
        announce(e.dir === 1 ? 'Rafale vers le bas dans une seconde' : 'Rafale vers le haut dans une seconde');
        break;
      case 'ice':
        audio.ice();
        setHidden('hud-ice', true);
        shake = reduced() ? 0 : 5;
        announce('Choc absorbé par la glace');
        break;
      case 'chili':
        audio.chili();
        setHidden('hud-fire', false);
        announce('Piment : tu fonces !');
        break;
      case 'dashEnd':
        setHidden('hud-fire', true);
        announce('Fin du piment');
        break;
      case 'die':
        audio.die();
        shake = reduced() ? 0 : 7;
        announce(`Plof ! Score ${sim.score}`);
        setHidden('hud-ice', true);
        setHidden('hud-fire', true);
        break;
      default:
        break;
    }
  }
  sim.events = [];
}

function finishGame(): void {
  finished = true;
  const prev = saved.data.best;
  sim.recordBonus(prev);
  const record = sim.score > prev;
  const d = saved.data;
  d.coins += sim.coins;
  d.totalCoins += sim.coins;
  d.games++;
  if (record) d.best = sim.score;
  persist();
  $('over-score').textContent = String(sim.score);
  $('over-best').textContent = String(d.best);
  $('over-record').hidden = !record;
  $('over-coins').textContent = `+${sim.coins}`;
  $('over-bonus').textContent = record && prev > 0 ? '(record battu : +10)' : '';
  overAt = performance.now() / 1000;
  show('over');
}

// ------------------------------------------------------------ boutique

let shelf: Shelf = 'fur';
let tryOn: Record<Shelf, string> = { ...saved.data.equipped };
const pv = $<HTMLCanvasElement>('preview');
const pctx = pv.getContext('2d')!;
const pfx = new Fx();
let pvTime = 0;
let pvNext = 0;

function openShop(): void {
  tryOn = { ...saved.data.equipped };
  shelf = 'fur';
  renderShop();
}

/** Reconstruit la boutique ; `focusKey` redonne le focus au même contrôle (le DOM est refait à chaque action). */
function renderShop(focusKey?: string): void {
  $('shop-coins').textContent = String(saved.data.coins);
  const tabs = $('tabs');
  tabs.replaceChildren();
  for (const sh of SHELVES) {
    const on = sh.id === shelf;
    const b = el('button', 'tab', sh.name);
    b.type = 'button';
    b.id = `tab-${sh.id}`;
    b.dataset.focus = `tab:${sh.id}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.setAttribute('aria-controls', 'grid');
    b.tabIndex = on ? 0 : -1; // flèches gauche / droite, Début / Fin
    b.addEventListener('click', () => {
      shelf = sh.id;
      audio.tap();
      renderShop(`tab:${sh.id}`);
    });
    b.addEventListener('keydown', (e) => {
      const i = SHELVES.findIndex((x) => x.id === shelf);
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % SHELVES.length;
      else if (e.key === 'ArrowLeft') j = (i + SHELVES.length - 1) % SHELVES.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = SHELVES.length - 1;
      if (j < 0) return;
      e.preventDefault();
      shelf = SHELVES[j]!.id;
      audio.tap();
      renderShop(`tab:${shelf}`);
    });
    tabs.append(b);
  }
  const grid = $('grid');
  grid.setAttribute('aria-labelledby', `tab-${shelf}`);
  grid.replaceChildren();
  const list = el('ul', 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4');
  for (const item of itemsOf(shelf)) list.append(card(item));
  grid.append(list);
  const names = (Object.keys(tryOn) as Shelf[]).map((k) => itemById(tryOn[k])?.name ?? '').join(', ');
  $('preview').setAttribute('aria-label', `Aperçu du panda : ${names}`);
  if (focusKey) document.querySelector<HTMLElement>(`[data-focus="${focusKey}"]`)?.focus({ preventScroll: true });
}

function card(item: Item): HTMLElement {
  const d = saved.data;
  const owned = d.owned.includes(item.id);
  const equipped = d.equipped[item.shelf] === item.id;
  const c = el('li', 'card');
  if (tryOn[item.shelf] === item.id) c.classList.add('bg-sun');
  const pic = el('button', 'card-pic');
  pic.type = 'button';
  pic.dataset.focus = `pic:${item.id}`;
  pic.setAttribute('aria-label', `Essayer : ${item.name}`);
  pic.setAttribute('aria-pressed', String(tryOn[item.shelf] === item.id));
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 120;
  cv.className = 'h-20 w-full';
  cv.setAttribute('aria-hidden', 'true');
  drawThumb(cv, item);
  pic.append(cv);
  pic.addEventListener('click', () => select(item, `pic:${item.id}`));
  const name = el('h3', 'text-center text-lg font-bold', item.name);
  name.id = `name-${item.id}`;
  c.append(pic, name);
  const b = el('button', 'btn min-h-12 text-lg');
  b.type = 'button';
  b.dataset.focus = `act:${item.id}`;
  b.setAttribute('aria-describedby', name.id); // « Acheter (400) », puis le nom de l'objet
  if (equipped) {
    b.textContent = 'Équipé';
    b.classList.add('btn-sand');
    b.setAttribute('aria-disabled', 'true'); // reste focalisable : le focus ne se perd pas
  } else if (owned) {
    b.textContent = 'Équiper';
    b.classList.add('btn-cream');
    b.addEventListener('click', () => {
      equip(d, item.id);
      persist();
      tryOn[item.shelf] = item.id;
      announce(`${item.name} équipé`);
      renderShop(`act:${item.id}`);
    });
  } else if (d.coins >= item.price) {
    b.textContent = `Acheter (${item.price})`;
    b.classList.add('btn-berry');
    b.addEventListener('click', () => {
      if (buy(d, item.id) === 'ok') {
        audio.buy();
        persist();
        tryOn[item.shelf] = item.id;
        announce(`${item.name} acheté, il te reste ${d.coins} pièces`);
        renderShop(`act:${item.id}`);
      }
    });
  } else {
    b.textContent = `Il manque ${item.price - d.coins}`;
    b.classList.add('btn-sand');
    b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', () => select(item, `act:${item.id}`));
  }
  c.append(b);
  return c;
}

function select(item: Item, focusKey: string): void {
  tryOn[item.shelf] = item.id;
  if (item.shelf === 'sound') audio.fart(item.id);
  pvNext = 0;
  renderShop(focusKey);
}

function drawThumb(cv: HTMLCanvasElement, item: Item): void {
  const g = cv.getContext('2d')!;
  g.fillStyle = '#8FD8FF';
  g.fillRect(0, 0, cv.width, cv.height);
  const l: Look = { fur: 'fur.classic', cloud: 'cloud.cream', hat: 'hat.none' };
  if (item.shelf === 'fur') l.fur = item.id;
  if (item.shelf === 'hat') l.hat = item.id;
  if (item.shelf === 'cloud') {
    const f = new Fx();
    f.fart(70, 52, item.id, false);
    f.update(0.2);
    f.update(0.05);
    g.save();
    g.scale(1.8, 1.8);
    g.translate(8, 0);
    f.draw(g);
    drawPanda(g, 70, 34, 0.1, { ...l, cloud: item.id }, 1);
    g.restore();
    return;
  }
  if (item.shelf === 'sound') {
    const n = Math.max(1, Math.min(4, Math.round(item.price / 70) || 1));
    g.fillStyle = '#FFD60A';
    g.strokeStyle = INK;
    g.lineWidth = 6;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(40, 48); g.lineTo(62, 48); g.lineTo(90, 26); g.lineTo(90, 94); g.lineTo(62, 72); g.lineTo(40, 72);
    g.closePath(); g.fill(); g.stroke();
    for (let i = 0; i < n; i++) {
      g.beginPath();
      g.arc(92, 60, 18 + i * 14, -0.9, 0.9);
      g.stroke();
    }
    return;
  }
  g.save();
  g.scale(2, 2);
  drawPanda(g, 40, 32, 0, l, 1.15);
  g.restore();
}

function drawPreview(dt: number): void {
  const r = pv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (pv.width !== w || pv.height !== h) {
    pv.width = w;
    pv.height = h;
  }
  pvTime += dt;
  const l: Look = { fur: tryOn.fur, cloud: tryOn.cloud, hat: tryOn.hat };
  if (pvTime >= pvNext) {
    pvNext = pvTime + 1.3;
    pfx.fart(w / dpr / 2, h / dpr / 2, l.cloud, reduced());
  }
  pfx.update(dt);
  pctx.setTransform(1, 0, 0, 1, 0, 0);
  pctx.fillStyle = '#8FD8FF';
  pctx.fillRect(0, 0, w, h);
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bob = reduced() ? 0 : Math.sin(pvTime * 4) * 5;
  pctx.fillStyle = '#7DB534';
  pctx.fillRect(0, h / dpr - 10, w / dpr, 10);
  pfx.draw(pctx);
  drawPanda(pctx, w / dpr / 2, h / dpr / 2 + bob, Math.sin(pvTime * 4) * 0.1, l, 1.3);
}

// ------------------------------------------------------------ entrées

stage.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  flapInput();
});
stage.addEventListener('contextmenu', (e) => e.preventDefault());

/** Un contrôle (bouton, curseur…) a le focus : ses touches lui appartiennent. */
function onControl(e: Event): boolean {
  return e.target instanceof HTMLElement && e.target.closest('button, input, select, textarea, a') !== null;
}

function stopCapture(label?: string): void {
  capturing = false;
  $('set-key-v').textContent = label ?? keyLabel(saved.data.settings.flapKey);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (capturing) { // choix de la touche de saut
    e.preventDefault();
    if (e.code === 'Escape') {
      stopCapture();
      announce('Choix annulé');
    } else if (RESERVED_KEYS.includes(e.code)) {
      announce('Cette touche est réservée, choisis-en une autre');
    } else {
      saved.data.settings.flapKey = e.code;
      persist();
      stopCapture();
      applySettings();
      announce(`Touche de saut : ${keyLabel(e.code)}`);
    }
    return;
  }
  const flapKey = e.code === 'Space' || e.code === 'ArrowUp' || e.code === saved.data.settings.flapKey;
  if (screen === 'play' && flapKey && !onControl(e)) {
    e.preventDefault();
    flapInput();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (screen === 'play') pauseGame();
    else if (screen === 'pause') resumeGame();
    else if (screen === 'over' && e.code === 'Escape') toMenu();
    else if (screen === 'shop') show('menu', 'btn-shop');
    else if (screen === 'settings') closeSettings();
  }
});

function closeSettings(): void {
  if (settingsFrom === 'pause') show('pause', 'btn-pause-settings');
  else show('menu', 'btn-settings');
}

function guardedAgain(): void {
  if (performance.now() / 1000 - overAt < C.END_TAP_GUARD) return;
  startGame();
}

$('btn-play').addEventListener('click', startGame);
$('btn-again').addEventListener('click', guardedAgain);
$('btn-pause').addEventListener('click', pauseGame);
$('btn-resume').addEventListener('click', resumeGame);
$('btn-pause-menu').addEventListener('click', toMenu);
$('btn-pause-settings').addEventListener('click', () => { settingsFrom = 'pause'; show('settings'); });
$('btn-over-menu').addEventListener('click', toMenu);
$('btn-shop').addEventListener('click', () => { audio.unlock(); show('shop'); });
$('btn-over-shop').addEventListener('click', () => { show('shop'); });
$('shop-back').addEventListener('click', () => show('menu', 'btn-shop'));
$('btn-settings').addEventListener('click', () => { audio.unlock(); settingsFrom = 'menu'; show('settings'); });
$('settings-back').addEventListener('click', closeSettings);

$('set-sound').addEventListener('click', () => {
  saved.data.settings.sound = !saved.data.settings.sound;
  persist();
  applySettings();
  audio.tap();
});
$('set-music').addEventListener('click', () => {
  saved.data.settings.music = !saved.data.settings.music;
  persist();
  applySettings();
});
$('set-assist').addEventListener('click', () => {
  saved.data.settings.assist = !saved.data.settings.assist;
  persist();
  applySettings();
});
const volume = $<HTMLInputElement>('set-volume');
volume.addEventListener('input', () => {
  saved.data.settings.volume = Number(volume.value);
  applySettings();
});
volume.addEventListener('change', () => {
  persist();
  audio.unlock();
  audio.tap(); // un bip pour juger le niveau
});
$('set-key').addEventListener('click', () => {
  capturing = true;
  $('set-key-v').textContent = 'Appuie sur une touche…';
  announce('Appuie sur la touche de ton choix. Échap pour annuler.');
});
$('set-key').addEventListener('blur', () => stopCapture());

// Groupe de boutons radio : flèches pour choisir, un seul arrêt de tabulation
const motionBtns = [...document.querySelectorAll<HTMLElement>('[data-motion]')];
function setMotion(b: HTMLElement): void {
  saved.data.settings.reducedMotion = b.dataset.motion as MotionPref;
  persist();
  applySettings();
}
motionBtns.forEach((b, i) => {
  b.addEventListener('click', () => setMotion(b));
  b.addEventListener('keydown', (e) => {
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % motionBtns.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + motionBtns.length - 1) % motionBtns.length;
    if (j < 0) return;
    e.preventDefault();
    motionBtns[j]!.focus();
    setMotion(motionBtns[j]!);
  });
});

// Effacer : deux appuis, sans délai (l'armement saute si le focus quitte le bouton)
let resetArmed = false;
const resetBtn = $('set-reset');
function disarmReset(): void {
  resetArmed = false;
  resetBtn.textContent = 'Effacer ma progression';
}
resetBtn.addEventListener('blur', disarmReset);
resetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetBtn.textContent = 'Sûr ? Appuie encore';
    announce('Sûr ? Appuie encore sur le bouton pour tout effacer.');
    return;
  }
  disarmReset();
  saved = { ...saved, data: freshSave(), writable: true };
  persist();
  applySettings();
  toast('Progression effacée');
});

// Onglet masqué ou fenêtre quittée : pause (seulement en plein vol, pour ne pas gêner l'attente du premier appui)
const autoPause = (): void => {
  if (sim.phase === 'playing') pauseGame();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) autoPause();
});
window.addEventListener('blur', autoPause);

// ------------------------------------------------------------ boucle

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  stage.width = Math.max(1, Math.round(w * dpr));
  stage.height = Math.max(1, Math.round(h * dpr));
  view = makeView(w, h, dpr);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  let alpha = 0;
  if (screen === 'play' && countdown > 0) {
    countdown = Math.max(0, countdown - dt);
    const n = Math.ceil(countdown);
    $('countdown').textContent = String(n);
    $('countdown').hidden = n === 0;
    if (countdown === 0) $('countdown').hidden = true;
  } else if (screen === 'menu' || screen === 'play' || screen === 'over') {
    if (screen !== 'over' || sim.phase !== 'dead') alpha = clock.advance(dt);
    handleEvents();
    if (screen === 'play' && sim.phase === 'dead' && !finished) finishGame();
  }
  if (screen === 'menu') idleScroll += dt * 40;
  if (fade < 1) {
    fade = Math.min(1, fade + dt / C.FADE_TIME);
    shown = blendBiome(prevBiome, nextBiome, fade);
  } else shown = nextBiome;
  fx.update(sim.phase === 'dead' || countdown > 0 ? 0 : dt);
  if (sim.dash > 0 && screen === 'play' && countdown <= 0 && !reduced()) fx.flame(C.PANDA_X, sim.y);
  if (shake > 0) shake = Math.max(0, shake - dt * 18);
  if (screen === 'shop') {
    drawPreview(dt);
    // le plateau n'est pas dessiné derrière la boutique
  } else if (screen !== 'settings') {
    drawScene(ctx, view, {
      sim, look: look(), biome: shown, biomeId: shownId, fx, alpha, reduced: reduced(), shake,
      scrollIdle: idleScroll, showPanda: true,
      pandaX: screen === 'menu' ? C.W / 2 : undefined, pandaScale: screen === 'menu' ? 1.8 : 1,
    });
  }
  requestAnimationFrame(frame);
}

applySettings();
refreshMenu();
if (!saved.persistent) toast('Progression non sauvegardée');
requestAnimationFrame(frame);

// Pour les tests de bout en bout (lecture seule de l'état).
if (location.search.includes('e2e')) {
  (window as unknown as { __pp?: unknown }).__pp = { get sim() { return sim; }, get screen() { return screen; } };
}
