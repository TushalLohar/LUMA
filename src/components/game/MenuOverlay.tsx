import { useState } from "react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { SHIPS, type Progress } from "@/game/progress";
import { ShipMark } from "@/components/game/ShipMark";
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
  onPlay: () => void;
  onHowToPlay: () => void;
}) {
  const [showBoard, setShowBoard] = useState(false);

  return (
    <div className="absolute inset-0 z-20 flex justify-center overflow-y-auto bg-gradient-to-b from-black/80 via-black/55 to-black/90 backdrop-blur-[2px]">
      <div className="w-full max-w-[440px] px-5 py-10">
        <p className="font-mono text-[10px] tracking-[0.45em] text-arcade/70">SECTOR 09 // LIVE</p>
        <h2 className="mt-2 font-display text-[3.25rem] leading-[0.85] font-bold tracking-tight text-foreground uppercase">
          Nova
          <br />
          <span className="text-arcade">Blaster</span>
        </h2>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-arcade via-arcade/30 to-transparent" />
        <p className="mt-3 max-w-[22rem] font-mono text-[11px] leading-relaxed tracking-wide text-foreground/60">
          One ship. Endless waves. Chain kills for a combo multiplier and get your tag on the board.
        </p>

        <button
          onClick={onPlay}
          className="group mt-6 flex w-full items-center justify-between border border-arcade/60 bg-arcade px-5 py-4 text-left transition hover:bg-arcade-glow"
        >
          <span className="font-display text-xl font-bold tracking-[0.15em] text-black uppercase">
            Launch
          </span>
          <span className="font-mono text-[10px] tracking-[0.25em] text-black/70">ENTER</span>
        </button>

        <div className="mt-2 flex gap-2">
          <button
            onClick={onHowToPlay}
            className="flex-1 border border-arcade-border bg-arcade-surface px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/80 transition hover:border-arcade/60"
          >
            HOW TO PLAY
          </button>
          <button
            onClick={() => setShowBoard((v) => !v)}
            className="flex-1 border border-arcade-border bg-arcade-surface px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/80 transition hover:border-arcade/60"
          >
            {showBoard ? "HIDE BOARD" : "LEADERBOARD"}
          </button>
        </div>

        <div className="mt-5 border border-arcade-border bg-arcade-surface">
          <div className="flex items-center justify-between border-b border-arcade-border/60 px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.3em] text-arcade/70">HANGAR</span>
            <span className="font-mono text-[10px] text-foreground/50">
              {SHIPS.filter((s) => progress.kills >= s.unlockAt).length}/{SHIPS.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-px bg-arcade-border/40">
            {SHIPS.map((ship) => {
              const locked = progress.kills < ship.unlockAt;
              const active = skin === ship.id;
              return (
                <button
                  key={ship.id}
                  disabled={locked}
                  onClick={() => onSelectSkin(ship.id)}
                  title={locked ? `${ship.unlockAt} lifetime kills to unlock` : ship.name}
                  className={cn(
                    "flex flex-col items-center gap-1 bg-black/60 px-1 py-3 transition",
                    active && "bg-arcade/15",
                    locked && "opacity-40",
                  )}
                >
                  <ShipMark
                    skin={ship.id}
                    color={locked ? "#6b6b6b" : ship.color}
                    className="h-7 w-7"
                  />
                  <span
                    className={cn(
                      "font-mono text-[8px] tracking-[0.1em]",
                      active ? "text-arcade" : "text-foreground/50",
                    )}
                  >
                    {locked ? `${ship.unlockAt} K` : ship.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
          <dl className="grid grid-cols-3 divide-x divide-arcade-border/40 border-t border-arcade-border/60">
            {[
              ["RUNS", progress.runs.toLocaleString()],
              ["BEST", progress.bestScore.toLocaleString()],
              ["KILLS", progress.kills.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-2">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-foreground/45">
                  {label}
                </dt>
                <dd className="font-display text-base font-bold tabular-nums text-foreground">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {showBoard && (
          <div className="mt-3 border border-arcade-border bg-arcade-surface p-3">
            <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-arcade/70">TOP PILOTS</p>
            <LeaderboardTable limit={8} />
          </div>
        )}
      </div>
    </div>
  );
}
