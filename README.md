# Pouet Panda

Un flappy où un panda vole en pétant. Un appui = un pouet = une impulsion vers le haut. Il passe entre des tiges de bambou, ramasse des pièces et change de biome tous les 10 points. Jouable dans le navigateur, au doigt, à la souris et au clavier.

A flappy-style web game: a panda flies by farting between bamboo stalks. One tap, one toot. Playable in the browser and on mobile.

- Jouer / Play : https://pouetpanda.opengamingstudio.com (bientôt / soon)
- Licence : [MIT](LICENSE)
- Projet de [OpenGamingStudio](https://github.com/OpenGamingStudio), studio de jeux web open source.

## Le jeu / The game

| | |
|---|---|
| Contrôles | tap ou clic sur le plateau, `Espace`, `↑` ou `W` pour péter ; `Échap` ou `P` pour la pause (automatique si l'onglet est caché) |
| Score | 1 point par paire de bambous franchie ; la vitesse monte et l'ouverture rétrécit avec le score |
| Biomes | tous les 10 points : Bambouseraie (normale, la lumière change) puis un biome spécial, dans l'ordre Glace, Feu, Marais, Orage |
| Glace | le premier choc ne tue pas : le panda glisse, puis 1 s d'invincibilité (bouclier à côté du score) |
| Feu | un piment donne un dash de 2,5 s (×1,6, invincible, guidé vers l'ouverture) |
| Marais | pets 20 % plus forts, gravité réduite, un bambou sur deux bouge |
| Orage | rafales annoncées par une flèche 1 s avant |
| Pièces | une pièce dans une ouverture sur deux, +5 pièces par biome spécial survécu, +10 pour un record battu |
| Boutique | pelages, nuages de pet, chapeaux et sons du pet (aucun effet sur le jeu) |
| Sauvegarde | `localStorage` (`pouetpanda.save`), versionnée, validée à la lecture ; le jeu marche aussi sans stockage |

Le premier pet lance la partie. Toutes les valeurs de réglage sont dans [`src/config.ts`](src/config.ts).

## Développement / Development

Node ≥ 20.

```
npm install
npm run dev        # serveur de développement
npm test           # tests (physique, biomes, sauvegarde, boutique)
npm run build      # vérification des types + build dans dist/
```

Structure : `src/sim.ts` (simulation en pas fixe de 1/120 s, indépendante du taux de rafraîchissement, sans DOM), `src/biomes.ts`, `src/save.ts`, `src/shop.ts`, `src/render.ts` (canvas 2D), `src/audio.ts` (Web Audio, aucun fichier son), `src/main.ts` (écrans, entrées, boucle).

## Styles

Tailwind CSS v4 en socle (`@theme` dans `src/style.css`), compilé au build par `@tailwindcss/vite`. Police Fredoka auto-hébergée (`src/fonts`, licence OFL). Aplats, contour encre, ombres dures : aucun dégradé, aucun flou, aucune ressource externe.

## Déploiement / Deployment

`Dockerfile` en deux étapes (build Node 20, puis `nginx:1.27-alpine`) avec `nginx.conf` et `security-headers.inc` : `server_tokens off`, CSP stricte, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP. Test local : `docker build -t pouet-panda . && docker run --rm -p 8080:80 pouet-panda`, puis `curl -I localhost:8080`. HSTS n'a d'effet que sur HTTPS (assuré par Traefik).

## Contribuer / Contributing

Les issues et les pull requests sont bienvenues. Les contributions sont vérifiées (cohérence, pertinence, fonctionnement) puis relues par l'équipe avant fusion sur `main`.
Issues and pull requests are welcome. Contributions are checked and reviewed by the team before being merged into `main`.

## Accessibilité

Clavier, lecteur d'écran, mode assisté, mouvements réduits, volume réglable : voir [ACCESSIBILITY.md](ACCESSIBILITY.md).
