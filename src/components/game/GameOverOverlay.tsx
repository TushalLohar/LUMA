import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ShipMark } from "@/components/game/ShipMark";
import { submitScore } from "@/lib/leaderboard.functions";
import { submitScoreSchema } from "@/lib/leaderboard-schema";
import { loadTag, saveTag, shipById } from "@/game/progress";
import { renderScoreCard, shareText } from "@/game/scoreCard";
import { cn } from "@/lib/utils";

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
  const [tag, setTag] = useState(loadTag());
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const submit = useServerFn(submitScore);
  const queryClient = useQueryClient();
  const ship = shipById(run.skin);

  useEffect(() => {
    setRank(null);
  }, [run]);

  const handleSubmit = async () => {
    const parsed = submitScoreSchema.safeParse({
      tag,
      score: Math.round(run.score),
      wave: run.wave,
      kills: run.kills,
      accuracy: run.accuracy,
      bestCombo: run.bestCombo,
    });
    if (!parsed.success) {
      toast.error("Enter a 3-character pilot tag (A-Z, 0-9).");
      return;
    }
    setSaving(true);
    try {
      const result = await submit({ data: parsed.data });
      saveTag(parsed.data.tag);
      setRank(result);
      await queryClient.invalidateQueries({ queryKey: ["scores"] });
      toast.success(`Ranked #${result.rank} of ${result.total}`);
    } catch {
      toast.error("Could not save your score. Try again.");
    } finally {
      setSaving(false);
    }
  };

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
        tag: tag || "???",
        skin: run.skin,
        rank: rank?.rank ?? null,
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

        <div className="mt-4 border border-arcade-border bg-arcade-surface p-3">
          {run.score <= 0 ? (
            <p className="text-center font-mono text-[11px] text-foreground/55">
              Score at least 1 point to join the board.
            </p>
          ) : rank ? (
            <p className="text-center font-mono text-xs tracking-[0.2em] text-arcade">
              RANKED #{rank.rank}{" "}
              <span className="text-foreground/50">OF {rank.total.toLocaleString()}</span>
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor="pilot-tag"
                  className="mb-1 block font-mono text-[9px] tracking-[0.25em] text-arcade/70"
                >
                  PILOT TAG
                </label>
                <input
                  id="pilot-tag"
                  value={tag}
                  maxLength={3}
                  placeholder="AAA"
                  onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="h-10 w-full border border-arcade-border bg-black/50 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none focus:border-arcade"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving || tag.length !== 3}
                className={cn(
                  "h-10 border border-arcade/60 bg-arcade px-4 font-mono text-[11px] tracking-[0.2em] text-black transition hover:bg-arcade-glow",
                  (saving || tag.length !== 3) && "opacity-40",
                )}
              >
                {saving ? "…" : "SUBMIT"}
              </button>
            </div>
          )}

          <div className="mt-3 border-t border-arcade-border/40 pt-3">
            <p className="mb-1 font-mono text-[9px] tracking-[0.3em] text-arcade/70">TOP PILOTS</p>
            <LeaderboardTable limit={5} />
          </div>
        </div>

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
