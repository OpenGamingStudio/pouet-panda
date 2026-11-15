# GDD - Pouet Panda : décisions de conception

Le GDD d'origine (Nora, `panda-flappy`) prévoyait une alternance stricte : un bloc de bambou normal, puis un biome spécial dans l'ordre Glace, Feu, Marais, Orage. Cette section le remplace.

## Biomes : tirage libre (décision du 2026-11-15)

- Le changement de biome a lieu tous les 8 points (`BIOME_BLOCK`). Le 1er bloc (0-7) est toujours la Bambouseraie.
- Ensuite, chaque bloc est tiré au hasard parmi les 5 biomes (Bambouseraie, Glace, Feu, Marais, Orage), sans jamais répéter le biome précédent (`BiomePlan` dans `src/biomes.ts`).
- Les biomes spéciaux peuvent donc s'enchaîner (par exemple Glace puis Feu), alors que l'alternance ne le permettait pas. L'ordre fixe Glace, Feu, Marais, Orage n'existe plus.
- Écart accepté : une partie peut enchaîner plusieurs biomes spéciaux d'affilée, donc être plus dure ou plus facile qu'une autre selon le tirage, et les +5 pièces « biome spécial survécu » ne tombent plus à un rythme régulier.
- Équilibrage prévu en P2 (fréquence des spéciaux, difficulté des enchaînements, gain de pièces).
