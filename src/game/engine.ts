import type { GameData, InputState, Player, Enemy, Particle, Star, Bullet, PowerUpType, EnemyType } from './types';
import { loadSkin, recordRun } from './progress';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER,
  STARS,
  PARTICLES,
  WAVES,
  SPAWNING,
  COMBO,
  SCREEN,
  POWER_UPS,
  BOSS,
  BULLETS,
  ENEMY_BULLETS,
  STORAGE_KEYS,
} from './constants';

export { CANVAS_W, CANVAS_H };

export const COLORS = {
  bg: '#0a0908',
  player: '#ff7a1a',
  playerGlow: '#ff3d00',
  bullet: '#fff4d6',
  bulletGlow: '#ffb703',
  missile: '#ffd166',
  enemy1: '#e5484d',
  enemy2: '#8b7ff0',
  enemy3: '#d97706',
  enemy4: '#5eead4',
  kamikaze: '#ff2d20',
  boss: '#f43f5e',
  explosion: ['#ff7a1a', '#ffd166', '#fff4d6', '#e5484d', '#ff3d00'],
  shield: '#7dd3fc',
  powerSpread: '#e5484d',
  powerRapid: '#ffb703',
  powerShield: '#7dd3fc',
  powerBomb: '#ff7a1a',
  powerHealth: '#5eead4',
  powerMissile: '#ffd166',
  hud: '#ffb703',
};

export const POWERUP_COLORS: Record<PowerUpType, string> = {
  spread: COLORS.powerSpread,
  rapid: COLORS.powerRapid,
  shield: COLORS.powerShield,
  bomb: COLORS.powerBomb,
  health: COLORS.powerHealth,
  missile: COLORS.powerMissile,
};

// ---------- deterministic RNG (used by the daily challenge) ----------
let rngState = 0;
let rngSeeded = false;

/** Pass a seed for a reproducible run, or null for normal randomness. */
export function setSeed(seed: number | null) {
  if (seed === null) {
    rngSeeded = false;
    return;
  }
  rngSeeded = true;
  rngState = (seed >>> 0) || 1;
}

/** mulberry32 when seeded, Math.random otherwise. */
export function rnd(): number {
  if (!rngSeeded) return Math.random();
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---------- storage ----------

export function loadHighScores(): number[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.highScores);
    if (data) return JSON.parse(data).slice(0, 10);
  } catch { /* ignore */ }
  return [];
}

export function saveHighScores(scores: number[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.highScores, JSON.stringify(scores.slice(0, 10)));
  } catch { /* ignore */ }
}

// ---------- helpers ----------
function swapRemove<T>(arr: T[], i: number) {
  arr[i] = arr[arr.length - 1]!;
  arr.pop();
}

function rectsOverlap(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

// ---------- factories ----------
function createPlayer(): Player {
  return {
    x: PLAYER.startX,
    y: PLAYER.startY,
    width: PLAYER.width,
    height: PLAYER.height,
    speed: PLAYER.speed,
    hp: PLAYER.startHp,
    maxHp: PLAYER.maxHp,
    fireRate: PLAYER.fireRate,
    fireTimer: 0,
    spreadLevel: 0,
    rapidTimer: 0,
    shieldTimer: 0,
    missileTimer: 0,
    invincibleTimer: 0,
    tilt: 0,
  };
}

function createStars(): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STARS.count; i++) {
    stars.push({
      x: rnd() * CANVAS_W,
      y: rnd() * CANVAS_H,
      speed: STARS.minSpeed + rnd() * (STARS.maxSpeed - STARS.minSpeed),
      size: STARS.minSize + rnd() * (STARS.maxSize - STARS.minSize),
      brightness: 0.3 + rnd() * 0.7,
    });
  }
  return stars;
}

export function createGameData(): GameData {
  return {
    state: 'menu',
    mode: 'classic',
    skin: loadSkin(),
    score: 0,
    wave: 0,
    waveTimer: 0,
    waveAnnounce: 0,
    bossWarning: 0,
    bossActive: false,
    enemySpawnTimer: 0,
    difficulty: 1,
    combo: 0,
    comboTimer: 0,
    screenShake: 0,
    screenShakeAngle: 0,
    player: createPlayer(),
    bullets: [],
    enemies: [],
    enemyBullets: [],
    particles: [],
    powerUps: [],
    floatingTexts: [],
    stars: createStars(),
    stats: { kills: 0, shots: 0, hits: 0, time: 0, bestCombo: 0 },
    highScores: loadHighScores(),
    frameCount: 0,
    slowMotion: 0,
  };
}

export function resetGame(game: GameData, mode: 'classic' = 'classic') {
  setSeed(null);
  game.mode = mode;
  game.skin = loadSkin();
  // recycle live particles back into the pool
  for (const pt of game.particles) particlePool.push(pt);

  game.state = 'playing';
  game.score = 0;
  game.wave = 0;
  game.waveTimer = WAVES.initialTimer;
  game.waveAnnounce = WAVES.announceFrames;
  game.bossWarning = 0;
  game.bossActive = false;
  game.enemySpawnTimer = SPAWNING.initialTimer;
  game.difficulty = 1;
  game.combo = 0;
  game.comboTimer = 0;
  game.screenShake = 0;
  game.player = createPlayer();
  game.bullets.length = 0;
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.particles.length = 0;
  game.powerUps.length = 0;
  game.floatingTexts.length = 0;
  game.stats = { kills: 0, shots: 0, hits: 0, time: 0, bestCombo: 0 };
  game.slowMotion = 0;
}

// ---------- particle pool (avoids GC churn at 60fps) ----------
const particlePool: Particle[] = [];

function spawnParticles(game: GameData, x: number, y: number, count: number, type: Particle['type'], baseColor?: string) {
  if (game.particles.length > PARTICLES.maxCount) return;
  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const speed = type === 'explosion' ? 1 + rnd() * 4 : 0.4 + rnd() * 2.2;
    const p = particlePool.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff', type: 'spark' as Particle['type'] };
    p.x = x; p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = type === 'trail'
      ? PARTICLES.trailLife + rnd() * PARTICLES.trailLife
      : PARTICLES.defaultLife + rnd() * PARTICLES.lifeVariance;
    p.maxLife = type === 'trail' ? PARTICLES.trailMaxLife : PARTICLES.defaultLife + PARTICLES.lifeVariance;
    p.size = type === 'spark' ? 1 + rnd() * 2 : 2 + rnd() * 3.5;
    p.color = baseColor || COLORS.explosion[(rnd() * COLORS.explosion.length) | 0]!;
    p.type = type;
    game.particles.push(p);
  }
}

// ---------- player weapons ----------
function firePlayerBullets(game: GameData) {
  const p = game.player;
  const rapidDivider = 2;
  const effectiveFireRate = p.rapidTimer > 0 ? Math.max(4, p.fireRate / rapidDivider) : p.fireRate;

  if (p.fireTimer > 0) {
    p.fireTimer--;
  } else {
    p.fireTimer = effectiveFireRate;

    const bulletBase: Omit<Bullet, 'vx' | 'vy' | 'x'> = {
      y: p.y - p.height / 2,
      width: BULLETS.width,
      height: BULLETS.height,
      damage: 1,
      piercing: false,
      color: COLORS.bullet,
    };

    game.bullets.push({ ...bulletBase, x: p.x, vx: 0, vy: -BULLETS.baseSpeed });
    game.stats.shots++;

    if (p.spreadLevel >= 1) {
      const [offset, angle, speed] = [BULLETS.spreadOffsets[0], BULLETS.spreadAngles[0], BULLETS.spreadSpeeds[0]];
      game.bullets.push({ ...bulletBase, x: p.x - offset, vx: -angle, vy: -speed });
      game.bullets.push({ ...bulletBase, x: p.x + offset, vx: angle, vy: -speed });
      game.stats.shots += 2;
    }
    if (p.spreadLevel >= 2) {
      const [offset, angle, speed] = [BULLETS.spreadOffsets[1], BULLETS.spreadAngles[1], BULLETS.spreadSpeeds[1]];
      game.bullets.push({ ...bulletBase, x: p.x - offset, vx: -angle, vy: -speed });
      game.bullets.push({ ...bulletBase, x: p.x + offset, vx: angle, vy: -speed });
      game.stats.shots += 2;
    }

    spawnParticles(game, p.x, p.y - p.height / 2, 2, 'spark', COLORS.bulletGlow);
  }

  // Homing missile launcher
  if (p.missileTimer > 0 && game.frameCount % BULLETS.missileLaunchInterval === 0) {
    const side = (game.frameCount / BULLETS.missileLaunchInterval) % 2 === 0 ? -1 : 1;
    game.bullets.push({
      x: p.x + side * 16, y: p.y + 6,
      vx: side * 3, vy: -4,
      width: 6, height: 10,
      damage: 2, piercing: false,
      color: COLORS.missile, homing: true,
    });
    game.stats.shots++;
  }
}

// ---------- enemies ----------
const ENEMY_CONFIGS: Record<EnemyType, { width: number; height: number; hp: number; speed: number; shootInterval: number; points: number }> = {
  basic:    { width: 28, height: 28, hp: 2, speed: 0.9,  shootInterval: 150, points: 100 },
  fast:     { width: 22, height: 22, hp: 1, speed: 2.0,  shootInterval: 130, points: 150 },
  tank:     { width: 38, height: 38, hp: 6, speed: 0.45, shootInterval: 90,  points: 300 },
  bomber:   { width: 30, height: 30, hp: 3, speed: 0.7,  shootInterval: 70,  points: 250 },
  kamikaze: { width: 20, height: 24, hp: 1, speed: 1.0,  shootInterval: 9999, points: 200 },
  boss:     { width: 90, height: 80, hp: 60, speed: 0.9, shootInterval: 50,  points: 2500 },
};

function spawnEnemy(game: GameData) {
  const w = game.wave;
  const weights: [EnemyType, number][] = [
    ['basic', Math.max(6, 50 - w * 3)],
    ['fast', 8 + w * 2],
    ['tank', 4 + w * 1.5],
    ['bomber', Math.max(0, w - 2) * 2.5],
    ['kamikaze', Math.max(0, w - 1) * 3.5],
  ];
  const total = weights.reduce((a, b) => a + b[1], 0);
  let r = rnd() * total;
  let type: EnemyType = 'basic';
  for (const [t, weight] of weights) {
    r -= weight;
    if (r <= 0) { type = t; break; }
  }

  const cfg = ENEMY_CONFIGS[type];
  const x = cfg.width / 2 + rnd() * (CANVAS_W - cfg.width);

  game.enemies.push({
    x,
    y: -cfg.height,
    width: cfg.width,
    height: cfg.height,
    hp: cfg.hp + Math.floor(game.difficulty / 4),
    maxHp: cfg.hp + Math.floor(game.difficulty / 4),
    speed: cfg.speed + game.difficulty * 0.03,
    type,
    angle: 0,
    shootTimer: 60 + rnd() * cfg.shootInterval,
    shootInterval: Math.max(50, cfg.shootInterval - game.difficulty * 2),
    points: cfg.points,
    flash: 0,
    vx: 0,
    phase: 0,
    phaseTimer: 0,
  });
}

function spawnBoss(game: GameData) {
  // Clear the field for a clean boss arena
  for (const e of game.enemies) {
    spawnParticles(game, e.x, e.y, 8, 'explosion');
  }
  game.enemies.length = 0;
  game.enemyBullets.length = 0;

  const hp = BOSS.baseHp + game.wave * BOSS.hpPerWave;
  game.enemies.push({
    x: CANVAS_W / 2,
    y: -70,
    width: BOSS.width,
    height: BOSS.height,
    hp,
    maxHp: hp,
    speed: 0.9,
    type: 'boss',
    angle: 0,
    shootTimer: 120,
    shootInterval: 50,
    points: BOSS.pointsBase + game.wave * BOSS.pointsPerWave,
    flash: 0,
    vx: BOSS.speedX,
    phase: 0,
    phaseTimer: BOSS.phaseTimer,
  });
  game.bossActive = true;
  game.bossWarning = BOSS.warningFrames;
  game.waveAnnounce = 0;
}

function bossShoot(game: GameData, e: Enemy, px: number, py: number) {
  if (game.enemyBullets.length > ENEMY_BULLETS.bossMaxCount) return;
  const ang = Math.atan2(py - e.y, px - e.x);
  if (e.phase === 0) {
    // 5-way aimed spread
    for (let s = -2; s <= 2; s++) {
      const a = ang + s * 0.22;
      game.enemyBullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * 2.3, vy: Math.sin(a) * 2.3, size: ENEMY_BULLETS.bomberSize });
    }
  } else if (e.phase === 1) {
    // slow ring
    const n = 10;
    const off = game.frameCount * 0.04;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      game.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.7, vy: Math.sin(a) * 1.7, size: ENEMY_BULLETS.size });
    }
  } else {
    // fast aimed shot
    game.enemyBullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(ang) * 3.2, vy: Math.sin(ang) * 3.2, size: ENEMY_BULLETS.size });
  }
}

const POWER_UP_WEIGHTS: { type: PowerUpType; threshold: number }[] = [
  { type: 'spread', threshold: 0.24 },
  { type: 'rapid', threshold: 0.46 },
  { type: 'shield', threshold: 0.64 },
  { type: 'missile', threshold: 0.76 },
  { type: 'health', threshold: 0.90 },
  { type: 'bomb', threshold: 1.0 },
];

function spawnRandomPowerUp(game: GameData, x: number, y: number) {
  const roll = rnd();
  const type = POWER_UP_WEIGHTS.find((w) => roll < w.threshold)?.type ?? 'bomb';
  game.powerUps.push({ x, y, vy: POWER_UPS.fallSpeed, type, size: POWER_UPS.size, pulse: 0 });
}

function triggerBomb(game: GameData) {
  for (const e of game.enemies) {
    game.stats.kills++;
    game.score += e.points;
    spawnParticles(game, e.x, e.y, 16, 'explosion');
    game.floatingTexts.push({ x: e.x, y: e.y, text: `+${e.points}`, color: '#fff', life: 40, maxLife: 40 });
    if (e.type === 'boss') game.bossActive = false;
  }
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.screenShake = 22;
  game.slowMotion = 15;
  spawnParticles(game, CANVAS_W / 2, CANVAS_H / 2, 40, 'explosion', '#ffffff');
}

function addFloatingText(game: GameData, x: number, y: number, text: string, color: string) {
  if (game.floatingTexts.length > 20) return;
  game.floatingTexts.push({ x, y, text, color, life: 45, maxLife: 45 });
}

function killEnemy(game: GameData, i: number, e: Enemy) {
  game.stats.kills++;
  game.combo++;
  game.comboTimer = COMBO.durationFrames;
  if (game.combo > game.stats.bestCombo) game.stats.bestCombo = game.combo;
  const comboMultiplier = Math.min(game.combo, COMBO.maxMultiplier);
  const pts = e.points * comboMultiplier;
  game.score += pts;
  game.screenShake = Math.min(8, 3 + e.maxHp * 0.5);
  game.slowMotion = Math.max(game.slowMotion, e.type === 'boss' ? 30 : 3);
  spawnParticles(game, e.x, e.y, e.type === 'boss' ? 60 : 12 + e.maxHp * 2, 'explosion');
  addFloatingText(
    game, e.x, e.y,
    comboMultiplier > 1 ? `+${pts} x${comboMultiplier}` : `+${pts}`,
    comboMultiplier > 3 ? COLORS.bulletGlow : '#fff'
  );

  if (e.type === 'boss') {
    game.bossActive = false;
    game.screenShake = 30;
    spawnRandomPowerUp(game, e.x - 40, e.y);
    spawnRandomPowerUp(game, e.x, e.y + 10);
    spawnRandomPowerUp(game, e.x + 40, e.y);
  } else if (rnd() < POWER_UPS.dropChanceBase + game.wave * POWER_UPS.dropChancePerWave) {
    spawnRandomPowerUp(game, e.x, e.y);
  }

  swapRemove(game.enemies, i);
}

function damagePlayer(game: GameData) {
  const p = game.player;
  p.hp--;
  p.invincibleTimer = PLAYER.invincibleFrames;
  game.screenShake = 12;
  game.combo = 0;
  spawnParticles(game, p.x, p.y, 15, 'explosion', COLORS.player);
  if (p.hp <= 0) {
    gameOver(game);
  }
}

// ---------- main update ----------
export function updateGame(game: GameData, input: InputState, dt: number) {
  if (game.state !== 'playing') return;

  game.frameCount++;
  game.stats.time += dt / 1000;

  const timeScale = game.slowMotion > 0 ? 0.35 : 1;
  if (game.slowMotion > 0) game.slowMotion -= 1;

  const p = game.player;

  // --- PLAYER MOVEMENT ---
  let dx = 0, dy = 0;
  let usingTouch = false;

  if (input.touchActive && input.touchX !== null && input.touchY !== null) {
    // Smooth follow: ship glides toward finger with speed proportional to distance
    usingTouch = true;
    const targetX = input.touchX;
    const targetY = input.touchY - 80; // keep ship visible above the finger
    const tdx = targetX - p.x;
    const tdy = targetY - p.y;
    const dist = Math.hypot(tdx, tdy);
    if (dist > 2) {
      const sp = Math.min(dist * 0.22, p.speed * 1.9);
      dx = (tdx / dist) * sp * timeScale;
      dy = (tdy / dist) * sp * timeScale;
    }
  } else {
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    const mag = Math.hypot(dx, dy);
    if (mag > 0) {
      dx = (dx / mag) * p.speed * timeScale;
      dy = (dy / mag) * p.speed * timeScale;
    }
  }

  p.x += dx;
  p.y += dy;
  p.x = Math.max(p.width / 2, Math.min(CANVAS_W - p.width / 2, p.x));
  p.y = Math.max(p.height / 2, Math.min(CANVAS_H - p.height / 2, p.y));

  const targetTilt = Math.max(-14, Math.min(14, dx * 2.4));
  p.tilt += (targetTilt - p.tilt) * (usingTouch ? 0.15 : 0.2);

  // --- FIRING (auto-fire while touching) ---
  if (input.fire || input.touchActive || input.touchFire) {
    firePlayerBullets(game);
  } else if (p.fireTimer > 0) {
    p.fireTimer--;
  }

  if (p.rapidTimer > 0) p.rapidTimer -= timeScale;
  if (p.shieldTimer > 0) p.shieldTimer -= timeScale;
  if (p.missileTimer > 0) p.missileTimer -= timeScale;
  if (p.invincibleTimer > 0) p.invincibleTimer -= timeScale;

  if (game.frameCount % 3 === 0) {
    spawnParticles(game, p.x + (rnd() - 0.5) * 8, p.y + p.height / 2, 1, 'trail', COLORS.playerGlow);
  }

  // --- PLAYER BULLETS ---
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i]!;

    if (b.homing) {
      // steer toward nearest enemy
      let best: Enemy | null = null;
      let bd = Infinity;
      for (const e of game.enemies) {
        const d = (e.x - b.x) * (e.x - b.x) + (e.y - b.y) * (e.y - b.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const sp = 7.5;
        const cur = Math.atan2(b.vy, b.vx);
        const want = Math.atan2(best.y - b.y, best.x - b.x);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = 0.16 * timeScale;
        const na = cur + Math.max(-turn, Math.min(turn, diff));
        b.vx = Math.cos(na) * sp;
        b.vy = Math.sin(na) * sp;
      }
      if (game.frameCount % 3 === 0) {
        spawnParticles(game, b.x, b.y, 1, 'trail', COLORS.powerMissile);
      }
    }

    b.x += b.vx * timeScale;
    b.y += b.vy * timeScale;
    const pad = BULLETS.boundsPadding;
    if (b.y < -pad || b.y > CANVAS_H + pad || b.x < -pad || b.x > CANVAS_W + pad) {
      swapRemove(game.bullets, i);
    }
  }

  // --- ENEMY BULLETS ---
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const b = game.enemyBullets[i]!;
    b.x += b.vx * timeScale;
    b.y += b.vy * timeScale;
    const pad = ENEMY_BULLETS.boundsPadding;
    if (b.y > CANVAS_H + pad || b.y < -pad || b.x < -pad || b.x > CANVAS_W + pad) {
      swapRemove(game.enemyBullets, i);
      continue;
    }
    if (p.invincibleTimer <= 0 && rectsOverlap(b.x, b.y, b.size, b.size, p.x, p.y, p.width * 0.55, p.height * 0.55)) {
      swapRemove(game.enemyBullets, i);
      if (p.shieldTimer > 0) {
        spawnParticles(game, b.x, b.y, 6, 'spark', COLORS.shield);
      } else {
        damagePlayer(game);
        if (game.state !== 'playing') return;
      }
    }
  }

  // --- ENEMY SPAWNING ---
  game.enemySpawnTimer -= timeScale;
  if (game.enemySpawnTimer <= 0) {
    const base = Math.max(SPAWNING.minInterval, SPAWNING.baseInterval - game.wave * SPAWNING.intervalDecayPerWave);
    game.enemySpawnTimer = game.bossActive ? base * SPAWNING.bossIntervalMultiplier : base;
    const maxEnemies = game.bossActive
      ? SPAWNING.bossMaxEnemies
      : Math.min(SPAWNING.maxEnemiesCap, SPAWNING.maxEnemiesBase + game.wave * SPAWNING.maxEnemiesPerWave);
    if (game.enemies.length < maxEnemies) {
      spawnEnemy(game);
    }
  }

  // --- WAVE PROGRESSION ---
  game.waveTimer -= timeScale;
  if (game.waveTimer <= 0) {
    game.wave++;
    game.difficulty = 1 + game.wave * WAVES.difficultyScale;
    game.waveTimer = WAVES.timerBase + game.wave * WAVES.timerPerWave;
    if (game.wave % WAVES.bossInterval === 0) {
      spawnBoss(game);
    } else {
      game.waveAnnounce = WAVES.announceFrames;
    }
  }
  if (game.waveAnnounce > 0) game.waveAnnounce -= timeScale;
  if (game.bossWarning > 0) game.bossWarning -= timeScale;

  // --- ENEMIES ---
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i]!;
    if (e.flash > 0) e.flash -= 1;

    if (e.type === 'boss') {
      if (e.y < BOSS.enterY) {
        e.y += 0.9 * timeScale;
      } else {
        e.x += e.vx * timeScale;
        if (e.x < BOSS.bounceXMin || e.x > BOSS.bounceXMax) e.vx *= -1;
      }
      e.angle += BOSS.rotationSpeed * timeScale;
      e.phaseTimer -= timeScale;
      if (e.phaseTimer <= 0) {
        e.phase = (e.phase + 1) % 3;
        e.phaseTimer = BOSS.phaseTimer;
      }
      e.shootTimer -= timeScale;
      if (e.shootTimer <= 0 && e.y > 50) {
        e.shootTimer = BOSS.shootTimers[e.phase] ?? BOSS.shootTimers[0]!;
        bossShoot(game, e, p.x, p.y);
      }
    } else if (e.type === 'kamikaze') {
      const kamikazeDiveThreshold = 110;
      if (e.phase === 0) {
        e.y += e.speed * timeScale;
        e.flash = game.frameCount % 12 < 6 ? 1 : 0;
        if (e.y > kamikazeDiveThreshold) {
          e.phase = 1;
          const ang = Math.atan2(p.y - e.y, p.x - e.x);
          e.vx = Math.cos(ang) * 2.5;
        }
      } else {
        // dive toward the player
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        e.vx += Math.cos(ang) * 0.18 * timeScale;
        e.vx = Math.max(-3.6, Math.min(3.6, e.vx));
        e.x += e.vx * timeScale;
        e.y += (e.speed + 2.0) * timeScale;
        e.flash = game.frameCount % 8 < 4 ? 1 : 0;
      }
      e.x = Math.max(e.width / 2, Math.min(CANVAS_W - e.width / 2, e.x));
    } else {
      e.y += e.speed * timeScale;
      if (e.type === 'fast') {
        e.x += Math.sin(e.y * 0.045 + e.angle * 10) * 1.6 * timeScale;
      } else if (e.type === 'bomber') {
        e.x += Math.sin(e.y * 0.025) * 1.0 * timeScale;
      }
      e.x = Math.max(e.width / 2, Math.min(CANVAS_W - e.width / 2, e.x));
      e.angle += 0.02 * timeScale;

      e.shootTimer -= timeScale;
      if (e.shootTimer <= 0 && e.y > 20 && e.y < CANVAS_H - 140 && game.enemyBullets.length < ENEMY_BULLETS.maxCount) {
        e.shootTimer = e.shootInterval;
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const bulletSpeed = e.type === 'bomber' ? ENEMY_BULLETS.bomberSpeed : ENEMY_BULLETS.baseSpeed;
        if (e.type === 'bomber') {
          for (let s = -1; s <= 1; s++) {
            const a = angle + s * ENEMY_BULLETS.bomberSpread;
            game.enemyBullets.push({ x: e.x, y: e.y + e.height / 2, vx: Math.cos(a) * bulletSpeed, vy: Math.sin(a) * bulletSpeed, size: ENEMY_BULLETS.bomberSize });
          }
        } else {
          game.enemyBullets.push({ x: e.x, y: e.y + e.height / 2, vx: Math.cos(angle) * bulletSpeed, vy: Math.sin(angle) * bulletSpeed, size: ENEMY_BULLETS.size });
        }
      }
    }

    // Off screen
    if (e.y > CANVAS_H + 60) {
      swapRemove(game.enemies, i);
      game.combo = 0;
      continue;
    }

    // Bullet collision
    let dead = false;
    for (let j = game.bullets.length - 1; j >= 0; j--) {
      const b = game.bullets[j]!;
      if (rectsOverlap(b.x, b.y, b.width, b.height, e.x, e.y, e.width, e.height)) {
        e.hp -= b.damage;
        e.flash = 4;
        game.stats.hits++;
        if (!b.piercing) swapRemove(game.bullets, j);
        spawnParticles(game, b.x, b.y, 3, 'spark', b.homing ? COLORS.powerMissile : COLORS.bulletGlow);
        if (e.hp <= 0) {
          killEnemy(game, i, e);
          dead = true;
          break;
        }
      }
    }
    if (dead) continue;

    // Player collision
    if (p.invincibleTimer <= 0 && rectsOverlap(e.x, e.y, e.width * 0.85, e.height * 0.85, p.x, p.y, p.width * 0.7, p.height * 0.7)) {
      if (p.shieldTimer > 0) {
        if (e.type !== 'boss') {
          game.score += e.points;
          game.stats.kills++;
          spawnParticles(game, e.x, e.y, 18, 'explosion');
          swapRemove(game.enemies, i);
        }
      } else {
        if (e.type !== 'boss') {
          spawnParticles(game, e.x, e.y, 18, 'explosion');
          swapRemove(game.enemies, i);
        }
        damagePlayer(game);
        if (game.state !== 'playing') return;
      }
    }
  }

  // --- POWER UPS ---
  for (let i = game.powerUps.length - 1; i >= 0; i--) {
    const pw = game.powerUps[i]!;
    pw.y += pw.vy * timeScale;
    pw.pulse += POWER_UPS.pulseSpeed;
    if (pw.y > CANVAS_H + 30) {
      swapRemove(game.powerUps, i);
      continue;
    }
    if (rectsOverlap(pw.x, pw.y, pw.size * 2, pw.size * 2, p.x, p.y, p.width, p.height)) {
      swapRemove(game.powerUps, i);
      spawnParticles(game, pw.x, pw.y, 10, 'powerup', POWERUP_COLORS[pw.type]);
      switch (pw.type) {
        case 'spread':
          p.spreadLevel = Math.min(2, p.spreadLevel + 1);
          addFloatingText(game, p.x, p.y - 30, 'SPREAD SHOT', POWERUP_COLORS.spread);
          break;
        case 'rapid':
          p.rapidTimer = POWER_UPS.rapidDuration;
          addFloatingText(game, p.x, p.y - 30, 'RAPID FIRE', POWERUP_COLORS.rapid);
          break;
        case 'shield':
          p.shieldTimer = POWER_UPS.shieldDuration;
          addFloatingText(game, p.x, p.y - 30, 'SHIELD', POWERUP_COLORS.shield);
          break;
        case 'missile':
          p.missileTimer = POWER_UPS.missileDuration;
          addFloatingText(game, p.x, p.y - 30, 'HOMING MISSILES', POWERUP_COLORS.missile);
          break;
        case 'health':
          p.hp = Math.min(p.maxHp, p.hp + 1);
          addFloatingText(game, p.x, p.y - 30, '+1 HP', POWERUP_COLORS.health);
          break;
        case 'bomb':
          triggerBomb(game);
          break;
      }
    }
  }

  // --- COMBO TIMER ---
  if (game.comboTimer > 0) {
    game.comboTimer -= timeScale;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  // --- FLOATING TEXTS ---
  for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = game.floatingTexts[i]!;
    ft.y -= 1.1 * timeScale;
    ft.life -= timeScale;
    if (ft.life <= 0) swapRemove(game.floatingTexts, i);
  }

  // --- PARTICLES ---
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pt = game.particles[i]!;
    pt.x += pt.vx * timeScale;
    pt.y += pt.vy * timeScale;
    pt.life -= timeScale;
    pt.vx *= 0.97;
    pt.vy *= 0.97;
    if (pt.life <= 0) {
      particlePool.push(pt);
      swapRemove(game.particles, i);
    }
  }

  // --- STARS ---
  for (const s of game.stars) {
    s.y += s.speed * timeScale;
    if (s.y > CANVAS_H) {
      s.y = -5;
      s.x = rnd() * CANVAS_W;
    }
  }

  // --- SCREEN SHAKE DECAY ---
  if (game.screenShake > 0) {
    game.screenShake *= SCREEN.shakeDecay;
    game.screenShakeAngle = rnd() * Math.PI * 2;
    if (game.screenShake < SCREEN.shakeMin) game.screenShake = 0;
  }
}

function gameOver(game: GameData) {
  game.state = 'gameover';
  game.screenShake = 25;
  game.slowMotion = 0;
  spawnParticles(game, game.player.x, game.player.y, 45, 'explosion');

  recordRun({ score: game.score, wave: game.wave + 1, kills: game.stats.kills, time: game.stats.time });

  game.highScores.push(Math.round(game.score));
  game.highScores.sort((a, b) => b - a);
  game.highScores = game.highScores.slice(0, 10);
  saveHighScores(game.highScores);
}
