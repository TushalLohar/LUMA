export type EntityId = number;

export interface Vec2 {
  x: number;
  y: number;
}

export type GameTheme = "spiderman" | "ironman" | "thor";

export type GameState = "menu" | "playing" | "paused" | "gameover";
export type EnemyType =
  | "basic"
  | "fast"
  | "tank"
  | "bomber"
  | "kamikaze"
  | "boss";

export type EnemyPattern =
  | "straight"
  | "sine"
  | "zigzag"
  | "chase"
  | "orbit"
  | "boss";

export type ParticleType = "explosion" | "trail" | "spark" | "powerup";
export type PowerUpType =
  | "spread"
  | "rapid"
  | "shield"
  | "bomb"
  | "health"
  | "missile"
  | "laser"
  | "magnet"
  | "scoreMultiplier";

export type BulletOwner = "player" | "enemy";
export type GameEventType =
  | "shoot"
  | "enemyDestroyed"
  | "playerHit"
  | "powerUpCollected"
  | "bossIncoming"
  | "gameOver";

export interface Particle extends Vec2 {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
}

export interface Bullet extends Vec2 {
  id: EntityId;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  color: string;
  owner: BulletOwner;
  piercing: boolean;
  homing: boolean;
  lifetime: number;
  maxLifetime: number;
  radius?: number;
}

export interface EnemyBullet extends Vec2 {
  vx: number;
  vy: number;
  size: number;
}

export interface Enemy extends Vec2 {
  id: EntityId;
  type: EnemyType;
  pattern: EnemyPattern;

  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  points: number;

  angle: number;
  vx: number;
  vy: number;
  flashTimer: number;
  flash: number;

  shootTimer: number;
  shootInterval: number;

  phase: number;
  phaseTimer: number;
  spawnTimer: number;
}

export interface PowerUp extends Vec2 {
  id: EntityId;
  vy: number;
  type: PowerUpType;
  size: number;
  pulse: number;
  lifetime: number;
}

export interface Player extends Vec2 {
  width: number;
  height: number;
  speed: number;

  hp: number;
  maxHp: number;
  invincibleTimer: number;
  tilt: number;

  fireRate: number;
  fireTimer: number;
  damageMultiplier: number;

  spreadLevel: number;
  spreadTimer: number;
  rapidTimer: number;
  shieldTimer: number;
  missileTimer: number;
  laserTimer: number;
  magnetTimer: number;
  scoreMultiplierTimer: number;
}

export interface Star extends Vec2 {
  speed: number;
  size: number;
  brightness: number;
  layer: 0 | 1 | 2;
}

export interface FloatingText extends Vec2 {
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export interface Stats {
  kills: number;
  shots: number;
  hits: number;
  time: number;
  bestCombo: number;
  bossesDefeated: number;
  powerUpsCollected: number;
  damageTaken: number;
}

export interface GameEvent {
  type: GameEventType;
  x?: number;
  y?: number;
  value?: number;
}

export interface RunModifiers {
  scoreMultiplier: number;
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  dropRateMultiplier: number;
}

export interface GameData {
  theme: GameTheme;
  state: GameState;

  score: number;
  highScores: number[];
  wave: number;
  difficulty: number;

  waveTimer: number;
  waveAnnounceTimer: number;
  waveAnnounce: number;
  bossWarningTimer: number;
  bossWarning: number;
  enemySpawnTimer: number;
  bossActive: boolean;

  combo: number;
  comboTimer: number;
  slowMotionTimer: number;
  slowMotion: number;
  screenShake: number;
  screenShakeAngle: number;

  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  enemyBullets: EnemyBullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  stars: Star[];
  floatingTexts: FloatingText[];

  stats: Stats;
  modifiers: RunModifiers;
  events: GameEvent[];

  nextEntityId: EntityId;
  frameCount: number;
  elapsedTime: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  pause: boolean;

  touchX: number | null;
  touchY: number | null;
  touchActive: boolean;
  touchFire: boolean;
}
