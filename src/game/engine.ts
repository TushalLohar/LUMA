import type {
  Bullet,
  Enemy,
  EnemyBullet,
  EnemyType,
  FloatingText,
  GameData,
  GameTheme,
  InputState,
  Particle,
  Player,
  PowerUp,
  PowerUpType,
  Star,
} from "./types";

export const CANVAS_W = 480;
export const CANVAS_H = 720;
export const LOGIC_HZ = 120;

export interface ThemeColors {
  name: string;
  subtitle: string;
  bg: string;
  bgGradTop: string;
  bgGradBottom: string;
  player: string;
  playerGlow: string;
  bullet: string;
  bulletGlow: string;
  missile: string;
  shield: string;
  hud: string;
  enemies: { basic: string; fast: string; tank: string; bomber: string; kamikaze: string; boss: string };
  explosion: string[];
}

export const THEME_CONFIGS: Record<GameTheme, ThemeColors> = {
  spiderman: {
    name: "SPIDER-MAN",
    subtitle: "WEB-SLINGER SUIT",
    bg: "#080312",
    bgGradTop: "#180628",
    bgGradBottom: "#04010a",
    player: "#ff2a55",
    playerGlow: "#00f0ff",
    bullet: "#ffffff",
    bulletGlow: "#00f0ff",
    missile: "#ff2a55",
    shield: "#00f0ff",
    hud: "#ff2a55",
    enemies: { basic: "#a855f7", fast: "#00f0ff", tank: "#34d399", bomber: "#fbbf24", kamikaze: "#ff2a55", boss: "#c084fc" },
    explosion: ["#ff2a55", "#00f0ff", "#ffffff", "#fbbf24", "#a855f7"],
  },
  ironman: {
    name: "IRON MAN",
    subtitle: "MARK 85 ARC REACTOR",
    bg: "#100308",
    bgGradTop: "#240612",
    bgGradBottom: "#060104",
    player: "#ffcc00",
    playerGlow: "#ff1e42",
    bullet: "#e0f2fe",
    bulletGlow: "#00e5ff",
    missile: "#ff6b00",
    shield: "#00e5ff",
    hud: "#ffcc00",
    enemies: { basic: "#38bdf8", fast: "#00e5ff", tank: "#e879f9", bomber: "#ff6b00", kamikaze: "#ff1e42", boss: "#f43f5e" },
    explosion: ["#ffcc00", "#ff1e42", "#00e5ff", "#ffffff", "#ff6b00"],
  },
  thor: {
    name: "STORM LORD",
    subtitle: "COMMAND THE STORM. RULE THE SKY.",
    bg: "#02060f",
    bgGradTop: "#0f2c52",
    bgGradBottom: "#02060f",
    player: "#3FA9FF",
    playerGlow: "#69F0FF",
    bullet: "#FFFFFF",
    bulletGlow: "#69F0FF",
    missile: "#F6C343",
    shield: "#69F0FF",
    hud: "#3FA9FF",
    enemies: { basic: "#3FA9FF", fast: "#69F0FF", tank: "#D8E5F0", bomber: "#8AA6C4", kamikaze: "#F6C343", boss: "#FFFFFF" },
    explosion: ["#69F0FF", "#3FA9FF", "#FFFFFF", "#F6C343", "#D8E5F0"],
  },

};

export function getThemeColors(theme: GameTheme = "spiderman"): ThemeColors {
  return THEME_CONFIGS[theme] ?? THEME_CONFIGS.spiderman;
}

export const COLORS = THEME_CONFIGS.spiderman;

export const POWERUP_COLORS: Record<PowerUpType, string> = {
  spread: "#ff8fa3",
  rapid: "#ffd166",
  shield: "#7dd3fc",
  bomb: "#ff7a18",
  health: "#a3e635",
  missile: "#ff5f6d",
  laser: "#a855f7",
  magnet: "#eab308",
  scoreMultiplier: "#ec4899",
};

const MAX_PARTICLES = 260;
const MAX_ENEMY_BULLETS = 110;
const POWERUP_DURATION = 8 * LOGIC_HZ;
const PARTICLE_POOL: Particle[] = [];

const ENEMY_CONFIG: Record<
  EnemyType,
  {
    width: number;
    height: number;
    hp: number;
    speed: number;
    shootInterval: number;
    points: number;
  }
> = {
  basic: { width: 28, height: 28, hp: 2, speed: 0.9, shootInterval: 150, points: 100 },
  fast: { width: 22, height: 22, hp: 1, speed: 2, shootInterval: 130, points: 150 },
  tank: { width: 38, height: 38, hp: 6, speed: 0.45, shootInterval: 90, points: 300 },
  bomber: { width: 30, height: 30, hp: 3, speed: 0.7, shootInterval: 70, points: 250 },
  kamikaze: { width: 20, height: 24, hp: 1, speed: 1, shootInterval: 9999, points: 200 },
  boss: { width: 90, height: 80, hp: 60, speed: 0.9, shootInterval: 50, points: 2500 },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function swapRemove<T>(array: T[], index: number) {
  const last = array.length - 1;
  if (index !== last) array[index] = array[last]!;
  array.pop();
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return Math.abs(ax - bx) < (aw + bw) * 0.5 &&
    Math.abs(ay - by) < (ah + bh) * 0.5;
}

function randomChoice<T>(values: readonly T[]): T {
  return values[(Math.random() * values.length) | 0]!;
}

export function loadHighScores(): number[] {
  try {
    const saved = localStorage.getItem("novaBlasterHighScores");
    const scores = saved ? JSON.parse(saved) : [];
    return Array.isArray(scores)
      ? scores.filter(Number.isFinite).sort((a, b) => b - a).slice(0, 10)
      : [];
  } catch {
    return [];
  }
}

function saveHighScores(scores: number[]) {
  try {
    localStorage.setItem(
      "novaBlasterHighScores",
      JSON.stringify(scores.slice(0, 10)),
    );
  } catch {
    // Storage is optional.
  }
}

function createPlayer(): Player {
  return {
    x: CANVAS_W / 2,
    y: CANVAS_H - 100,
    width: 32,
    height: 36,
    speed: 5,
    hp: 5,
    maxHp: 5,
    fireRate: 9,
    fireTimer: 0,
    damageMultiplier: 1,
    spreadLevel: 0,
    spreadTimer: 0,
    rapidTimer: 0,
    shieldTimer: 0,
    missileTimer: 0,
    laserTimer: 0,
    magnetTimer: 0,
    scoreMultiplierTimer: 0,
    invincibleTimer: 0,
    tilt: 0,
  };
}

function createStars(): Star[] {
  return Array.from({ length: 100 }, (_, i) => ({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    speed: 0.2 + Math.random() * 1.8,
    size: 0.5 + Math.random() * 2,
    brightness: 0.3 + Math.random() * 0.7,
    layer: (i % 3) as 0 | 1 | 2,
  }));
}

export function loadSavedTheme(): GameTheme {
  try {
    const saved = localStorage.getItem("lumaGameTheme");
    if (saved === "spiderman" || saved === "ironman" || saved === "thor") return saved;
  } catch { /* ignore */ }
  return "spiderman";
}

export function saveTheme(theme: GameTheme) {
  try {
    localStorage.setItem("lumaGameTheme", theme);
  } catch { /* ignore */ }
}

export function createGameData(): GameData {
  return {
    theme: loadSavedTheme(),
    state: "menu",
    score: 0,
    highScores: loadHighScores(),
    wave: 0,
    difficulty: 1,
    waveTimer: 0,
    waveAnnounceTimer: 0,
    waveAnnounce: 0,
    bossWarningTimer: 0,
    bossWarning: 0,
    bossActive: false,
    enemySpawnTimer: 0,
    combo: 0,
    comboTimer: 0,
    slowMotionTimer: 0,
    slowMotion: 0,
    screenShake: 0,
    screenShakeAngle: 0,
    player: createPlayer(),
    bullets: [],
    enemies: [],
    enemyBullets: [],
    particles: [],
    powerUps: [],
    stars: createStars(),
    floatingTexts: [],
    stats: { kills: 0, shots: 0, hits: 0, time: 0, bestCombo: 0, bossesDefeated: 0, powerUpsCollected: 0, damageTaken: 0 },
    modifiers: { scoreMultiplier: 1, enemySpeedMultiplier: 1, enemyHealthMultiplier: 1, dropRateMultiplier: 1 },
    events: [],
    nextEntityId: 1,
    frameCount: 0,
    elapsedTime: 0,
  };
}

export function resetGame(game: GameData) {
  for (const particle of game.particles) PARTICLE_POOL.push(particle);

  game.state = "playing";
  game.score = 0;
  game.wave = 0;
  game.waveTimer = 180;
  game.waveAnnounceTimer = 100;
  game.waveAnnounce = 100;
  game.bossWarningTimer = 0;
  game.bossWarning = 0;
  game.bossActive = false;
  game.enemySpawnTimer = 45;
  game.difficulty = 1;
  game.combo = 0;
  game.comboTimer = 0;
  game.screenShake = 0;
  game.slowMotionTimer = 0;
  game.slowMotion = 0;
  game.player = createPlayer();

  game.bullets.length = 0;
  game.enemies.length = 0;
  game.enemyBullets.length = 0;
  game.particles.length = 0;
  game.powerUps.length = 0;
  game.floatingTexts.length = 0;
  game.events.length = 0;
  game.stats = { kills: 0, shots: 0, hits: 0, time: 0, bestCombo: 0, bossesDefeated: 0, powerUpsCollected: 0, damageTaken: 0 };
}

function spawnParticles(
  game: GameData,
  x: number,
  y: number,
  count: number,
  type: Particle["type"],
  color?: string,
) {
  const available = MAX_PARTICLES - game.particles.length;
  const amount = Math.min(count, Math.max(0, available));

  for (let index = 0; index < amount; index++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = type === "explosion"
      ? 1 + Math.random() * 4
      : 0.4 + Math.random() * 2.2;

    const particle = PARTICLE_POOL.pop() ?? {
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0,
      size: 0, color: "#fff", type: "spark" as const,
    };

    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.life = type === "trail" ? 12 + Math.random() * 8 : 16 + Math.random() * 20;
    particle.maxLife = particle.life;
    particle.size = type === "spark" ? 1 + Math.random() * 2 : 2 + Math.random() * 3.5;
    particle.color = color ?? randomChoice(COLORS.explosion);
    particle.type = type;
    game.particles.push(particle);
  }
}

function addText(
  game: GameData,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  if (game.floatingTexts.length >= 20) return;

  const floatingText: FloatingText = {
    x, y, text, color, life: 45, maxLife: 45,
  };
  game.floatingTexts.push(floatingText);
}

function spawnPlayerBullet(
  game: GameData,
  player: Player,
  x: number,
  vx: number,
  vy: number,
) {
  const bullet: Bullet = {
    id: game.nextEntityId++,
    x,
    y: player.y - player.height / 2,
    vx,
    vy,
    width: 4,
    height: 14,
    damage: 1 * player.damageMultiplier,
    owner: "player",
    piercing: false,
    homing: false,
    color: COLORS.bullet,
    lifetime: 0,
    maxLifetime: 180,
  };

  game.bullets.push(bullet);
  game.stats.shots++;
}

function firePlayerWeapon(game: GameData) {
  const player = game.player;
  const fireRate = player.rapidTimer > 0
    ? Math.max(4, Math.floor(player.fireRate / 2))
    : player.fireRate;

  if (player.fireTimer > 0) {
    player.fireTimer--;
    return;
  }

  player.fireTimer = fireRate;
  spawnPlayerBullet(game, player, player.x, 0, -11);

  if (player.spreadLevel >= 1) {
    spawnPlayerBullet(game, player, player.x - 10, -1.6, -10.5);
    spawnPlayerBullet(game, player, player.x + 10, 1.6, -10.5);
  }

  if (player.spreadLevel >= 2) {
    spawnPlayerBullet(game, player, player.x - 18, -3.2, -10);
    spawnPlayerBullet(game, player, player.x + 18, 3.2, -10);
  }

  spawnParticles(
    game,
    player.x,
    player.y - player.height / 2,
    2,
    "spark",
    COLORS.bulletGlow,
  );
}

function fireMissile(game: GameData) {
  const player = game.player;
  if (player.missileTimer <= 0 || game.frameCount % 20 !== 0) return;

  const side = (game.frameCount / 20) % 2 === 0 ? -1 : 1;
  game.bullets.push({
    id: game.nextEntityId++,
    x: player.x + side * 16,
    y: player.y,
    vx: side * 3,
    vy: -4,
    width: 7,
    height: 12,
    damage: 2 * player.damageMultiplier,
    owner: "player",
    piercing: false,
    color: COLORS.missile,
    homing: true,
    lifetime: 0,
    maxLifetime: 240,
  });
  game.stats.shots++;
}

function pickEnemyType(wave: number): EnemyType {
  const roll = Math.random() * 100;

  if (wave >= 4 && roll < 8 + wave * 1.5) return "kamikaze";
  if (wave >= 3 && roll < 20 + wave * 2) return "bomber";
  if (roll < 32 + wave * 2) return "tank";
  if (roll < 58 + wave * 3) return "fast";
  return "basic";
}

function spawnEnemy(game: GameData) {
  const type = pickEnemyType(game.wave);
  const config = ENEMY_CONFIG[type];
  const hp = config.hp + Math.floor(game.difficulty / 4);

  const enemy: Enemy = {
    id: game.nextEntityId++,
    x: config.width / 2 + Math.random() * (CANVAS_W - config.width),
    y: -config.height,
    width: config.width,
    height: config.height,
    hp,
    maxHp: hp,
    speed: config.speed + game.difficulty * 0.035,
    type,
    pattern: type === "fast" ? "zigzag" : type === "kamikaze" ? "chase" : "straight",
    angle: Math.random() * Math.PI * 2,
    shootTimer: 45 + Math.random() * config.shootInterval,
    shootInterval: Math.max(45, config.shootInterval - game.wave * 2),
    points: config.points,
    flashTimer: 0,
    flash: 0,
    vx: 0,
    vy: config.speed,
    phase: 0,
    phaseTimer: 0,
    spawnTimer: 0,
  };

  game.enemies.push(enemy);
}

function spawnBoss(game: GameData) {
  game.enemyBullets.length = 0;

  for (const enemy of game.enemies) {
    spawnParticles(game, enemy.x, enemy.y, 6, "explosion");
  }
  game.enemies.length = 0;

  const hp = 55 + game.wave * 8;
  game.enemies.push({
    id: game.nextEntityId++,
    x: CANVAS_W / 2,
    y: -70,
    width: 90,
    height: 80,
    hp,
    maxHp: hp,
    speed: 0.9,
    type: "boss",
    pattern: "boss",
    angle: 0,
    shootTimer: 120,
    shootInterval: 50,
    points: 2200 + game.wave * 500,
    flashTimer: 0,
    flash: 0,
    vx: 1.1,
    vy: 0,
    phase: 0,
    phaseTimer: 240,
    spawnTimer: 0,
  });

  game.bossActive = true;
  game.bossWarningTimer = 150;
  game.bossWarning = 150;
  game.waveAnnounceTimer = 0;
  game.waveAnnounce = 0;
}

function addEnemyBullet(
  game: GameData,
  x: number,
  y: number,
  angle: number,
  speed: number,
  size = 5,
) {
  if (game.enemyBullets.length >= MAX_ENEMY_BULLETS) return;

  const bullet: EnemyBullet = {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
  };
  game.enemyBullets.push(bullet);
}

function enemyShoot(game: GameData, enemy: Enemy, player: Player) {
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);

  if (enemy.type === "boss") {
    if (enemy.phase === 0) {
      for (let index = -2; index <= 2; index++) {
        addEnemyBullet(game, enemy.x, enemy.y + 25, aim + index * 0.2, 2.4, 6);
      }
    } else if (enemy.phase === 1) {
      for (let index = 0; index < 10; index++) {
        addEnemyBullet(
          game,
          enemy.x,
          enemy.y,
          (index / 10) * Math.PI * 2 + game.frameCount * 0.04,
          1.7,
        );
      }
    } else {
      addEnemyBullet(game, enemy.x, enemy.y + 30, aim, 3.3, 6);
    }
    return;
  }

  if (enemy.type === "bomber") {
    for (let index = -1; index <= 1; index++) {
      addEnemyBullet(game, enemy.x, enemy.y + enemy.height / 2, aim + index * 0.28, 2.5, 6);
    }
    return;
  }

  addEnemyBullet(game, enemy.x, enemy.y + enemy.height / 2, aim, 2.15);
}

function spawnPowerUp(game: GameData, x: number, y: number) {
  const roll = Math.random();
  const type: PowerUpType =
    roll < 0.24 ? "spread" :
    roll < 0.46 ? "rapid" :
    roll < 0.64 ? "shield" :
    roll < 0.78 ? "missile" :
    roll < 0.91 ? "health" :
    "bomb";

  const powerUp: PowerUp = { id: game.nextEntityId++, x, y, vy: 1.2, type, size: 16, pulse: 0, lifetime: 0 };
  game.powerUps.push(powerUp);
}

function killEnemy(game: GameData, enemyIndex: number, enemy: Enemy) {
  game.stats.kills++;
  game.combo++;
  game.comboTimer = 150;
  game.stats.bestCombo = Math.max(game.stats.bestCombo, game.combo);

  const multiplier = Math.min(game.combo, 10);
  const points = enemy.points * multiplier;
  game.score += points;

  game.screenShake = enemy.type === "boss"
    ? 28
    : Math.min(8, 3 + enemy.maxHp * 0.5);

  if (enemy.type === "boss") {
    game.slowMotionTimer = 30;
    game.slowMotion = 30;
  }

  spawnParticles(
    game,
    enemy.x,
    enemy.y,
    enemy.type === "boss" ? 60 : 12 + enemy.maxHp * 2,
    "explosion",
  );

  addText(
    game,
    enemy.x,
    enemy.y,
    multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`,
    multiplier > 3 ? COLORS.bulletGlow : "#fff",
  );

  if (enemy.type === "boss") {
    game.bossActive = false;
    game.stats.bossesDefeated++;
    spawnPowerUp(game, enemy.x - 38, enemy.y);
    spawnPowerUp(game, enemy.x, enemy.y + 10);
    spawnPowerUp(game, enemy.x + 38, enemy.y);
  } else if (Math.random() < Math.min(0.28, 0.12 + game.wave * 0.008)) {
    spawnPowerUp(game, enemy.x, enemy.y);
  }

  swapRemove(game.enemies, enemyIndex);
}

function damagePlayer(game: GameData) {
  const player = game.player;
  if (player.invincibleTimer > 0) return;

  player.hp--;
  game.stats.damageTaken++;
  player.invincibleTimer = 90;
  game.combo = 0;
  game.screenShake = 12;
  spawnParticles(game, player.x, player.y, 18, "explosion", COLORS.player);

  if (player.hp <= 0) {
    gameOver(game);
  }
}

function gameOver(game: GameData) {
  game.state = "gameover";
  game.slowMotionTimer = 0;
  game.slowMotion = 0;
  game.screenShake = 25;

  spawnParticles(game, game.player.x, game.player.y, 45, "explosion");

  if (game.score > 0) {
    game.highScores.push(Math.round(game.score));
    game.highScores.sort((a, b) => b - a);
    game.highScores.length = Math.min(game.highScores.length, 10);
    saveHighScores(game.highScores);
  }
}

function updatePlayer(game: GameData, input: InputState, timeScale: number) {
  const player = game.player;
  let dx = 0;
  let dy = 0;

  if (input.touchActive && input.touchX !== null && input.touchY !== null) {
    const targetX = input.touchX;
    const targetY = input.touchY - 80;
    const distanceX = targetX - player.x;
    const distanceY = targetY - player.y;
    const distance = Math.hypot(distanceX, distanceY);

    if (distance > 2) {
      const speed = Math.min(distance * 0.22, player.speed * 1.9);
      dx = (distanceX / distance) * speed * timeScale;
      dy = (distanceY / distance) * speed * timeScale;
    }
  } else {
    dx = Number(input.right) - Number(input.left);
    dy = Number(input.down) - Number(input.up);

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx = (dx / length) * player.speed * timeScale;
      dy = (dy / length) * player.speed * timeScale;
    }
  }

  player.x = clamp(
    player.x + dx,
    player.width / 2,
    CANVAS_W - player.width / 2,
  );
  player.y = clamp(
    player.y + dy,
    player.height / 2,
    CANVAS_H - player.height / 2,
  );

  player.tilt += (clamp(dx * 2.4, -14, 14) - player.tilt) * 0.2;

  if (input.fire || input.touchActive || input.touchFire) {
    firePlayerWeapon(game);
    fireMissile(game);
  } else if (player.fireTimer > 0) {
    player.fireTimer--;
  }

  player.spreadTimer = Math.max(0, player.spreadTimer - timeScale);
  player.rapidTimer = Math.max(0, player.rapidTimer - timeScale);
  player.shieldTimer = Math.max(0, player.shieldTimer - timeScale);
  player.missileTimer = Math.max(0, player.missileTimer - timeScale);
  player.laserTimer = Math.max(0, player.laserTimer - timeScale);
  player.magnetTimer = Math.max(0, player.magnetTimer - timeScale);
  player.scoreMultiplierTimer = Math.max(0, player.scoreMultiplierTimer - timeScale);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - timeScale);

  if (player.spreadTimer === 0) player.spreadLevel = 0;

  if (game.frameCount % 3 === 0) {
    spawnParticles(
      game,
      player.x + (Math.random() - 0.5) * 8,
      player.y + player.height / 2,
      1,
      "trail",
      COLORS.playerGlow,
    );
  }
}

function updateBullets(game: GameData, timeScale: number) {
  for (let index = game.bullets.length - 1; index >= 0; index--) {
    const bullet = game.bullets[index]!;

    if (bullet.homing && game.enemies.length > 0) {
      let target = game.enemies[0]!;
      let closestDistance = Infinity;

      for (const enemy of game.enemies) {
        const dx = enemy.x - bullet.x;
        const dy = enemy.y - bullet.y;
        const distance = dx * dx + dy * dy;

        if (distance < closestDistance) {
          closestDistance = distance;
          target = enemy;
        }
      }

      const currentAngle = Math.atan2(bullet.vy, bullet.vx);
      const targetAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
      let angleDifference = targetAngle - currentAngle;

      while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
      while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;

      const angle = currentAngle + clamp(angleDifference, -0.16, 0.16);
      bullet.vx = Math.cos(angle) * 7.5;
      bullet.vy = Math.sin(angle) * 7.5;
    }

    bullet.x += bullet.vx * timeScale;
    bullet.y += bullet.vy * timeScale;

    if (
      bullet.y < -30 ||
      bullet.y > CANVAS_H + 30 ||
      bullet.x < -30 ||
      bullet.x > CANVAS_W + 30
    ) {
      swapRemove(game.bullets, index);
    }
  }

  for (let index = game.enemyBullets.length - 1; index >= 0; index--) {
    const bullet = game.enemyBullets[index]!;
    bullet.x += bullet.vx * timeScale;
    bullet.y += bullet.vy * timeScale;

    if (
      bullet.y < -24 ||
      bullet.y > CANVAS_H + 24 ||
      bullet.x < -24 ||
      bullet.x > CANVAS_W + 24
    ) {
      swapRemove(game.enemyBullets, index);
      continue;
    }

    const player = game.player;
    if (
      player.invincibleTimer === 0 &&
      overlaps(
        bullet.x, bullet.y, bullet.size, bullet.size,
        player.x, player.y, player.width * 0.55, player.height * 0.55,
      )
    ) {
      swapRemove(game.enemyBullets, index);

      if (player.shieldTimer > 0) {
        spawnParticles(game, bullet.x, bullet.y, 6, "spark", COLORS.shield);
      } else {
        damagePlayer(game);
      }
    }
  }
}

function updateEnemies(game: GameData, timeScale: number) {
  const player = game.player;

  for (let index = game.enemies.length - 1; index >= 0; index--) {
    const enemy = game.enemies[index]!;
    enemy.flashTimer = Math.max(0, enemy.flashTimer - timeScale);
    enemy.flash = enemy.flashTimer;

    if (enemy.type === "boss") {
      if (enemy.y < 115) {
        enemy.y += enemy.speed * timeScale;
      } else {
        enemy.x += enemy.vx * timeScale;
        if (enemy.x < 75 || enemy.x > CANVAS_W - 75) enemy.vx *= -1;
      }

      enemy.angle += 0.008 * timeScale;
      enemy.phaseTimer -= timeScale;

      if (enemy.phaseTimer <= 0) {
        enemy.phase = (enemy.phase + 1) % 3;
        enemy.phaseTimer = 240;
      }
    } else if (enemy.type === "kamikaze") {
      if (enemy.phase === 0) {
        enemy.y += enemy.speed * timeScale;
        if (enemy.y > 110) enemy.phase = 1;
      } else {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.vx = clamp(
          enemy.vx + Math.cos(angle) * 0.16 * timeScale,
          -3.5,
          3.5,
        );
        enemy.x += enemy.vx * timeScale;
        enemy.y += (enemy.speed + 2) * timeScale;
      }
    } else {
      enemy.y += enemy.speed * timeScale;
      enemy.angle += 0.02 * timeScale;

      if (enemy.type === "fast") {
        enemy.x += Math.sin(enemy.y * 0.045 + enemy.angle * 10) * 1.6 * timeScale;
      }

      if (enemy.type === "bomber") {
        enemy.x += Math.sin(enemy.y * 0.025) * timeScale;
      }
    }

    enemy.x = clamp(
      enemy.x,
      enemy.width / 2,
      CANVAS_W - enemy.width / 2,
    );

    enemy.shootTimer -= timeScale;
    if (
      enemy.shootTimer <= 0 &&
      enemy.y > 20 &&
      enemy.y < CANVAS_H - 130
    ) {
      enemy.shootTimer = enemy.type === "boss"
        ? enemy.phase === 0 ? 60 : enemy.phase === 1 ? 90 : 30
        : enemy.shootInterval;

      enemyShoot(game, enemy, player);
    }

    if (enemy.y > CANVAS_H + 70) {
      swapRemove(game.enemies, index);
      game.combo = 0;
      continue;
    }

    let destroyed = false;

    for (let bulletIndex = game.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      const bullet = game.bullets[bulletIndex]!;

      if (!overlaps(
        bullet.x, bullet.y, bullet.width, bullet.height,
        enemy.x, enemy.y, enemy.width, enemy.height,
      )) continue;

      enemy.hp -= bullet.damage;
      enemy.flashTimer = 4;
      enemy.flash = 4;
      game.stats.hits++;
      spawnParticles(
        game,
        bullet.x,
        bullet.y,
        3,
        "spark",
        bullet.homing ? COLORS.missile : COLORS.bulletGlow,
      );

      if (!bullet.piercing) swapRemove(game.bullets, bulletIndex);

      if (enemy.hp <= 0) {
        killEnemy(game, index, enemy);
        destroyed = true;
        break;
      }
    }

    if (destroyed) continue;

    if (
      player.invincibleTimer === 0 &&
      overlaps(
        enemy.x, enemy.y, enemy.width * 0.8, enemy.height * 0.8,
        player.x, player.y, player.width * 0.7, player.height * 0.7,
      )
    ) {
      if (player.shieldTimer > 0 && enemy.type !== "boss") {
        game.score += enemy.points;
        game.stats.kills++;
        spawnParticles(game, enemy.x, enemy.y, 18, "explosion");
        swapRemove(game.enemies, index);
      } else if (player.shieldTimer === 0) {
        if (enemy.type !== "boss") {
          spawnParticles(game, enemy.x, enemy.y, 18, "explosion");
          swapRemove(game.enemies, index);
        }
        damagePlayer(game);
      }
    }
  }
}

function updatePowerUps(game: GameData, timeScale: number) {
  const player = game.player;

  for (let index = game.powerUps.length - 1; index >= 0; index--) {
    const powerUp = game.powerUps[index]!;
    powerUp.y += powerUp.vy * timeScale;
    powerUp.pulse += 0.08 * timeScale;

    if (powerUp.y > CANVAS_H + 30) {
      swapRemove(game.powerUps, index);
      continue;
    }

    if (!overlaps(
      powerUp.x, powerUp.y, powerUp.size * 2, powerUp.size * 2,
      player.x, player.y, player.width, player.height,
    )) continue;

    swapRemove(game.powerUps, index);
    game.stats.powerUpsCollected++;

    spawnParticles(
      game,
      powerUp.x,
      powerUp.y,
      10,
      "powerup",
      POWERUP_COLORS[powerUp.type],
    );

    switch (powerUp.type) {
      case "spread":
        player.spreadLevel = Math.min(2, player.spreadLevel + 1);
        player.spreadTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "SPREAD SHOT", POWERUP_COLORS.spread);
        break;

      case "rapid":
        player.rapidTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "RAPID FIRE", POWERUP_COLORS.rapid);
        break;

      case "shield":
        player.shieldTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "SHIELD", POWERUP_COLORS.shield);
        break;

      case "missile":
        player.missileTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "HOMING MISSILES", POWERUP_COLORS.missile);
        break;

      case "health":
        player.hp = Math.min(player.maxHp, player.hp + 1);
        addText(game, player.x, player.y - 30, "+1 HP", POWERUP_COLORS.health);
        break;

      case "bomb":
        for (let enemyIndex = game.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
          const enemy = game.enemies[enemyIndex]!;
          game.score += enemy.points;
          game.stats.kills++;
          spawnParticles(game, enemy.x, enemy.y, 16, "explosion");
        }

        game.enemies.length = 0;
        game.enemyBullets.length = 0;
        game.bossActive = false;
        game.screenShake = 22;
        game.slowMotionTimer = 18;
        game.slowMotion = 18;
        addText(game, player.x, player.y - 30, "NOVA BOMB", POWERUP_COLORS.bomb);
        break;

      case "laser":
        player.laserTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "LASER BEAM", "#a855f7");
        break;

      case "magnet":
        player.magnetTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "ITEM MAGNET", "#eab308");
        break;

      case "scoreMultiplier":
        player.scoreMultiplierTimer = POWERUP_DURATION;
        addText(game, player.x, player.y - 30, "2X SCORE", "#ec4899");
        break;
    }
  }
}

function updateEffects(game: GameData, timeScale: number) {
  if (game.comboTimer > 0) {
    game.comboTimer -= timeScale;
    if (game.comboTimer <= 0) game.combo = 0;
  }

  for (let index = game.floatingTexts.length - 1; index >= 0; index--) {
    const text = game.floatingTexts[index]!;
    text.y -= 1.1 * timeScale;
    text.life -= timeScale;
    if (text.life <= 0) swapRemove(game.floatingTexts, index);
  }

  for (let index = game.particles.length - 1; index >= 0; index--) {
    const particle = game.particles[index]!;
    particle.x += particle.vx * timeScale;
    particle.y += particle.vy * timeScale;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= timeScale;

    if (particle.life <= 0) {
      PARTICLE_POOL.push(particle);
      swapRemove(game.particles, index);
    }
  }

  for (const star of game.stars) {
    star.y += star.speed * timeScale;
    if (star.y > CANVAS_H) {
      star.y = -5;
      star.x = Math.random() * CANVAS_W;
    }
  }

  if (game.screenShake > 0) {
    game.screenShake *= 0.86;
    game.screenShakeAngle = Math.random() * Math.PI * 2;
    if (game.screenShake < 0.5) game.screenShake = 0;
  }
}

export function updateGame(game: GameData, input: InputState, dt: number) {
  if (game.state !== "playing") return;

  game.frameCount++;
  game.stats.time += dt / 1000;

  const timeScale = game.slowMotionTimer > 0 ? 0.35 : 1;
  game.slowMotionTimer = Math.max(0, game.slowMotionTimer - 1);
  game.slowMotion = game.slowMotionTimer;

  updatePlayer(game, input, timeScale);
  updateBullets(game, timeScale);

  game.enemySpawnTimer -= timeScale;
  if (game.enemySpawnTimer <= 0) {
    const spawnRate = Math.max(42, 125 - game.wave * 6);
    const maxEnemies = game.bossActive
      ? 3
      : Math.min(14, 6 + Math.floor(game.wave * 0.8));

    game.enemySpawnTimer = game.bossActive ? spawnRate * 2 : spawnRate;

    if (game.enemies.length < maxEnemies) {
      spawnEnemy(game);
    }
  }

  game.waveTimer -= timeScale;
  if (game.waveTimer <= 0) {
    game.wave++;
    game.difficulty = 1 + game.wave * 0.3;
    game.waveTimer = 650 + game.wave * 55;

    if (game.wave % 5 === 0) {
      spawnBoss(game);
    } else {
      game.waveAnnounceTimer = 110;
      game.waveAnnounce = 110;
    }
  }

  game.waveAnnounceTimer = Math.max(0, game.waveAnnounceTimer - timeScale);
  game.waveAnnounce = game.waveAnnounceTimer;

  game.bossWarningTimer = Math.max(0, game.bossWarningTimer - timeScale);
  game.bossWarning = game.bossWarningTimer;

  updateEnemies(game, timeScale);
  updatePowerUps(game, timeScale);
  updateEffects(game, timeScale);
}
