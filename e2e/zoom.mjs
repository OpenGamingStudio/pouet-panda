// Test de bout en bout : aucun débordement horizontal de 320 à 430 px, y compris à 200 % de zoom
// (un zoom de 200 % équivaut à une fenêtre deux fois plus étroite en px CSS : 160 à 215 px).
// Usage : npm run build && npm run test:zoom   (PUPPETEER_EXECUTABLE_PATH pour un Chrome système)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = join(DIST, path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;

// Éléments visibles qui dépassent le bord droit/gauche de l'écran, ou dont le contenu déborde de la boîte
// (hors zones de défilement vertical voulues : on teste le défilement horizontal uniquement).
const overflow = () =>
  page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const bad = [];
    if (document.documentElement.scrollWidth > W) bad.push('<html> scrollWidth ' + document.documentElement.scrollWidth + ' > ' + W);
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('[hidden], canvas, .sr-only') || el.tagName === 'svg' || el.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.left < -1 || r.right > W + 1) bad.push(`${el.tagName}#${el.id}.${String(el.className).slice(0, 30)} [${Math.round(r.left)}..${Math.round(r.right)}] / ${W}`);
      else if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') bad.push(`${el.tagName}#${el.id} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
    }
    return bad.slice(0, 8);
  });

let page;
for (const width of [160, 180, 195, 215, 320, 360, 390, 430]) {
  page = await browser.newPage();
  await page.setViewport({ width, height: width < 300 ? 320 : 780, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => localStorage.setItem('pouetpanda.best', '123456'));
  await page.goto(url, { waitUntil: 'networkidle0' });
  const steps = [
    ['menu', async () => {}],
    ['boutique', async () => { await page.click('#btn-shop'); await page.waitForFunction(() => !document.getElementById('shop').hidden); }],
    ['boutique, onglet hat', async () => { await page.click('#tab-hat'); }],
    ['boutique, onglet sound', async () => { await page.click('#tab-sound'); }],
    ['retour', async () => { await page.click('#shop-back'); }],
    ['réglages', async () => { await page.click('#btn-settings'); await page.waitForFunction(() => !document.getElementById('settings').hidden); }],
    ['retour', async () => { await page.click('#settings-back'); }],
    ['défis', async () => { await page.click('#btn-goals'); await page.waitForFunction(() => !document.getElementById('goals').hidden); }],
  ];
  for (const [name, act] of steps) {
    await act();
    await pause(450);
    const bad = await overflow();
    console.log(`${bad.length ? 'ECHEC' : 'ok   '} ${width}px ${name}`);
    for (const b of bad) { failed++; console.log('  - ' + b); }
  }
  await page.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
