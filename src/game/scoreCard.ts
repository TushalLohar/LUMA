import { CANVAS_W } from "@/game/constants";
import { shipById } from "@/game/progress";

export interface ScoreCardData {
  score: number;
  wave: number;
  kills: number;
  accuracy: number;
  bestCombo: number;
  mode: "classic" | "daily";
  tag: string;
  skin: number;
  url: string;
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

  const ship = shipById(data.skin);

  ctx.fillStyle = "#070712";
  ctx.fillRect(0, 0, W, H);

  // nebula wash
  const blobs: [number, number, number, string][] = [
    [200, 160, 380, "58,10,90"],
    [980, 460, 420, "6,52,96"],
    [640, 120, 300, "8,60,80"],
  ];
  for (const [x, y, r, col] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},0.55)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // stars
  for (let i = 0; i < 160; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.6;
    ctx.fillStyle = "#fff";
    const s = Math.random() * 2 + 0.5;
    ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 44px monospace";
  ctx.fillText("NOVA", 80, 120);
  ctx.fillStyle = ship.color;
  ctx.fillText("BLASTER", 210, 120);

  ctx.fillStyle = ship.color;
  ctx.font = "bold 20px monospace";
  ctx.fillText(data.mode === "daily" ? "DAILY CHALLENGE" : "ENDLESS RUN", 80, 158);

  ctx.fillStyle = "#8ad9ff";
  ctx.font = "22px monospace";
  ctx.fillText(`PILOT ${data.tag || "???"}`, 80, 250);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 130px monospace";
  ctx.fillText(data.score.toLocaleString(), 80, 370);

  ctx.font = "24px monospace";
  ctx.fillStyle = "#9ee8ff";
  ctx.fillText(
    `WAVE ${data.wave}   KILLS ${data.kills}   ACC ${data.accuracy}%   COMBO ${data.bestCombo}x`,
    80,
    424,
  );

  // ship mark
  ctx.save();
  ctx.translate(1010, 300);
  ctx.scale(4.2, 4.2);
  ctx.fillStyle = ship.color;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-16, 18);
  ctx.lineTo(-8, 12);
  ctx.lineTo(0, 14);
  ctx.lineTo(8, 12);
  ctx.lineTo(16, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ffc107";
  ctx.font = "bold 26px monospace";
  ctx.fillText("Beat my score →", 80, 540);
  ctx.fillStyle = "#fff";
  ctx.font = "24px monospace";
  ctx.fillText(data.url.replace(/^https?:\/\//, ""), 80, 578);

  ctx.strokeStyle = ship.color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, W - 6, H - 6);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function shareText(data: Pick<ScoreCardData, "score" | "wave" | "mode">): string {
  const label = data.mode === "daily" ? "today's NOVA BLASTER daily challenge" : "NOVA BLASTER";
  return `I scored ${data.score.toLocaleString()} and reached wave ${data.wave} in ${label}. Can you beat it?`;
}

export const CARD_ASPECT = 1200 / 630;
export const GAME_WIDTH = CANVAS_W;
