# Audit mobile et lecteur d'écran (V1.2, PR4)

Base : `main` 4e4ee37. Date : 2026-11-15.

## Limite à lire d'abord

Cet audit a été fait dans **Chrome sur serveur, en émulation** (écran tactile, 320 px, zoom).
**Aucun vrai téléphone, ni TalkBack, ni VoiceOver n'était disponible.** Les points
« lecteur d'écran » ci-dessous viennent de l'arbre d'accessibilité de Chrome : ils prouvent
que les noms, rôles et états sont corrects, **pas** que l'exploration au doigt marche.
Le test sur appareil réel reste à faire (checklist plus bas).

## Méthode rejouable

- Préparer : `npm i --no-save puppeteer-core` (Chrome local, chemin dans `CHROME_PATH`, défaut `/usr/bin/google-chrome`), après `npm run build`.
- `node docs/audit-mobile/scripts/audit.mjs dist out` : mesure toutes les cibles interactives visibles de chaque écran (menu, boutique, réglages, partie, pause), le défilement horizontal et les éléments coupés (à gauche, à droite, en haut ou en bas, sauf si un parent défile), prend des captures. Les serveurs des scripts n'écoutent que sur 127.0.0.1 et refusent tout chemin hors de `dist`.
- `node docs/audit-mobile/scripts/ax.mjs dist` : affiche l'arbre d'accessibilité de chaque écran.
- Tailles : mobile 320×568 (tactile, ×2), zoom 200 % (640×360 CSS, équivalent d'un 1280×720 zoomé à 200 %), zoom 400 % (320×180, critère de reflow WCAG 1.4.10).

## Résultats

| Contrôle | Résultat |
|---|---|
| Cibles ≥ 44×44 px (menu, boutique, réglages, partie, pause ; 320 px, 200 %, 400 %) | OK : 0 bouton, onglet, interrupteur, radio ou curseur sous 44 px. Les seules mesures plus petites sont les titres `h2` (focus programmatique, pas une cible) |
| `user-scalable=no` / `maximum-scale` | Absents : viewport `width=device-width, initial-scale=1, viewport-fit=cover`. Rien à corriger |
| Défilement horizontal | Aucun (reflow 320 px OK) |
| Éléments coupés, 320 px | Aucun sur les 5 écrans |
| Éléments coupés, zoom 200 % et 400 % | **ÉCHEC (WCAG 1.4.10 reflow)** : le menu n'est pas défilable (`#app` fixed, overflow-hidden) ; à 200 % Boutique et Réglages sont sous le bas de l'écran (`zoom200-menu.png`) ; à 400 % titre, Jouer, Boutique et Réglages sont coupés, les onglets de la boutique et le bouton Menu de la pause aussi. Renvoyé à PR1 « menu qui défile » (pause 400 % à revoir avec). Boutique et Réglages défilent (overflow-y-auto) à 200 % ; au 400 %, seuls les onglets de la boutique sont coupés |
| Zone de sécurité (encoche) | `env(safe-area-inset-*)` utilisé dans le HUD |
| Noms accessibles | Tous les boutons ont un nom (« Retour au menu », « Fermer les réglages », « Essayer : Panda roux », « Il manque 60 »...) |
| Rôles et états | `switch` avec `checked`, `radiogroup` Auto/Oui/Non, `slider` avec valeur, `tablist` de la boutique, `dialog` pour la pause |
| Annonces | Région `status` (aria-live polite) : « Partie prête… », score, pièces, biome |
| Textes dans le HUD | Score et pièces ont un équivalent `sr-only`, les chiffres décoratifs sont `aria-hidden` |

Captures dans `docs/audit-mobile/` : `320-*.png`, `zoom200-*.png`, `zoom400-*.png` (menu, boutique, réglages, pause).

## Risques non levés (à tester sur appareil)

1. **Canvas plein écran + exploration au doigt.** Avec TalkBack ou VoiceOver, le toucher est intercepté pour l'exploration : un appui simple ne fait pas sauter le panda, il faut un double-tap. Le canvas annonce « Plateau de jeu : touche l'écran ou appuie sur Espace pour péter » : à vérifier que le double-tap fait bien un saut, et que l'astuce est comprise. Prévoir un bouton « Péter » réel si ce n'est pas le cas.
2. **Focus après changement d'écran.** Vérifié au clavier par le script du studio ; à confirmer au lecteur d'écran (le focus doit se poser sur le titre ou le premier bouton).
3. **Annonces de partie.** Le score est annoncé tous les 5 points : confirmer qu'une voix qui parle pendant le jeu ne gêne pas le rythme.
4. **Clavier virtuel / rotation paysage** sur téléphone réel : la mise en page a été vérifiée à 640×360 mais pas avec la barre d'adresse mobile qui change `100dvh`.

## Checklist pour le test sur appareil réel

- Android + TalkBack (Chrome) : menu → Jouer (double-tap) → saut par double-tap → pause → boutique (onglets) → réglages (interrupteurs, curseur) → fin de partie.
- iOS + VoiceOver (Safari) : même parcours, plus le rotor (titres, boutons).
- Zoom système à 200 % et police agrandie ; portrait et paysage.
- Noter : ce qui est annoncé, ce qui manque, tout geste impossible.

## Corrections de code dans cette PR

Aucune dans cette PR (doc seule) : les cibles et le 320 px sont conformes, l'échec du zoom 200 % / 400 % est à corriger par PR1. Seule `ACCESSIBILITY.md` garde la mention « Non couvert » jusqu'au test réel.
