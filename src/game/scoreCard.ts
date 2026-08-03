import { shipById } from "@/game/progress";

export interface ScoreCardData {
  score: number;
  wave: number;
  kills: number;
  accuracy: number;
  bestCombo: number;
  time: number;
  tag: string;
  skin: number;
  rank: number | null;
  url: string;
}

const DISPLAY = '"Chakra Petch", "Arial Black", sans-serif';
const MONO = '"IBM Plex Mono", monospace';

function shipPath(ctx: CanvasRenderingContext2D, skin: number) {
  const paths: [number, number][][] = [
    [
      [0, -18],
      [12, 9],
      [4, 5],
      [0, 8],
      [-4, 5],
      [-12, 9],
    ],
    [
      [0, -18],
      [8, -6],
      [14, 8],
      [0, 3],
      [-14, 8],
      [-8, -6],
    ],
    [
      [0, -17],
      [5, -4],
      [14, 0],
      [6, 2],
      [0, 11],
      [-6, 2],
      [-14, 0],
      [-5, -4],
    ],
    [
      [0, -18],
      [11, -10],
      [8, 10],
      [0, 4],
      [-8, 10],
      [-11, -10],
    ],
  ];
  const pts = paths[skin % paths.length]!;
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
}

/** Draws a 1200x630 shareable score card and returns it as a PNG blob. */
export async function renderScoreCard(data: ScoreCardData): Promise<Blob | null> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await document.fonts.ready;
  } catch {
    /* fonts optional */
  }

  const ship = shipById(data.skin);
  const ember = "#ff7a1a";

  // ---- background: deep ink + warm horizon glow
  ctx.fillStyle = "#0a0908";
  ctx.fillRect(0, 0, W, H);
  const horizon = ctx.createRadialGradient(W * 0.72, H * 1.05, 40, W * 0.72, H * 1.05, 620);
  horizon.addColorStop(0, "rgba(255,122,26,0.42)");
  horizon.addColorStop(0.5, "rgba(255,61,0,0.13)");
  horizon.addColorStop(1, "rgba(255,61,0,0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, W, H);

  // ---- technical grid
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // ---- diagonal hazard stripe block behind the ship
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(760, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, H);
  ctx.lineTo(640, H);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(255,122,26,0.07)";
  ctx.fillRect(600, 0, W - 600, H);
  ctx.strokeStyle = "rgba(255,122,26,0.16)";
  ctx.lineWidth = 10;
  for (let i = -H; i < W; i += 42) {
    ctx.beginPath();
    ctx.moveTo(i, H);
    ctx.lineTo(i + H, 0);
    ctx.stroke();
  }

  // ship silhouette
  ctx.translate(960, 300);
  ctx.scale(7.5, 7.5);
  ctx.shadowColor = ship.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = ship.color;
  shipPath(ctx, data.skin);
  ctx.fill();
  ctx.restore();

  // ---- wordmark
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f7f3ee";
  ctx.font = `700 34px ${DISPLAY}`;
  ctx.fillText("NOVA", 80, 96);
  ctx.fillStyle = ember;
  ctx.fillText("BLASTER", 190, 96);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = `400 15px ${MONO}`;
  ctx.fillText("ENDLESS  //  SECTOR 09", 80, 124);

  // ---- pilot line
  ctx.strokeStyle = "rgba(255,122,26,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 152);
  ctx.lineTo(700, 152);
  ctx.stroke();

  ctx.fillStyle = ember;
  ctx.font = `400 19px ${MONO}`;
  ctx.fillText(`PILOT ${data.tag || "???"}`, 80, 192);
  if (data.rank) {
    ctx.fillStyle = "#ffd166";
    ctx.fillText(`GLOBAL RANK #${data.rank}`, 300, 192);
  }

  // ---- hero score
  ctx.fillStyle = "#f7f3ee";
  ctx.font = `700 152px ${DISPLAY}`;
  const scoreText = data.score.toLocaleString();
  ctx.shadowColor = "rgba(255,122,26,0.45)";
  ctx.shadowBlur = 40;
  ctx.fillText(scoreText, 76, 340);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = `400 17px ${MONO}`;
  ctx.fillText("POINTS", 82, 372);

  // ---- stat strip
  const mins = Math.floor(data.time / 60);
  const secs = Math.floor(data.time % 60)
    .toString()
    .padStart(2, "0");
  const stats: [string, string][] = [
    ["WAVE", String(data.wave)],
    ["KILLS", String(data.kills)],
    ["ACCURACY", `${data.accuracy}%`],
    ["BEST COMBO", `${data.bestCombo}x`],
    ["TIME", `${mins}:${secs}`],
  ];
  let sx = 80;
  for (const [label, value] of stats) {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(sx, 404, 108, 76);
    ctx.strokeStyle = "rgba(255,122,26,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, 404.5, 107, 75);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `400 11px ${MONO}`;
    ctx.fillText(label, sx + 12, 428);
    ctx.fillStyle = "#f7f3ee";
    ctx.font = `700 30px ${DISPLAY}`;
    ctx.fillText(value, sx + 12, 464);
    sx += 118;
  }

  // ---- CTA
  ctx.fillStyle = ember;
  ctx.fillRect(80, 524, 300, 52);
  ctx.fillStyle = "#0a0908";
  ctx.font = `700 22px ${DISPLAY}`;
  ctx.fillText("BEAT MY SCORE →", 100, 558);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `400 19px ${MONO}`;
  ctx.fillText(data.url.replace(/^https?:\/\//, ""), 400, 558);

  // ---- scanlines + frame
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.strokeStyle = "rgba(255,122,26,0.55)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function shareText(data: { score: number; wave: number }): string {
  return `I scored ${data.score.toLocaleString()} and reached wave ${data.wave} in NOVA BLASTER. Think you can beat it?`;
}
