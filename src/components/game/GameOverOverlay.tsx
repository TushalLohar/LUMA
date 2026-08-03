import { useState } from "react";
import { toast } from "sonner";
import { ShipMark } from "@/components/game/ShipMark";
import { shipById } from "@/game/progress";
import { renderScoreCard, shareText } from "@/game/scoreCard";

export interface RunSummary {
  score: number;
  wave: number;
  kills: number;
  accuracy: number;
  bestCombo: number;
  time: number;
  mode: "classic";
  skin: number;
  isPersonalBest: boolean;
}

export function GameOverOverlay({
  run,
  onPlayAgain,
  onMenu,
}: {
  run: RunSummary;
  onPlayAgain: () => void;
  onMenu: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const ship = shipById(run.skin);

  const handleShare = async () => {
    setSharing(true);
    try {
      const url = window.location.origin;
      const text = shareText(run);
      const blob = await renderScoreCard({
        score: Math.round(run.score),
        wave: run.wave,
        kills: run.kills,
        accuracy: run.accuracy,
        bestCombo: run.bestCombo,
        time: run.time,
        tag: "PLT",
        skin: run.skin,
        rank: null,
        url,
      });
      const file = blob ? new File([blob], "nova-blaster-score.png", { type: "image/png" }) : null;

      if (file && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, url });
          return;
        } catch {
          /* user cancelled */
        }
      }
      if (blob) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "nova-blaster-score.png";
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Score card saved — share it anywhere.");
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Score copied to clipboard.");
    } finally {
      setSharing(false);
    }
  };

  const mins = Math.floor(run.time / 60);
  const secs = Math.floor(run.time % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex justify-center overflow-y-auto bg-black/80 backdrop-blur-[3px]">
      <div className="w-full max-w-[440px] px-5 py-8">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] tracking-[0.4em] text-arcade-pink">RUN TERMINATED</p>
          <ShipMark skin={run.skin} className="h-5 w-5" />
        </div>

        <p className="mt-3 font-display text-6xl leading-none font-bold tabular-nums text-foreground">
          {Math.round(run.score).toLocaleString()}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.25em] text-foreground/50">
            {ship.name} · WAVE {run.wave}
          </span>
          {run.isPersonalBest && (
            <span className="border border-arcade-gold/60 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] text-arcade-gold">
              NEW BEST
            </span>
          )}
        </div>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-arcade-pink via-arcade/30 to-transparent" />

        <dl className="mt-4 grid grid-cols-4 gap-px bg-arcade-border/40">
          {[
            ["TIME", `${mins}:${secs}`],
            ["KILLS", String(run.kills)],
            ["ACC", `${run.accuracy}%`],
            ["COMBO", `${run.bestCombo}x`],
          ].map(([label, value]) => (
            <div key={label} className="bg-arcade-surface px-2 py-2.5 text-center">
              <dt className="font-mono text-[9px] tracking-[0.15em] text-foreground/45">{label}</dt>
              <dd className="font-display text-lg font-bold tabular-nums text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <button
          onClick={onPlayAgain}
          className="mt-4 flex w-full items-center justify-between border border-arcade/60 bg-arcade px-5 py-4 transition hover:bg-arcade-glow"
        >
          <span className="font-display text-xl font-bold tracking-[0.15em] text-black uppercase">
            Run it again
          </span>
          <span className="font-mono text-[10px] tracking-[0.25em] text-black/70">ENTER</span>
        </button>
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 border border-arcade-border bg-arcade-surface px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] text-arcade transition hover:border-arcade/60"
          >
            {sharing ? "RENDERING…" : "SHARE SCORE CARD"}
          </button>
          <button
            onClick={onMenu}
            className="flex-1 border border-arcade-border bg-arcade-surface px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/70 transition hover:border-arcade/60"
          >
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
