// Toutes les valeurs de réglage du jeu (GDD de Nora, §2.2 à §5). Aucune valeur de jeu en dur ailleurs.

export const W = 360; // largeur logique du plateau
export const H = 640; // hauteur logique du plateau
export const GROUND_Y = 596; // le sol commence ici ; la bande de sol fait 44 px

export const STEP = 1 / 120; // pas fixe de la physique
export const MAX_STEPS_PER_FRAME = 24; // garde-fou après un onglet endormi

export const PANDA_X = 90;
export const PANDA_R = 15; // hitbox (cercle)
export const GRAVITY = 1800;
export const FLAP_VY = -560;
export const MAX_FALL = 900;
export const TOP_OUT = 40; // sortir de plus de 40 px par le haut tue

export const SPEED_START = 150;
export const SPEED_PER_POINT = 2;
export const SPEED_MAX = 230;

export const GAP_START = 170;
export const GAP_PER_POINT = 1;
export const GAP_MIN = 135;
export const PAIR_SPACING = 220;
export const FIRST_PAIR_X = 500;
export const BAMBOO_W = 56;
export const GAP_CENTER_MIN = 140;
export const GAP_CENTER_MAX = 500;
export const GAP_CENTER_MAX_STEP = 180;

// Pièces
export const COIN_R = 10;
export const COIN_REACH = 6;
export const COIN_OFFSET = 40;
export const COIN_BONUS_BIOME = 5;
export const COIN_BONUS_RECORD = 10;

// Biomes
export const BIOME_BLOCK = 10; // un biome tous les 10 points
export const SPECIAL_ORDER = ['ice', 'fire', 'swamp', 'storm'] as const;
export const BANNER_TIME = 1.5;
export const FADE_TIME = 0.5;

// Glace
export const ICE_SLIDE_TIME = 0.3;
export const ICE_INVINCIBLE = 1;

// Feu
export const CHILI_LOCALS = [1, 4, 7]; // rang de la paire dans le biome (paires 31, 34, 37…)
export const CHILI_R = 12;
export const DASH_TIME = 2.5;
export const DASH_EXTEND = 1.5;
export const DASH_SPEED = 1.6;
export const DASH_AFTER = 0.5;
export const DASH_STEER = 8; // vivacité du guidage vers le centre de l'ouverture

// Marais
export const SWAMP_FLAP_VY = -670;
export const SWAMP_GRAVITY = 1530;
export const SWAMP_MOVE_AMP = 40;
export const SWAMP_MOVE_PERIOD = 2;

// Orage
export const GUST_WARN = 1;
export const GUST_TIME = 0.8;
export const GUST_FORCE = 600;

// Fin de partie
export const SLOWMO_TIME = 0.4;
export const SLOWMO_SCALE = 0.4;
export const DEATH_MAX = 1.6;
export const END_TAP_GUARD = 0.45; // anti double-tap : pas de « Rejouer » avant ce délai

// Mode assisté (accessibilité) : plus lent et plus doux, sans pénalité (mêmes pièces, même record)
export const ASSIST_SPEED = 0.75;
export const ASSIST_GRAVITY = 0.7;
export const RESUME_COUNTDOWN = 2; // secondes de décompte après une pause

// Sauvegarde
export const SAVE_KEY = 'pouetpanda.save';
export const SAVE_VERSION = 1;
