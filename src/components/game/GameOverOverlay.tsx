import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { submitScore } from "@/lib/leaderboard.functions";
import { submitScoreSchema } from "@/lib/leaderboard-schema";
import { loadTag, saveTag } from "@/game/progress";
import { renderScoreCard, shareText } from "@/game/scoreCard";

export interface RunSummary {
  score: number;
  wave: number;
  kills: number;
  accuracy: number;
  bestCombo: number;
  time: number;
  mode: "classic" | "daily";
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
  const submit = useServerFn(submitScore);
  const queryClient = useQueryClient();

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
      mode: run.mode,
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
    const url = window.location.origin;
    const text = shareText(run);
    const blob = await renderScoreCard({ ...run, tag: tag || "???", url });
    const file = blob ? new File([blob], "nova-blaster-score.png", { type: "image/png" }) : null;

    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
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
  };

  const mins = Math.floor(run.time / 60);
  const secs = Math.floor(run.time % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex justify-center overflow-y-auto">
      <div className="w-full max-w-[420px] px-4 py-8 font-mono">
        <h2 className="text-center text-3xl font-bold tracking-widest text-arcade-pink">
          GAME OVER
        </h2>
        <p className="mt-1 text-center text-[10px] tracking-[0.25em] text-arcade/70">
          {run.mode === "daily" ? "DAILY CHALLENGE" : "ENDLESS RUN"}
        </p>
        <p className="mt-3 text-center text-5xl font-bold tabular-nums text-foreground">
          {Math.round(run.score).toLocaleString()}
        </p>
        {run.isPersonalBest && (
          <p className="mt-1 text-center text-xs tracking-[0.2em] text-arcade-gold">
            ★ NEW PERSONAL BEST ★
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-arcade-border bg-arcade-surface p-3 text-xs">
          {[
            ["WAVE", String(run.wave)],
            ["TIME", `${mins}:${secs}`],
            ["KILLS", String(run.kills)],
            ["ACCURACY", `${run.accuracy}%`],
            ["BEST COMBO", `${run.bestCombo}x`],
            ["MODE", run.mode === "daily" ? "DAILY" : "ENDLESS"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-arcade/70">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded-lg border border-arcade-border bg-arcade-surface p-3">
          {rank ? (
            <p className="text-center text-sm text-arcade">
              RANKED #{rank.rank}{" "}
              <span className="text-foreground/60">of {rank.total.toLocaleString()}</span>
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor="pilot-tag"
                  className="mb-1 block text-[10px] tracking-[0.2em] text-arcade/70"
                >
                  PILOT TAG
                </label>
                <Input
                  id="pilot-tag"
                  value={tag}
                  maxLength={3}
                  placeholder="AAA"
                  onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="h-10 border-arcade-border bg-black/40 text-center font-mono text-lg tracking-[0.4em] text-foreground"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={saving || tag.length !== 3}
                className="h-10 tracking-widest"
              >
                {saving ? "…" : "SUBMIT"}
              </Button>
            </div>
          )}
          <div className="mt-3 border-t border-arcade-border/50 pt-3">
            <p className="mb-2 text-center text-[10px] tracking-[0.2em] text-arcade/70">
              {run.mode === "daily" ? "TODAY'S TOP PILOTS" : "ALL-TIME TOP PILOTS"}
            </p>
            <LeaderboardTable mode={run.mode} limit={5} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="lg"
            onClick={onPlayAgain}
            className="h-12 w-full text-base font-bold tracking-[0.2em]"
          >
            PLAY AGAIN
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 border-arcade-border bg-arcade-surface text-xs tracking-widest text-arcade hover:bg-arcade-surface"
            >
              SHARE SCORE
            </Button>
            <Button
              variant="outline"
              onClick={onMenu}
              className="flex-1 border-arcade-border bg-arcade-surface text-xs tracking-widest text-foreground/80 hover:bg-arcade-surface"
            >
              MENU
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
