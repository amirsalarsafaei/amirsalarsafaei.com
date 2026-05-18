import * as Phaser from 'phaser';

// Reusable asset keys for player spritesheets
export const PLAYER_ASSET_KEYS = {
  IDLE: 'knight_idle',
  WALK: 'knight_walk',
  JUMP: 'knight_jump',
  FALL: 'knight_fall',
  WIN: 'knight_win',
} as const;

// Reusable asset paths for player spritesheets
export const PLAYER_ASSET_PATHS = {
  IDLE: '/game/Knight_player/Idle_KG_1.png',
  WALK: '/game/Knight_player/Walking_KG_1.png',
  JUMP: '/game/Knight_player/Jump_KG_1.png',
  FALL: '/game/Knight_player/Fall_KG_1.png',
  WIN: '/game/Knight_player/knight_win.png',
} as const;

export const BACKGROUND_ASSET_KEYS = {
  BG_0: 'stringstar_bg0',
  BG_1: 'stringstar_bg1',
  BG_2: 'stringstar_bg2',
  TILESET: 'stringstar_tiles',
  PASSKEY: 'passkey',
} as const;

export const BACKGROUND_ASSET_PATHS = {
  BG_0: '/game/stringstar fields/background_0.png',
  BG_1: '/game/stringstar fields/background_1.png',
  BG_2: '/game/stringstar fields/background_2.png',
  TILESET: '/game/stringstar fields/tileset.png',
  PASSKEY: '/game/passkey-3bmzvin8dguf4tw0e2x0ap.png',
} as const;

// Animation configuration
export const ANIM_CONFIG = {
  IDLE: 'idle',
  WALK: 'walk',
  JUMP: 'jump',
  FALL: 'fall',
  WIN: 'win',
  FRAME_COUNT: 5,
  FRAME_RATE: 10,
} as const;
