// Test hors ligne : node e2e/offline.mjs <url> (image locale : docker build -t pouet-panda . && docker run -p 8080:80 pouet-panda). Utilise puppeteer (devDependency ; puppeteer-core en repli) ; CHROME = chemin du navigateur. Code 1 si un contrôle échoue.
const { default: puppeteer } = await import('puppeteer').catch(() => import('puppeteer-core'));
const { stubApi, isApi } = await import('./stub-api.mjs');
if (!process.argv[2]) { console.error('usage : node e2e/offline.mjs <url>'); process.exit(2); }
const url = process.argv[2];
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const p = await b.newPage();
await stubApi(p);
const errs = []; p.on('console', (m) => { if (m.type() === 'error' && !isApi(m)) errs.push(m.text()); }); p.on('pageerror', (e) => errs.push(String(e)));
let ok = true; const check = (n, v) => { console.log(v ? 'OK  ' : 'FAIL', n); if (!v) ok = false; };
await p.setViewport({ width: 390, height: 700 });
await p.goto(url + '?e2e', { waitUntil: 'networkidle0' });
// Première visite : le SW prend la main, puis la page se recharge seule depuis le menu pour se mettre en cache.
await p.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 15000 });
await new Promise((r) => setTimeout(r, 1500));
await p.waitForFunction(() => document.getElementById('menu-title'));
// Purge : un cache d'une ancienne version disparaît quand une nouvelle version du worker s'active
// (SWCHANGE : commande qui change la version de sw.js sur le serveur, fournie par l'appelant).
await p.evaluate(async () => { await caches.open('pouet-panda-ancien'); await caches.open('autre-site'); });
if (process.env.SWCHANGE) {
  (await import('node:child_process')).execSync(process.env.SWCHANGE);
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await p.waitForFunction(async () => !(await caches.keys()).includes('pouet-panda-ancien'), { timeout: 10000 }).catch(() => {});
} else console.log('SKIP purge (pas de SWCHANGE)');
await p.reload({ waitUntil: 'networkidle0' });
const keys = await p.evaluate(() => caches.keys());
if (process.env.SWCHANGE) check('anciens caches purgés, autres conservés : ' + keys.join(','), keys.includes('autre-site') && !keys.includes('pouet-panda-ancien'));
const ver = keys.filter((k) => k.startsWith('pouet-panda-'));
check('un seul cache versionné ' + ver.join(','), ver.length === 1 && /^pouet-panda-[0-9a-f]{10}$/.test(ver[0]));
const n = await p.evaluate(async (k) => (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname), ver[0]);
check('fichiers en cache ' + n.join(' '), n.includes('/') && n.some((x) => x.endsWith('.js')) && n.some((x) => x.endsWith('.css')) && n.some((x) => x.endsWith('.woff2')));
await p.setOfflineMode(true);
await p.reload({ waitUntil: 'networkidle0' });
const title = await p.evaluate(() => document.getElementById('menu-title')?.textContent);
check('hors ligne : menu affiché', /Pouet/.test(title || ''));
const font = await p.evaluate(() => document.fonts.check('16px Fredoka'));
check('hors ligne : police Fredoka', font);
await p.click('#btn-play'); await new Promise((r) => setTimeout(r, 600));
check('hors ligne : partie lancée', await p.evaluate(() => window.__pp?.screen === 'play' || window.__pp?.screen === 'game' || window.__pp?.screen !== 'menu'));
check('aucune erreur console (CSP incluse)', errs.length === 0);
if (errs.length) console.log(errs.slice(0, 5));
await b.close(); process.exit(ok ? 0 : 1);
