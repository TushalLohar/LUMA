import type { Progress } from "@/game/progress";

export function MenuOverlay({
  progress,
  onPlay,
  onHowToPlay,
}: {
  progress: Progress;
  onPlay: () => void;
  onHowToPlay: () => void;
}) {
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
          One ship. Endless waves. Chain kills for a combo multiplier and push your best run further.
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

        <button
          onClick={onHowToPlay}
          className="mt-2 w-full border border-arcade-border bg-arcade-surface px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/80 transition hover:border-arcade/60"
        >
          HOW TO PLAY
        </button>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-arcade-border/40 border border-arcade-border bg-arcade-surface">
          {[
            ["RUNS", progress.runs.toLocaleString()],
            ["BEST", progress.bestScore.toLocaleString()],
            ["KILLS", progress.kills.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-2.5">
              <dt className="font-mono text-[9px] tracking-[0.2em] text-foreground/45">{label}</dt>
              <dd className="font-display text-base font-bold tabular-nums text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
