// Test de bout en bout : sert dist/ en local, ouvre le jeu dans Chrome (puppeteer)
// et exige 0 violation axe-core (WCAG 2.0/2.1/2.2 A + AA, bonnes pratiques) sur chaque écran.
// Usage : npm run build && npm run test:e2e   (PUPPETEER_EXECUTABLE_PATH pour un Chrome système)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

const DIST = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 780, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle0' });

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const visible = (id) => page.$eval(`#${id}`, (e) => !e.hidden);
let failed = 0;

async function check(name, ready) {
  await page.waitForFunction((id) => !document.getElementById(id).hidden, { timeout: 5000 }, ready);
  await pause(400); // fin des animations d'entrée
  const { violations } = await new AxePuppeteer(page).withTags(TAGS).analyze();
  console.log(`${violations.length ? 'ECHEC' : 'ok   '} ${name}: ${violations.length} violation(s)`);
  for (const v of violations) {
    failed++;
    console.log(`  - ${v.id} (${v.impact}) ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`);
  }
}

await check('menu', 'menu');
await page.click('#btn-play');
await check('jeu', 'hud');
await page.click('#btn-pause');
await check('pause', 'pause');
await page.click('#btn-pause-menu');
await check('menu (retour)', 'menu');
await page.click('#btn-shop');
await check('boutique', 'shop');
for (const shelf of ['fur', 'cloud', 'hat', 'sound']) {
  await page.click(`#tab-${shelf}`);
  await check(`boutique, onglet ${shelf}`, 'shop');
}
await page.click('#shop-back');
await page.click('#btn-settings');
await check('réglages', 'settings');
await page.click('#settings-back');
await page.click('#btn-goals');
await check('défis', 'goals');
await page.click('#goals-back');
await page.waitForFunction(() => !document.getElementById('menu').hidden);

if (errors.length) {
  failed += errors.length;
  console.log('Erreurs de console :\n  ' + errors.join('\n  '));
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
