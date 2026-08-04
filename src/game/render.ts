import type { GameData, InputState, PowerUpType, Enemy, Bullet, Player } from './types';
import { CANVAS_W, CANVAS_H, POWERUP_COLORS, LOGIC_HZ, getThemeColors, THEME_CONFIGS, ThemeColors } from './engine';
import { isMuted } from './audio';

// ---------- pre-rendered glow sprites (big perf win vs per-frame gradients) ----------
const glowCache = new Map<string, HTMLCanvasElement>();

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function getGlow(color: string): HTMLCanvasElement {
  let s = glowCache.get(color);
  if (!s) {
    const S = 64;
    s = document.createElement('canvas');
    s.width = S;
    s.height = S;
    const c = s.getContext('2d')!;
    const [r, g, b] = hexToRgb(color.startsWith('#') ? color : '#ffffff');
    const grad = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
    grad.addColorStop(0.35, `rgba(${r},${g},${b},0.25)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.fillStyle = grad;
    c.fillRect(0, 0, S, S);
    glowCache.set(color, s);
  }
  return s;
}

function drawGlow(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(getGlow(color), x - radius, y - radius, radius * 2, radius * 2);
}

// ---------- cached vignette ----------
let vignetteCache: { key: string; grad: CanvasGradient } | null = null;

function getVignette(ctx: CanvasRenderingContext2D): CanvasGradient {
  const key = 'v';
  if (!vignetteCache || vignetteCache.key !== key) {
    const g = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.32,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.78
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    vignetteCache = { key, grad: g };
  }
  return vignetteCache.grad;
}

// ---------- STORM LORD (thor) ATMOSPHERE ----------
function hash(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function drawCloudBand(
  ctx: CanvasRenderingContext2D,
  seed: number,
  y: number,
  scale: number,
  alpha: number,
  color: string,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < 9; i++) {
    const h = hash(seed + i);
    const x = ((h * CANVAS_W * 1.4) + i * 37) % (CANVAS_W + 120) - 60;
    const rx = (28 + h * 46) * scale;
    const ry = rx * (0.34 + hash(seed + i + 90) * 0.2);
    ctx.beginPath();
    ctx.ellipse(x, y + hash(seed + i + 40) * 26 * scale, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTemple(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, alpha: number) {
  const h = w * 0.5;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#091A33';
  // floating rock base
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w * 0.18, y + h * 1.1);
  ctx.lineTo(x - w * 0.22, y + h * 0.8);
  ctx.closePath();
  ctx.fill();
  // temple body + pediment
  ctx.fillRect(x - w * 0.3, y - h * 0.5, w * 0.6, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.38, y - h * 0.5);
  ctx.lineTo(x, y - h * 0.9);
  ctx.lineTo(x + w * 0.38, y - h * 0.5);
  ctx.closePath();
  ctx.fill();
  // pillar gaps
  ctx.fillStyle = 'rgba(63,169,255,0.16)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - w * 0.22 + i * w * 0.18, y - h * 0.45, w * 0.05, h * 0.42);
  }
  ctx.globalAlpha = 1;
}

function drawBolt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y0: number,
  y1: number,
  seed: number,
  width: number,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y0);
  const steps = 9;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const jitter = (hash(seed + i) - 0.5) * 44 * (1 - t * 0.4);
    ctx.lineTo(x + jitter, y0 + (y1 - y0) * t);
  }
  ctx.stroke();
  ctx.strokeStyle = '#69F0FF';
  ctx.lineWidth = width * 3;
  ctx.globalAlpha = alpha * 0.25;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

function drawStormBackground(ctx: CanvasRenderingContext2D, game: GameData, tc: ThemeColors) {
  const fc = game.frameCount;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, tc.bgGradTop);
  bgGrad.addColorStop(0.55, '#071734');
  bgGrad.addColorStop(1, tc.bgGradBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-12, -12, CANVAS_W + 24, CANVAS_H + 24);

  // far storm clouds
  for (let b = 0; b < 4; b++) {
    const y = ((fc * 0.14 + b * (CANVAS_H / 4)) % (CANVAS_H + 140)) - 70;
    drawCloudBand(ctx, b * 11 + 3, y, 1.5, 0.1, '#2b4a76');
  }

  // floating temples (mid background)
  for (let t = 0; t < 3; t++) {
    const y = ((fc * 0.22 + t * (CANVAS_H / 3)) % (CANVAS_H + 220)) - 110;
    const x = 40 + hash(t * 7.3) * (CANVAS_W - 80);
    drawTemple(ctx, x, y, 66 + hash(t * 3.1) * 44, 0.5);
  }

  // near clouds
  for (let b = 0; b < 3; b++) {
    const y = ((fc * 0.42 + b * (CANVAS_H / 3)) % (CANVAS_H + 160)) - 80;
    drawCloudBand(ctx, 200 + b * 17, y, 2.1, 0.08, '#123a63');
  }

  // rain streaks
  ctx.strokeStyle = '#D8E5F0';
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const s of game.stars) {
    const y = (s.y + fc * (2 + s.layer * 1.6)) % CANVAS_H;
    ctx.moveTo(s.x, y);
    ctx.lineTo(s.x + 2, y + 12 + s.layer * 5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // periodic background lightning + sky flash
  const cycle = 190;
  const phase = fc % cycle;
  if (phase < 12) {
    const strikeSeed = Math.floor(fc / cycle);
    const fade = 1 - phase / 12;
    ctx.fillStyle = '#3FA9FF';
    ctx.globalAlpha = 0.09 * fade;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.globalAlpha = 1;
    drawBolt(
      ctx,
      30 + hash(strikeSeed) * (CANVAS_W - 60),
      -10,
      CANVAS_H * (0.45 + hash(strikeSeed + 5) * 0.4),
      strikeSeed * 13,
      1.6,
      0.55 * fade,
    );
  }
}

// ---------- CLEAN THEME BACKGROUND EFFECTS ----------
function drawThemeBackground(ctx: CanvasRenderingContext2D, game: GameData, tc: ThemeColors) {
  if (game.theme === 'thor') {
    drawStormBackground(ctx, game, tc);
    return;
  }

  const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bgGrad.addColorStop(0, tc.bgGradTop);
  bgGrad.addColorStop(1, tc.bgGradBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(-12, -12, CANVAS_W + 24, CANVAS_H + 24);

  // Subtle animated grid
  ctx.strokeStyle = tc.playerGlow;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.035;
  const offset = (game.frameCount * 0.4) % 40;
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }
  for (let y = offset; y <= CANVAS_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Stars
  for (const s of game.stars) {
    ctx.fillStyle = s.layer === 0 ? tc.bulletGlow : s.layer === 1 ? tc.playerGlow : '#ffffff';
    ctx.globalAlpha = s.brightness * (0.6 + 0.4 * Math.sin(game.frameCount * 0.02 + s.x));
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}


// ---------- SLEEK PLAYER SHIP RENDERERS ----------

function drawSpiderPlayer(ctx: CanvasRenderingContext2D, p: Player, fc: number, tc: ThemeColors) {
  ctx.fillStyle = tc.player;
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(-p.width / 2, p.height / 2);
  ctx.lineTo(-p.width / 4, p.height / 3);
  ctx.lineTo(0, p.height / 2.5);
  ctx.lineTo(p.width / 4, p.height / 3);
  ctx.lineTo(p.width / 2, p.height / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tc.playerGlow;
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 3);
  ctx.lineTo(-p.width / 3, p.height / 4);
  ctx.lineTo(p.width / 3, p.height / 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawIronManPlayer(ctx: CanvasRenderingContext2D, p: Player, fc: number, tc: ThemeColors) {
  ctx.fillStyle = tc.player;
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2 - 2);
  ctx.lineTo(-p.width / 2 - 4, p.height / 4);
  ctx.lineTo(-p.width / 3, p.height / 2);
  ctx.lineTo(0, p.height / 3);
  ctx.lineTo(p.width / 3, p.height / 2);
  ctx.lineTo(p.width / 2 + 4, p.height / 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tc.playerGlow;
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(-p.width / 4, p.height / 3);
  ctx.lineTo(p.width / 4, p.height / 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawThorPlayer(ctx: CanvasRenderingContext2D, p: Player, fc: number, tc: ThemeColors) {
  const w = p.width, h = p.height;
  const pulse = 0.5 + 0.5 * Math.sin(fc * 0.14);

  // outer wing blades (divine sky weapon)
  ctx.fillStyle = '#F6C343';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * w * 0.16, -h * 0.34);
    ctx.lineTo(dir * (w * 0.62 + 7), -h * 0.05);
    ctx.lineTo(dir * (w * 0.52 + 4), h * 0.3);
    ctx.lineTo(dir * w * 0.2, h * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  // inner wing plating
  ctx.fillStyle = '#D8E5F0';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * w * 0.1, -h * 0.42);
    ctx.lineTo(dir * w * 0.42, h * 0.02);
    ctx.lineTo(dir * w * 0.16, h * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  // central hull
  ctx.fillStyle = tc.player;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 - 5);
  ctx.lineTo(w * 0.16, -h * 0.1);
  ctx.lineTo(w * 0.1, h * 0.42);
  ctx.lineTo(0, h * 0.3);
  ctx.lineTo(-w * 0.1, h * 0.42);
  ctx.lineTo(-w * 0.16, -h * 0.1);
  ctx.closePath();
  ctx.fill();

  // energy core
  ctx.fillStyle = '#69F0FF';
  ctx.globalAlpha = 0.55 + 0.35 * pulse;
  ctx.beginPath();
  ctx.arc(0, -1, 6 + pulse * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -1, 3, 0, Math.PI * 2);
  ctx.fill();

  // thunder-stream propulsion bolt
  ctx.strokeStyle = '#69F0FF';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5 + 0.4 * pulse;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.4);
  ctx.lineTo(-3, h * 0.58);
  ctx.lineTo(2, h * 0.62);
  ctx.lineTo(-1, h * 0.86);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}


// ---------- SLEEK HIGH-TECH ENEMY RENDERERS ----------

function drawThemeEnemy(ctx: CanvasRenderingContext2D, e: Enemy, fc: number, theme: string, tc: ThemeColors) {
  const isFlashing = e.flash > 0;
  const col = isFlashing ? '#ffffff' : e.type === 'basic' ? tc.enemies.basic : e.type === 'fast' ? tc.enemies.fast : e.type === 'tank' ? tc.enemies.tank : e.type === 'bomber' ? tc.enemies.bomber : e.type === 'kamikaze' ? tc.enemies.kamikaze : tc.enemies.boss;

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  ctx.fillStyle = col;

  if (e.type === 'boss') {
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.lineTo(e.width / 2 + 6, e.height / 4);
    ctx.lineTo(e.width / 4, e.height / 2);
    ctx.lineTo(-e.width / 4, e.height / 2);
    ctx.lineTo(-e.width / 2 - 6, e.height / 4);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isFlashing ? '#ffffff' : tc.playerGlow;
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 3);
    ctx.lineTo(e.width / 3, 0);
    ctx.lineTo(0, e.height / 3);
    ctx.lineTo(-e.width / 3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 14 + Math.sin(fc * 0.1) * 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'fast') {
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2 + 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(0, -e.height / 4);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'tank') {
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.lineTo(e.width / 2, e.height / 3);
    ctx.lineTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, e.height / 3);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-e.width / 4, -e.height / 6, e.width / 2, e.height / 3);
  } else if (e.type === 'bomber') {
    ctx.beginPath();
    ctx.moveTo(0, -e.height / 2);
    ctx.lineTo(e.width / 2, 0);
    ctx.lineTo(e.width / 3, e.height / 2);
    ctx.lineTo(-e.width / 3, e.height / 2);
    ctx.lineTo(-e.width / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'kamikaze') {
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 2);
    ctx.lineTo(0, -e.height / 4);
    ctx.lineTo(e.width / 2, -e.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Health bar for damaged enemies
  if (e.hp < e.maxHp && e.type !== 'boss') {
    ctx.restore();
    const barW = e.width;
    const hpR = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - barW / 2, e.y - e.height / 2 - 8, barW, 4);
    ctx.fillStyle = tc.hud;
    ctx.fillRect(e.x - barW / 2, e.y - e.height / 2 - 8, barW * hpR, 4);
  } else {
    ctx.restore();
  }

  // Boss HP Bar overlay
  if (e.type === 'boss') {
    const hpRatio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(e.x - 50, e.y - e.height / 2 - 16, 100, 7);
    ctx.fillStyle = tc.enemies.boss;
    ctx.fillRect(e.x - 50, e.y - e.height / 2 - 16, 100 * hpRatio, 7);
  }
}

// ---------- MAIN RENDER PIPELINE ----------
export function renderGame(
  ctx: CanvasRenderingContext2D,
  game: GameData,
  canvasWidth: number,
  canvasHeight: number,
  input?: InputState
) {
  const tc = getThemeColors(game.theme);

  const scaleX = canvasWidth / CANVAS_W;
  const scaleY = canvasHeight / CANVAS_H;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - CANVAS_W * scale) / 2;
  const offsetY = (canvasHeight - CANVAS_H * scale) / 2;

  // Clear entire viewport canvas smoothly
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = tc.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Apply Centered Game Matrix
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  if (game.screenShake > 0) {
    ctx.translate(
      Math.cos(game.screenShakeAngle) * game.screenShake,
      Math.sin(game.screenShakeAngle) * game.screenShake
    );
  }

  // Draw Theme Background Gradient, Grid & Starfield
  drawThemeBackground(ctx, game, tc);

  if (game.state === 'menu') {
    renderMenu(ctx, game);
    ctx.fillStyle = getVignette(ctx);
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    return;
  }

  const p = game.player;

  // ============ ADDITIVE GLOW PASS ============
  ctx.globalCompositeOperation = 'lighter';

  // Enemy glows
  for (const e of game.enemies) {
    const col = e.type === 'basic' ? tc.enemies.basic : e.type === 'fast' ? tc.enemies.fast : e.type === 'tank' ? tc.enemies.tank : e.type === 'bomber' ? tc.enemies.bomber : e.type === 'kamikaze' ? tc.enemies.kamikaze : tc.enemies.boss;
    drawGlow(ctx, col, e.x, e.y, e.width * 1.1, e.type === 'boss' ? 0.65 : 0.4);
  }

  // Bullet glows
  for (const b of game.bullets) {
    drawGlow(ctx, b.homing ? tc.missile : tc.bulletGlow, b.x, b.y, b.width * 3.5, 0.65);
  }

  // Enemy bullet glows
  for (const b of game.enemyBullets) {
    drawGlow(ctx, tc.enemies.fast, b.x, b.y, b.size * 3, 0.65);
  }

  // Power-up glows
  for (const pw of game.powerUps) {
    drawGlow(ctx, POWERUP_COLORS[pw.type], pw.x, pw.y, pw.size * 2.2, 0.45 + Math.sin(pw.pulse) * 0.2);
  }

  // Player glow
  if (p.invincibleTimer <= 0 || Math.floor(game.frameCount / 3) % 2 === 0) {
    drawGlow(ctx, tc.playerGlow, p.x, p.y, p.width * 1.2, 0.5);
    drawGlow(ctx, tc.player, p.x, p.y + p.height / 2, 16, 0.65);
  }

  ctx.globalCompositeOperation = 'source-over';

  // ============ ENTITY DRAW PASS ============

  // Particles
  for (const pt of game.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Power-ups
  for (const pw of game.powerUps) {
    const pulseSize = pw.size + Math.sin(pw.pulse) * 2;
    ctx.fillStyle = POWERUP_COLORS[pw.type];
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pulseSize + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons: Record<PowerUpType, string> = { spread: 'S', rapid: 'R', shield: '◆', bomb: 'B', health: '+', missile: 'M', laser: 'L', magnet: 'U', scoreMultiplier: '2X' };
    ctx.fillText(icons[pw.type], pw.x, pw.y);
  }

  // Player bullets
  const stormShots = game.theme === 'thor';
  for (const b of game.bullets) {
    if (stormShots && !b.homing) {
      // lightning-bolt shot
      const half = b.height / 2;
      const j = ((b.y | 0) % 2 === 0 ? 1 : -1) * (b.width * 0.6);
      ctx.strokeStyle = b.color || tc.bullet;
      ctx.lineWidth = Math.max(1.5, b.width * 0.8);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - half);
      ctx.lineTo(b.x + j, b.y - half * 0.3);
      ctx.lineTo(b.x - j, b.y + half * 0.3);
      ctx.lineTo(b.x, b.y + half);
      ctx.stroke();
      ctx.lineWidth = 1;
      continue;
    }
    ctx.fillStyle = b.color || tc.bullet;
    ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(b.x - 1, b.y - b.height / 2, 2, b.height);
  }


  // Enemy bullets
  for (const b of game.enemyBullets) {
    ctx.fillStyle = tc.enemies.fast;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemies
  for (const e of game.enemies) {
    drawThemeEnemy(ctx, e, game.frameCount, game.theme, tc);
  }

  // Player ship
  if (p.invincibleTimer <= 0 || Math.floor(game.frameCount / 3) % 2 === 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.tilt * Math.PI) / 180);

    if (p.shieldTimer > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(game.frameCount * 0.1) * 0.15;
      ctx.strokeStyle = tc.shield;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.width * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (game.theme === 'spiderman') {
      drawSpiderPlayer(ctx, p, game.frameCount, tc);
    } else if (game.theme === 'ironman') {
      drawIronManPlayer(ctx, p, game.frameCount, tc);
    } else {
      drawThorPlayer(ctx, p, game.frameCount, tc);
    }

    ctx.restore();
  }

  // Touch indicator ring
  if (input && input.touchActive && input.touchX !== null && input.touchY !== null && game.state === 'playing') {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = tc.player;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(input.touchX, input.touchY, 16 + Math.sin(game.frameCount * 0.2) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Floating texts
  ctx.textAlign = 'center';
  for (const ft of game.floatingTexts) {
    ctx.globalAlpha = ft.life / ft.maxLife;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  // ============ HUD ============
  renderHUD(ctx, game);

  // Damage flash
  if (p.invincibleTimer > 78) {
    ctx.fillStyle = `rgba(255,0,60,${((p.invincibleTimer - 78) / 22) * 0.28})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Low HP warning pulse
  if (p.hp === 1 && game.state === 'playing') {
    ctx.fillStyle = `rgba(255,0,40,${0.05 + Math.sin(game.frameCount * 0.1) * 0.04})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Boss Warning banner
  if (game.bossWarning > 0) {
    const prog = game.bossWarning / 150;
    ctx.globalAlpha = Math.min(1, prog * 3) * (Math.sin(game.frameCount * 0.25) > -0.4 ? 1 : 0.35);
    ctx.fillStyle = tc.enemies.kamikaze;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING: BOSS INCOMING', CANVAS_W / 2, 220);
    ctx.globalAlpha = 1;
  } else if (game.waveAnnounce > 0) {
    const prog = game.waveAnnounce / 120;
    const sc = prog > 0.8 ? 1 + (prog - 0.8) * 5 : 1;
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, prog * 3);
    ctx.fillStyle = tc.hud;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${game.wave + 1}`, 0, 0);
    ctx.globalAlpha = Math.min(0.7, prog * 2);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('INCOMING', 0, 28);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Pause overlay
  if (game.state === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = tc.hud;
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 60);

    renderThemeSelector(ctx, game, CANVAS_H / 2 + 30);

    ctx.font = '15px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('ESC or tap to resume', CANVAS_W / 2, CANVAS_H / 2 + 110);
  }

  // Game over overlay
  if (game.state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = tc.enemies.kamikaze;
    ctx.font = 'bold 46px monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 180);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`SCORE  ${game.score.toLocaleString()}`, CANVAS_W / 2, 224);

    if (game.highScores.length > 0 && game.score > 0 && game.score === game.highScores[0]) {
      ctx.fillStyle = tc.bulletGlow;
      ctx.font = 'bold 18px monospace';
      const pulse = 1 + Math.sin(game.frameCount * 0.12) * 0.04;
      ctx.save();
      ctx.translate(CANVAS_W / 2, 254);
      ctx.scale(pulse, pulse);
      ctx.fillText('* NEW HIGH SCORE *', 0, 0);
      ctx.restore();
    }

    // Run stats
    const mins = Math.floor(game.stats.time / 60);
    const secs = Math.floor(game.stats.time % 60).toString().padStart(2, '0');
    const acc = game.stats.shots > 0 ? Math.round((game.stats.hits / game.stats.shots) * 100) : 0;
    ctx.font = '13px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`TIME ${mins}:${secs}    KILLS ${game.stats.kills}`, CANVAS_W / 2, 290);
    ctx.fillText(`BEST COMBO ${game.stats.bestCombo}x    ACCURACY ${acc}%`, CANVAS_W / 2, 310);

    // High scores
    ctx.fillStyle = tc.hud;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HIGH SCORES', CANVAS_W / 2, 355);
    ctx.font = '13px monospace';
    const displayScores = game.highScores.slice(0, 5);
    for (let i = 0; i < displayScores.length; i++) {
      ctx.fillStyle = i === 0 ? tc.bulletGlow : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888';
      ctx.fillText(`${i + 1}.  ${displayScores[i]!.toLocaleString()}`, CANVAS_W / 2, 380 + i * 20);
    }

    if (Math.sin(game.frameCount * 0.08) > 0) {
      ctx.fillStyle = tc.player;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('TAP OR PRESS ENTER TO RESTART', CANVAS_W / 2, 540);
    }
  }

  // Vignette
  ctx.fillStyle = getVignette(ctx);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ---------- HUD ----------
function renderHUD(ctx: CanvasRenderingContext2D, game: GameData) {
  const tc = getThemeColors(game.theme);
  const p = game.player;

  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(game.score.toLocaleString(), 12, 30);

  // Combo
  if (game.combo > 1) {
    ctx.fillStyle = tc.bulletGlow;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${game.combo}x COMBO`, 12, 54);
  }

  // Active Theme badge
  ctx.fillStyle = tc.hud;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(tc.name, CANVAS_W / 2, 24);

  // Sound & Pause icons (top right)
  drawSoundIcon(ctx, CANVAS_W - 85, 25);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(CANVAS_W - 35, 17, 4, 16);
  ctx.fillRect(CANVAS_W - 25, 17, 4, 16);

  // HP pips
  for (let i = 0; i < p.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? (i < 2 ? tc.enemies.kamikaze : tc.player) : '#1e293b';
    ctx.fillRect(12 + i * 22, CANVAS_H - 24, 18, 10);
  }

  // Active power-up chips
  let iconX = CANVAS_W - 14;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  if (p.spreadTimer > 0) {
    ctx.fillStyle = POWERUP_COLORS.spread;
    ctx.fillText(`S:${Math.ceil(p.spreadTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
    iconX -= 42;
  }
  if (p.rapidTimer > 0) {
    ctx.fillStyle = POWERUP_COLORS.rapid;
    ctx.fillText(`R:${Math.ceil(p.rapidTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
    iconX -= 42;
  }
  if (p.shieldTimer > 0) {
    ctx.fillStyle = POWERUP_COLORS.shield;
    ctx.fillText(`SH:${Math.ceil(p.shieldTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
    iconX -= 48;
  }
  if (p.missileTimer > 0) {
    ctx.fillStyle = POWERUP_COLORS.missile;
    ctx.fillText(`MS:${Math.ceil(p.missileTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
  }
}

function drawSoundIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const muted = isMuted();
  ctx.fillStyle = muted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 3);
  ctx.lineTo(x - 4, y - 3);
  ctx.lineTo(x + 1, y - 8);
  ctx.lineTo(x + 1, y + 8);
  ctx.lineTo(x - 4, y + 3);
  ctx.lineTo(x - 8, y + 3);
  ctx.closePath();
  ctx.fill();

  if (muted) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 8);
    ctx.lineTo(x + 6, y + 8);
    ctx.stroke();
  }
}

// ---------- Theme Selector UI Pill Render ----------
function renderThemeSelector(ctx: CanvasRenderingContext2D, game: GameData, yY: number) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('SELECT HERO THEME', CANVAS_W / 2, yY - 18);

  const themes: { id: 'spiderman' | 'ironman' | 'thor'; label: string; icon: string }[] = [
    { id: 'spiderman', label: 'SPIDEY', icon: '🕸️' },
    { id: 'ironman', label: 'IRON MAN', icon: '🤖' },
    { id: 'thor', label: 'THOR', icon: '⚡' },
  ];

  const pillW = 120;
  const pillH = 36;
  const startX = CANVAS_W / 2 - pillW * 1.5 - 10;

  themes.forEach((t, index) => {
    const x = startX + index * (pillW + 10);
    const active = game.theme === t.id;
    const tc = THEME_CONFIGS[t.id];

    ctx.fillStyle = active ? tc.player : 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x, yY, pillW, pillH, 18);
    ctx.fill();

    if (active) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = active ? '#ffffff' : tc.player;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${t.icon} ${t.label}`, x + pillW / 2, yY + 22);
  });
}

function renderMenu(ctx: CanvasRenderingContext2D, game: GameData) {
  const tc = getThemeColors(game.theme);
  const fc = game.frameCount;
  const titleY = 150 + Math.sin(fc * 0.03) * 8;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Glow behind the title
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, tc.player, CANVAS_W / 2, titleY - 10, 160, 0.45);
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 54px monospace';
  ctx.fillText('LUMA', CANVAS_W / 2, titleY);
  ctx.fillStyle = tc.player;
  ctx.font = 'bold 22px monospace';
  ctx.fillText(tc.subtitle, CANVAS_W / 2, titleY + 36);

  // Demo ship
  const shipY = 280 + Math.sin(fc * 0.04) * 5;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, tc.playerGlow, CANVAS_W / 2, shipY, 46, 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(CANVAS_W / 2, shipY);
  ctx.scale(1.5, 1.5);
  if (game.theme === 'spiderman') {
    drawSpiderPlayer(ctx, game.player, game.frameCount, tc);
  } else if (game.theme === 'ironman') {
    drawIronManPlayer(ctx, game.player, game.frameCount, tc);
  } else {
    drawThorPlayer(ctx, game.player, game.frameCount, tc);
  }
  ctx.restore();

  // Theme Selector Cards on Menu
  renderThemeSelector(ctx, game, 360);

  // Start prompt
  if (Math.sin(fc * 0.06) > -0.3) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PRESS ENTER OR TAP TO PLAY', CANVAS_W / 2, 460);
  }

  // Controls
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('WASD / ARROWS — Move    SPACE — Fire', CANVAS_W / 2, 530);
  ctx.fillText('ESC — Pause    M — Mute Sound', CANVAS_W / 2, 552);
}
