# Audit de sécurité V1 / V1 security audit

Portée : tout le code de `feat/v1` (front statique TypeScript compilé par Vite, aucun backend, aucune requête réseau).

| Zone | Constat | Statut |
|---|---|---|
| XSS / injection | Aucun `innerHTML`, `eval`, `new Function`, `document.write`. Tout le DOM dynamique passe par `createElement` / `textContent`. Les noms d'objets de la boutique viennent d'un catalogue en dur. | RAS |
| Sauvegarde `localStorage` non fiable | Lecture dans un `try/catch` ; JSON illisible → copie dans `pouetpanda.save.corrupt` et sauvegarde neuve ; forme non objet refusée ; nombres ramenés à des entiers ≥ 0 (NaN, négatif, texte → 0) ; ids inconnus retirés (`owned` ne contient que des ids du catalogue, pas de clé arbitraire) ; équipement non possédé remis au défaut ; version future lue en lecture seule, jamais réécrite. Tests : `tests/save.test.ts`. | Corrigé / testé |
| Stockage indisponible | Navigation privée ou quota : le jeu fonctionne en mémoire, message « Progression non sauvegardée ». | Testé |
| Dépendances | Seulement des outils de build (`vite`, `tailwindcss`, `typescript`, `vitest`) ; `npm audit` : 0 vulnérabilité. Aucune dépendance au runtime. Pas de CDN, pas de police externe. | RAS |
| CSP / en-têtes | CSP en `<meta>` et en en-tête (`default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `font-src 'self'`, `img-src 'self' data:`, `connect-src 'none'`, `manifest-src 'self'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'` en en-tête), HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP. Aucun attribut `style` ni script inline (la console du navigateur reste propre sous cette CSP). `server_tokens off`. Fichiers cachés refusés. `add_header` répété dans chaque `location` via `security-headers.inc`. | Vérifié (image construite, `curl -I`) |
| Secrets | Aucune clé, jeton ou URL privée dans le code ni l'historique de la branche. | RAS |
| Autres | Aucun `postMessage`, aucun lien sortant, aucun stockage tiers ; audio Web Audio démarré au premier geste ; le hook de test `window.__pp` n'existe que si l'URL contient `?e2e` (lecture seule de l'état, sans effet sur la sauvegarde). | RAS |

À contrôler après déploiement : `curl -I https://pouetpanda.opengamingstudio.com` (si Traefik ajoute déjà des en-têtes, ils seraient en double).
