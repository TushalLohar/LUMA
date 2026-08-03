import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { SHIPS, type Progress } from "@/game/progress";
import { dailyKey } from "@/lib/leaderboard-schema";
import { cn } from "@/lib/utils";

export function MenuOverlay({
  progress,
  skin,
  onSelectSkin,
  onPlay,
  onHowToPlay,
}: {
  progress: Progress;
  skin: number;
  onSelectSkin: (id: number) => void;
  onPlay: (mode: "classic" | "daily") => void;
  onHowToPlay: () => void;
}) {
  const [board, setBoard] = useState<"classic" | "daily">("classic");

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex justify-center overflow-y-auto">
      <div className="pointer-events-auto mt-[42vh] w-full max-w-[420px] px-4 pb-8 font-mono">
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={() => onPlay("classic")}
            className="h-12 w-full text-base font-bold tracking-[0.2em]"
          >
            PLAY ENDLESS
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onPlay("daily")}
            className="h-11 w-full border-arcade-border bg-arcade-surface text-sm tracking-[0.15em] text-arcade hover:bg-arcade-surface"
          >
            DAILY CHALLENGE · {dailyKey().slice(5)}
          </Button>
          <button
            onClick={onHowToPlay}
            className="mx-auto mt-1 text-[11px] tracking-widest text-arcade/70 underline-offset-4 hover:underline"
          >
            HOW TO PLAY
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-arcade-border bg-arcade-surface p-3">
          <p className="mb-2 text-center text-[10px] tracking-[0.2em] text-arcade/70">SHIP</p>
          <div className="flex justify-center gap-2">
            {SHIPS.map((ship) => {
              const locked = progress.kills < ship.unlockAt;
              return (
                <button
                  key={ship.id}
                  disabled={locked}
                  onClick={() => onSelectSkin(ship.id)}
                  title={locked ? `${ship.unlockAt} lifetime kills to unlock` : ship.name}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-md border text-[10px] transition",
                    skin === ship.id ? "border-arcade" : "border-arcade-border/50",
                    locked && "opacity-35",
                  )}
                  style={{ color: ship.color }}
                >
                  {locked ? `${ship.unlockAt}` : "▲"}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[10px] text-foreground/60">
            RUNS {progress.runs} · BEST {progress.bestScore.toLocaleString()} · KILLS{" "}
            {progress.kills}
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-arcade-border bg-arcade-surface p-3">
          <div className="mb-2 flex justify-center gap-2 text-[10px] tracking-[0.2em]">
            {(["classic", "daily"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setBoard(m)}
                className={cn(
                  "rounded px-2 py-1",
                  board === m ? "bg-arcade/20 text-arcade" : "text-foreground/50",
                )}
              >
                {m === "classic" ? "ALL TIME" : "TODAY"}
              </button>
            ))}
          </div>
          <LeaderboardTable mode={board} limit={5} />
        </div>
      </div>
    </div>
  );
}
