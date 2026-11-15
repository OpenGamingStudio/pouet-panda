# GDD - Pouet Panda : décisions de conception

Le GDD d'origine (Nora, `panda-flappy`) prévoyait une alternance stricte : un bloc de bambou normal, puis un biome spécial dans l'ordre Glace, Feu, Marais, Orage. Cette section le remplace.

## Biomes : tirage libre (décision du 2026-11-15)

- Le changement de biome a lieu tous les 8 points (`BIOME_BLOCK`). Le 1er bloc (0-7) est toujours la Bambouseraie.
- Ensuite, chaque bloc est tiré au hasard parmi les 5 biomes (Bambouseraie, Glace, Feu, Marais, Orage), sans jamais répéter le biome précédent (`BiomePlan` dans `src/biomes.ts`).
- Les biomes spéciaux peuvent donc s'enchaîner (par exemple Glace puis Feu), alors que l'alternance ne le permettait pas. L'ordre fixe Glace, Feu, Marais, Orage n'existe plus.
- Écart accepté : une partie peut enchaîner plusieurs biomes spéciaux d'affilée, donc être plus dure ou plus facile qu'une autre selon le tirage, et les +5 pièces « biome spécial survécu » ne tombent plus à un rythme régulier.
- Équilibrage prévu en P2 (fréquence des spéciaux, difficulté des enchaînements, gain de pièces).

## Équilibrage des biomes spéciaux (P2, 2026-11-15)

Le tirage libre est conservé (même biome jamais deux fois de suite, aucune alternance imposée). On corrige à la place ses écarts de difficulté et de récompense :

- **Rampe d'intensité** : l'amplitude des paires mobiles du Marais (`SWAMP_MOVE_AMP`) et la force des rafales de l'Orage (`GUST_FORCE`) sont multipliées par x0,85 au 1er bloc, +0,05 par bloc, plafonnées à x1,15 au 7e bloc (`SPECIAL_RAMP_*`). Un biome spécial tiré tôt est donc plus doux, tiré tard plus exigeant, ce qui suit la courbe de vitesse et d'ouverture.
- **Chaîne de spéciaux** : si un spécial suit un autre spécial, ses ouvertures gagnent +8 px par maillon au-delà du premier (`CHAIN_GAP_BONUS`, plafond 2 maillons, soit +16 px). Cela compense l'absence de Bambouseraie pour souffler.
- **Récompense** : le bonus « biome spécial survécu » passe de 5 à 5 + 2 pièces par maillon enchaîné (`CHAIN_COIN_BONUS`, plafond +4), car il tombe moins régulièrement qu'avec l'alternance.
- Inchangés : Glace (bouclier et glissade), Feu (piments aux rangs 1, 4, 7 et ruée), vitesse et ouverture de base.
- Écart restant accepté : la fréquence des spéciaux reste aléatoire (en moyenne 4 blocs sur 5 après le 1er).
