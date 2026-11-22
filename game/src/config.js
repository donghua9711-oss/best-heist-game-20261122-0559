// Every tuning number and colour for The Night Vault in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule depends on screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The band across the top of the frame the HUD lives in; the gallery floor starts below it. */
export const HUD_HEIGHT = 64;

export const THIEF = {
  radius: 13,
  walkSpeed: 168,
  sneakSpeed: 92,
  startCoins: 3,
  /** How close a tossed coin's ring carries: guards inside it turn to look. */
  coinHearing: 300,
  coinMaxThrow: 380,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 74,
  huntSpeed: 148,
  investigateSpeed: 108,
  /** Seconds a guard needs at a coin's landing spot before it gives up and walks back. */
  lookSeconds: 2.2,
  /** Seconds of lost sight before a hunting guard gives up and returns to its patrol. */
  memorySeconds: 3.5,
  catchDistance: 27,
};

export const VISION = {
  guardRange: 186,
  guardHalfAngle: 0.62,
  cameraRange: 232,
  cameraHalfAngle: 0.46,
  /** Alarm points a second a guard adds at point blank, falling off with distance. */
  guardRate: 62,
  cameraRate: 44,
};

export const ALARM = {
  max: 100,
  /** Points a second the meter sheds once nobody has seen the thief for a moment. */
  decay: 10,
  decayDelay: 0.9,
  /** Crossing a live laser adds this much at once. */
  laserHit: 42,
};

export const DISK = {
  /** Seconds standing in the pedestal's light to lift the Sun Disk. */
  liftSeconds: 0.9,
  value: 10000,
};

export const LASER = { onSeconds: 2.6, offSeconds: 1.5 };

export const PALETTE = {
  backdrop: '#070a14',
  floorA: '#1a2340',
  floorB: '#161e36',
  carpet: '#5e1f2a',
  carpetEdge: '#c9a227',
  wall: '#0d1226',
  wallTop: '#2b3763',
  brass: '#c9a227',
  brassDim: '#8a6d1f',
  caseWood: '#33261a',
  caseGlass: '#9fd8f2',
  pillar: '#39477a',
  planter: '#1e4634',
  leaf: '#2f7a4e',
  bench: '#4a3421',
  guardBody: '#c23b3b',
  guardDark: '#7e2222',
  thiefBody: '#e9e4d8',
  thiefShade: '#b9b2a0',
  cameraBody: '#d8d3c3',
  coneGuard: '255, 176, 66',
  coneCamera: '84, 199, 255',
  coneAlert: '255, 84, 60',
  loot: '#ffd94d',
  laser: '#ff3b30',
  text: '#f2ead2',
  muted: '#9aa3bd',
  alarmCalm: '#43d17c',
  alarmWary: '#ffb02e',
  alarmTripped: '#ff5347',
};

export const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best haul is kept between visits (this browser only). */
export const BEST_KEY = 'night-vault.best';
