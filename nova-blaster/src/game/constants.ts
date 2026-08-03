// Gameplay tuning and shared constants for NOVA BLASTER.
// Keeping these in one place makes balancing and reading the engine easier.

export const CANVAS_W = 480;
export const CANVAS_H = 720;

export const MAX_DPR = 2;

export const PLAYER = {
  width: 32,
  height: 36,
  speed: 5,
  startHp: 3,
  maxHp: 5,
  fireRate: 9,
  startX: CANVAS_W / 2,
  startY: CANVAS_H - 100,
  invincibleFrames: 100,
} as const;

export const BULLETS = {
  width: 4,
  height: 14,
  baseSpeed: 11,
  spreadOffsets: [10, 18] as const,
  spreadAngles: [1.6, 3.2] as const,
  spreadSpeeds: [10.5, 10] as const,
  homingSpeed: 7.5,
  homingTurn: 0.16,
  missileLaunchInterval: 22,
  boundsPadding: 24,
} as const;

export const STARS = {
  count: 100,
  minSpeed: 0.2,
  maxSpeed: 1.8,
  minSize: 0.5,
  maxSize: 2,
} as const;

export const PARTICLES = {
  maxCount: 260,
  defaultLife: 15,
  lifeVariance: 22,
  trailLife: 10,
  trailMaxLife: 20,
} as const;

export const WAVES = {
  initialTimer: 200,
  announceFrames: 120,
  bossInterval: 5,
  timerBase: 700,
  timerPerWave: 60,
  difficultyScale: 0.3,
} as const;

export const SPAWNING = {
  initialTimer: 60,
  baseInterval: 130,
  intervalDecayPerWave: 6,
  minInterval: 45,
  minShootInterval: 50,
  maxEnemiesBase: 6,
  maxEnemiesPerWave: 0.7,
  maxEnemiesCap: 13,
  bossMaxEnemies: 3,
  bossIntervalMultiplier: 2,
} as const;

export const COMBO = {
  maxMultiplier: 10,
  durationFrames: 150,
} as const;

export const SCREEN = {
  shakeDecay: 0.86,
  shakeMin: 0.5,
  damageFlashThreshold: 78,
  lowHpPulseSpeed: 0.1,
} as const;

export const POWER_UPS = {
  dropChanceBase: 0.13,
  dropChancePerWave: 0.008,
  fallSpeed: 1.2,
  size: 16,
  pulseSpeed: 0.08,
  rapidDuration: 600,
  shieldDuration: 480,
  missileDuration: 600,
} as const;

export const BOSS = {
  width: 90,
  height: 80,
  baseHp: 50,
  hpPerWave: 8,
  pointsBase: 2000,
  pointsPerWave: 500,
  enterY: 115,
  bounceXMin: 80,
  bounceXMax: CANVAS_W - 80,
  speedX: 1.1,
  rotationSpeed: 0.008,
  phaseTimer: 260,
  warningFrames: 150,
  shootTimers: [60, 90, 32] as const,
} as const;

export const ENEMY_BULLETS = {
  maxCount: 90,
  bossMaxCount: 110,
  boundsPadding: 20,
  baseSpeed: 2.1,
  bomberSpeed: 2.5,
  bomberSpread: 0.3,
  size: 5,
  bomberSize: 6,
} as const;

export const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  fire: ['Space'],
  mute: ['KeyM'],
  pause: ['Escape'],
  start: ['Enter'],
} as const;

export const UI = {
  topZoneY: 70,
  pauseButtonX: CANVAS_W - 60,
  soundButtonXMin: CANVAS_W - 115,
  soundButtonXMax: CANVAS_W - 62,
  soundIconX: CANVAS_W - 66,
  soundIconY: 51,
} as const;

export const AUDIO = {
  musicIntervalMs: 155,
} as const;

export const STORAGE_KEYS = {
  highScores: 'novaBlasterHighScores',
  muted: 'novaBlasterMuted',
} as const;
