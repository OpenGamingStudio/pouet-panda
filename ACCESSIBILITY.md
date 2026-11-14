# Accessibilité / Accessibility (WCAG 2.2 AA)

## Ce que fait le jeu

- **Clavier** : Espace, ↑ ou une touche au choix (Réglages, `W` par défaut) pour péter ; Échap ou P = pause ; Échap ferme boutique, réglages et écran de fin ; flèches dans les onglets de la boutique (Début/Fin) et dans « Mouvements réduits ».
- **Souris / tactile** : tout le plateau est la zone de saut ; chaque bouton fait au moins 44 px ; le curseur de volume fait 44 px de haut.
- **Focus visible** sur tous les fonds (filet encre cerné de blanc) ; le focus est rendu au bon bouton en quittant une page ou après un achat.
- **Lecteur d'écran** : HTML sémantique (`main`, titres, `dialog` pour pause et fin de partie, `tablist`, `switch`, `radiogroup`), région `aria-live` pour le score (tous les 5 points), les pièces, les biomes, le bouclier, le piment, les rafales et la fin de partie.
- **Sans la couleur** : chaque biome a son motif sur les tiges (nœuds, éclats, braises, ondulation, chevrons), les ouvertures mobiles du Marais ont une double flèche, et le nom du biome reste affiché.
- **Mode assisté** : vitesse × 0,75, gravité × 0,7 (même hauteur de saut). Aucune pénalité : mêmes pièces, même record.
- **Pause à tout moment**, décompte de 2 s à la reprise ; pause automatique si l'onglet est masqué.
- **Mouvements réduits** (Auto = système) : pas de secousse, pas de clignotement, flammes remplacées par un anneau fixe, glace et décor figés. Hors de ce mode, aucun clignotement ne dépasse 3 par seconde.
- **Son** : effets, musique, volume réglable (0-100 %).
- `lang="fr"`, zoom autorisé, aucune limite de temps (le décompte seul est court et la pause l'annule).

## Vérifications rejouables

- axe-core 4 (WCAG 2.0/2.1/2.2 A+AA + bonnes pratiques) sur menu, partie, pause, fin, boutique, réglages : 0 violation.
- Lighthouse (mobile) : accessibilité 100, bonnes pratiques 100, performance 100.
- Parcours clavier complet et relevé des annonces `aria-live` : scripts de contrôle du studio (puppeteer).
- Non couvert : essai avec un vrai lecteur d'écran (NVDA, VoiceOver, TalkBack) et sur un vrai téléphone.
