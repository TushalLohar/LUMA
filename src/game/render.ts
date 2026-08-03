import type { GameData, InputState, PowerUpType } from './types';
import { CANVAS_W, CANVAS_H, COLORS, POWERUP_COLORS, LOGIC_HZ } from './engine';
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
    const [r, g, b] = hexToRgb(color);
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

// ---------- static nebula backdrop (rendered once) ----------
let nebulaCanvas: HTMLCanvasElement | null = null;

function getNebula(): HTMLCanvasElement {
  if (!nebulaCanvas) {
    nebulaCanvas = document.createElement('canvas');
    nebulaCanvas.width = CANVAS_W;
    nebulaCanvas.height = CANVAS_H;
    const c = nebulaCanvas.getContext('2d')!;
    const blobs: [number, number, number, string][] = [
      [120, 180, 170, '90,40,10'],
      [370, 430, 190, '12,44,72'],
      [190, 640, 150, '70,26,12'],
      [410, 110, 130, '20,50,64'],
    ];
    for (const [x, y, r, col] of blobs) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col},0.5)`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }
  return nebulaCanvas;
}

// ---------- cached vignette (rebuilt only on resize) ----------
let vignetteCache: { key: string; grad: CanvasGradient } | null = null;

function getVignette(ctx: CanvasRenderingContext2D): CanvasGradient {
  const key = 'v';
  if (!vignetteCache || vignetteCache.key !== key) {
    const g = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.32,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.78
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    vignetteCache = { key, grad: g };
  }
  return vignetteCache.grad;
}

// ---------- main render ----------
export function renderGame(
  ctx: CanvasRenderingContext2D,
  game: GameData,
  canvasWidth: number,
  canvasHeight: number,
  input?: InputState
) {
  const scaleX = canvasWidth / CANVAS_W;
  const scaleY = canvasHeight / CANVAS_H;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (canvasWidth - CANVAS_W * scale) / 2;
  const offsetY = (canvasHeight - CANVAS_H * scale) / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  if (game.screenShake > 0) {
    ctx.translate(
      Math.cos(game.screenShakeAngle) * game.screenShake,
      Math.sin(game.screenShakeAngle) * game.screenShake
    );
  }

  // Background + nebula
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(-12, -12, CANVAS_W + 24, CANVAS_H + 24);
  ctx.globalAlpha = 0.55;
  ctx.drawImage(getNebula(), 0, 0);
  ctx.globalAlpha = 1;

  // Stars
  ctx.fillStyle = '#ffffff';
  for (const s of game.stars) {
    ctx.globalAlpha = s.brightness * (0.6 + 0.4 * Math.sin(game.frameCount * 0.02 + s.x));
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

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
    const col = e.type === 'basic' ? COLORS.enemy1 : e.type === 'fast' ? COLORS.enemy2 : e.type === 'tank' ? COLORS.enemy3 : e.type === 'bomber' ? COLORS.enemy4 : e.type === 'kamikaze' ? COLORS.kamikaze : COLORS.boss;
    drawGlow(ctx, col, e.x, e.y, e.width * 0.9, e.type === 'boss' ? 0.5 : 0.3);
  }

  // Bullet glows
  for (const b of game.bullets) {
    drawGlow(ctx, b.homing ? COLORS.powerMissile : COLORS.bulletGlow, b.x, b.y, b.width * 3.2, 0.55);
  }

  // Enemy bullet glows
  for (const b of game.enemyBullets) {
    drawGlow(ctx, COLORS.enemy1, b.x, b.y, b.size * 3, 0.6);
  }

  // Power-up glows
  for (const pw of game.powerUps) {
    drawGlow(ctx, POWERUP_COLORS[pw.type], pw.x, pw.y, pw.size * 2.2, 0.45 + Math.sin(pw.pulse) * 0.2);
  }

  // Player glow + engine
  if (p.invincibleTimer <= 0 || Math.floor(game.frameCount / 3) % 2 === 0) {
    drawGlow(ctx, COLORS.playerGlow, p.x, p.y, p.width * 1.1, 0.4);
    const engPulse = 4 + Math.sin(game.frameCount * 0.3) * 2;
    const rad = p.tilt * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    for (const ex of [-6, 6]) {
      const lx = ex * cos - (p.height / 3) * sin;
      const ly = ex * sin + (p.height / 3) * cos;
      drawGlow(ctx, COLORS.bulletGlow, p.x + lx, p.y + ly, engPulse * 2.4, 0.8);
    }
  }

  // Shield ring glow
  if (p.shieldTimer > 0) {
    drawGlow(ctx, COLORS.shield, p.x, p.y, p.width * 1.4, 0.25 + Math.sin(game.frameCount * 0.1) * 0.08);
  }

  // Particles (additive neon)
  for (const pt of game.particles) {
    const a = pt.life / pt.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    if (pt.type === 'spark') {
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size * 2);
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0.4, pt.size * a), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // ============ SOLID PASS ============

  // Power-up cores
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pw of game.powerUps) {
    const pulseSize = pw.size + Math.sin(pw.pulse) * 2.5;
    const color = POWERUP_COLORS[pw.type]!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pw.x, pw.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    const icons: Record<PowerUpType, string> = { spread: 'S', rapid: 'R', shield: '◆', bomb: 'B', health: '+', missile: 'M' };
    ctx.fillText(icons[pw.type], pw.x, pw.y + 1);
  }

  // Player bullets (no transforms needed — plain rects)
  for (const b of game.bullets) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.x - 1, b.y - b.height / 2, 2, b.height);
  }

  // Enemy bullets
  for (const b of game.enemyBullets) {
    ctx.fillStyle = '#ff6090';
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
    const col = e.type === 'basic' ? COLORS.enemy1 : e.type === 'fast' ? COLORS.enemy2 : e.type === 'tank' ? COLORS.enemy3 : e.type === 'bomber' ? COLORS.enemy4 : e.type === 'kamikaze' ? COLORS.kamikaze : COLORS.boss;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : col;

    if (e.type === 'basic') {
      ctx.beginPath();
      ctx.moveTo(0, -e.height / 2);
      ctx.lineTo(e.width / 2, 0);
      ctx.lineTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, 0);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'fast') {
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'tank') {
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2 + e.angle;
        ctx.lineTo(Math.cos(ang) * e.width / 2, Math.sin(ang) * e.height / 2);
      }
      ctx.closePath();
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#333';
        ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width, 3);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width * (e.hp / e.maxHp), 3);
      }
    } else if (e.type === 'bomber') {
      ctx.beginPath();
      for (let a = 0; a < 10; a++) {
        const ang = (a / 10) * Math.PI * 2 + e.angle;
        const r = a % 2 === 0 ? e.width / 2 : e.width / 4;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'kamikaze') {
      const pulse = 1 + Math.sin(game.frameCount * 0.35) * 0.12;
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      ctx.moveTo(0, e.height / 2);
      ctx.lineTo(-e.width / 2, -e.height / 2);
      ctx.lineTo(0, -e.height / 4);
      ctx.lineTo(e.width / 2, -e.height / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      // BOSS — rotating armored hexagon
      ctx.rotate(e.angle);
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        ctx.lineTo(Math.cos(ang) * e.width / 2, Math.sin(ang) * e.height / 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(-e.angle * 2.2);
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#7c1d6f';
      ctx.beginPath();
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        ctx.lineTo(Math.cos(ang) * e.width / 3.2, Math.sin(ang) * e.height / 3.2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.rotate(e.angle * 1.2);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + Math.sin(game.frameCount * 0.15) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Inner core dot (non-boss)
    if (e.type !== 'boss' && e.flash <= 0) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.width * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // Player ship
  if (p.invincibleTimer <= 0 || Math.floor(game.frameCount / 3) % 2 === 0) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt * Math.PI / 180);

    if (p.shieldTimer > 0) {
      ctx.globalAlpha = 0.35 + Math.sin(game.frameCount * 0.1) * 0.12;
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.width * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(0, -p.height / 2);
    ctx.lineTo(-p.width / 2, p.height / 2);
    ctx.lineTo(-p.width / 4, p.height / 3);
    ctx.lineTo(0, p.height / 2.5);
    ctx.lineTo(p.width / 4, p.height / 3);
    ctx.lineTo(p.width / 2, p.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Touch indicator ring
  if (input && input.touchActive && input.touchX !== null && input.touchY !== null && game.state === 'playing') {
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = COLORS.player;
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

  // Wave announcement
  if (game.bossWarning > 0) {
    const prog = game.bossWarning / 150;
    ctx.globalAlpha = Math.min(1, prog * 3) * (Math.sin(game.frameCount * 0.25) > -0.4 ? 1 : 0.35);
    ctx.fillStyle = COLORS.kamikaze;
    ctx.font = 'bold 38px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!! WARNING !!', CANVAS_W / 2, CANVAS_H / 2 - 70);
    ctx.font = 'bold 17px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('MASSIVE SIGNAL APPROACHING', CANVAS_W / 2, CANVAS_H / 2 - 38);
    ctx.globalAlpha = 1;
  } else if (game.waveAnnounce > 0) {
    const prog = game.waveAnnounce / 120;
    const sc = prog > 0.8 ? 1 + (prog - 0.8) * 5 : 1;
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 60);
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, prog * 3);
    ctx.fillStyle = COLORS.hud;
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
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 30);
    ctx.font = '17px monospace';
    ctx.fillStyle = COLORS.hud;
    ctx.fillText('ESC or tap to resume', CANVAS_W / 2, CANVAS_H / 2 + 18);
  }

  // Game over overlay
  if (game.state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = COLORS.enemy1;
    ctx.font = 'bold 50px monospace';
    ctx.fillText('GAME OVER', CANVAS_W / 2, 190);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`SCORE  ${game.score.toLocaleString()}`, CANVAS_W / 2, 236);

    if (game.highScores.length > 0 && game.score > 0 && game.score === game.highScores[0]) {
      ctx.fillStyle = COLORS.bulletGlow;
      ctx.font = 'bold 20px monospace';
      const pulse = 1 + Math.sin(game.frameCount * 0.12) * 0.04;
      ctx.save();
      ctx.translate(CANVAS_W / 2, 268);
      ctx.scale(pulse, pulse);
      ctx.fillText('* NEW HIGH SCORE *', 0, 0);
      ctx.restore();
    }

    // Run stats
    const mins = Math.floor(game.stats.time / 60);
    const secs = Math.floor(game.stats.time % 60).toString().padStart(2, '0');
    const acc = game.stats.shots > 0 ? Math.round((game.stats.hits / game.stats.shots) * 100) : 0;
    ctx.font = '14px monospace';
    ctx.fillStyle = '#e8d9c0';
    ctx.fillText(`TIME ${mins}:${secs}    KILLS ${game.stats.kills}`, CANVAS_W / 2, 306);
    ctx.fillText(`BEST COMBO ${game.stats.bestCombo}x    ACCURACY ${acc}%`, CANVAS_W / 2, 328);

    // High scores
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('HIGH SCORES', CANVAS_W / 2, 380);
    ctx.font = '14px monospace';
    const displayScores = game.highScores.slice(0, 5);
    for (let i = 0; i < displayScores.length; i++) {
      ctx.fillStyle = i === 0 ? COLORS.bulletGlow : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888';
      ctx.fillText(`${i + 1}.  ${displayScores[i]!.toLocaleString()}`, CANVAS_W / 2, 408 + i * 23);
    }

    if (Math.sin(game.frameCount * 0.08) > 0) {
      ctx.fillStyle = COLORS.player;
      ctx.font = 'bold 19px monospace';
      ctx.fillText('TAP OR PRESS ENTER', CANVAS_W / 2, 560);
      ctx.fillText('TO RESTART', CANVAS_W / 2, 584);
    }
  }

  // Vignette
  ctx.fillStyle = getVignette(ctx);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

// ---------- HUD ----------
function renderHUD(ctx: CanvasRenderingContext2D, game: GameData) {
  const p = game.player;

  // Score
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(game.score.toLocaleString(), 12, 30);

  // Combo
  if (game.combo > 1) {
    ctx.fillStyle = COLORS.bulletGlow;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${game.combo}x COMBO`, 12, 54);
  }

  // Wave
  ctx.fillStyle = COLORS.hud;
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`WAVE ${game.wave + 1}`, CANVAS_W - 70, 30);

  // Pause icon (two bars) — touch target: x > W-60, y < 70
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(CANVAS_W - 34, 42, 6, 18);
  ctx.fillRect(CANVAS_W - 24, 42, 6, 18);

  // Sound icon — touch target: W-115..W-62, y < 70
  drawSoundIcon(ctx, CANVAS_W - 66, 51);

  // Boss health bar
  if (game.bossActive) {
    const boss = game.enemies.find(e => e.type === 'boss');
    if (boss) {
      const bw = 260;
      const bx = (CANVAS_W - bw) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx - 3, 44, bw + 6, 14);
      ctx.fillStyle = '#3a1200';
      ctx.fillRect(bx, 47, bw, 8);
      ctx.fillStyle = COLORS.boss;
      ctx.fillRect(bx, 47, bw * Math.max(0, boss.hp / boss.maxHp), 8);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', CANVAS_W / 2, 55);
    }
  }

  // HP pips
  for (let i = 0; i < p.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? (i < 2 ? COLORS.enemy1 : COLORS.player) : '#2a2118';
    ctx.fillRect(12 + i * 22, CANVAS_H - 24, 18, 10);
  }

  // Active power-up chips
  let iconX = CANVAS_W - 14;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  if (p.spreadLevel > 0) {
    ctx.fillStyle = COLORS.powerSpread;
    ctx.fillText(`S${p.spreadLevel}`, iconX, CANVAS_H - 13);
    iconX -= 32;
  }
  if (p.rapidTimer > 0) {
    ctx.fillStyle = COLORS.powerRapid;
    ctx.fillText(`R:${Math.ceil(p.rapidTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
    iconX -= 42;
  }
  if (p.shieldTimer > 0) {
    ctx.fillStyle = COLORS.powerShield;
    ctx.fillText(`SH:${Math.ceil(p.shieldTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
    iconX -= 48;
  }
  if (p.missileTimer > 0) {
    ctx.fillStyle = COLORS.powerMissile;
    ctx.fillText(`MS:${Math.ceil(p.missileTimer / LOGIC_HZ)}`, iconX, CANVAS_H - 13);
  }
}

function drawSoundIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const muted = isMuted();
  ctx.fillStyle = muted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)';
  // speaker body
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 3);
  ctx.lineTo(x - 4, y - 3);
  ctx.lineTo(x + 1, y - 8);
  ctx.lineTo(x + 1, y + 8);
  ctx.lineTo(x - 4, y + 3);
  ctx.lineTo(x - 8, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = muted ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  if (muted) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 5);
    ctx.lineTo(x + 11, y + 5);
    ctx.moveTo(x + 11, y - 5);
    ctx.lineTo(x + 4, y + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x + 3, y, 4, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 3, y, 7.5, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
}

// ---------- menu ----------
function renderMenu(ctx: CanvasRenderingContext2D, game: GameData) {
  const fc = game.frameCount;
  const titleY = 170 + Math.sin(fc * 0.03) * 8;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Glow behind the title
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, COLORS.player, CANVAS_W / 2, titleY - 10, 150, 0.35);
  ctx.globalCompositeOperation = 'source-over';

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 58px monospace';
  ctx.fillText('NOVA', CANVAS_W / 2, titleY);
  ctx.fillStyle = COLORS.player;
  ctx.fillText('BLASTER', CANVAS_W / 2, titleY + 54);

  ctx.fillStyle = COLORS.hud;
  ctx.font = '14px monospace';
  ctx.globalAlpha = 0.7;
  ctx.fillText('DEFEND THE GALAXY', CANVAS_W / 2, titleY + 88);
  ctx.globalAlpha = 1;

  // Demo ship
  const shipY = 320 + Math.sin(fc * 0.04) * 5;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, COLORS.playerGlow, CANVAS_W / 2, shipY, 46, 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(CANVAS_W / 2, shipY);
  ctx.scale(1.5, 1.5);
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-16, 18);
  ctx.lineTo(-8, 12);
  ctx.lineTo(0, 14);
  ctx.lineTo(8, 12);
  ctx.lineTo(16, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, -2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  // Start prompt
  if (Math.sin(fc * 0.06) > -0.3) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('PRESS ENTER OR TAP', CANVAS_W / 2, 425);
    ctx.fillText('TO START', CANVAS_W / 2, 453);
  }

  // Controls
  ctx.fillStyle = '#777';
  ctx.font = '13px monospace';
  ctx.fillText('WASD / ARROWS — Move    SPACE — Fire', CANVAS_W / 2, 516);
  ctx.fillText('ESC — Pause    M — Sound', CANVAS_W / 2, 538);
  ctx.fillText('TOUCH — Drag to fly, auto-fire', CANVAS_W / 2, 560);

  // Boss teaser
  ctx.fillStyle = COLORS.boss;
  ctx.font = 'bold 12px monospace';
  ctx.globalAlpha = 0.8 + Math.sin(fc * 0.1) * 0.2;
  ctx.fillText('— BOSS EVERY 5 WAVES —', CANVAS_W / 2, 592);
  ctx.globalAlpha = 1;

  // High scores
  if (game.highScores.length > 0) {
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HIGH SCORES', CANVAS_W / 2, 636);
    ctx.font = '13px monospace';
    const top = game.highScores.slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      ctx.fillStyle = i === 0 ? COLORS.bulletGlow : '#888';
      ctx.fillText(`${i + 1}.  ${top[i]!.toLocaleString()}`, CANVAS_W / 2, 660 + i * 20);
    }
  }

  // Sound icon on menu
  drawSoundIcon(ctx, CANVAS_W - 66, 51);
}
