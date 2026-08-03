export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'trail' | 'spark' | 'powerup';
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  piercing: boolean;
  color: string;
  homing?: boolean;
}

export type EnemyType = 'basic' | 'fast' | 'tank' | 'bomber' | 'kamikaze' | 'boss';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: EnemyType;
  angle: number;
  shootTimer: number;
  shootInterval: number;
  points: number;
  flash: number;
  vx: number;
  phase: number;
  phaseTimer: number;
}

export interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export type PowerUpType = 'spread' | 'rapid' | 'shield' | 'bomb' | 'health' | 'missile';

export interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  size: number;
  pulse: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  hp: number;
  maxHp: number;
  fireRate: number;
  fireTimer: number;
  spreadLevel: number;
  rapidTimer: number;
  shieldTimer: number;
  missileTimer: number;
  invincibleTimer: number;
  tilt: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Stats {
  kills: number;
  shots: number;
  hits: number;
  time: number;
  bestCombo: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export interface GameData {
  state: GameState;
  score: number;
  wave: number;
  waveTimer: number;
  waveAnnounce: number;
  bossWarning: number;
  bossActive: boolean;
  enemySpawnTimer: number;
  difficulty: number;
  combo: number;
  comboTimer: number;
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
  highScores: number[];
  frameCount: number;
  slowMotion: number;
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
