import { KEYS_HELP } from "@/components/game/help-content";

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-sm border border-arcade-border bg-arcade-surface p-5">
        <p className="font-mono text-[10px] tracking-[0.4em] text-arcade/70">FLIGHT MANUAL</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground uppercase">
          How to play
        </h2>
        <div className="mt-3 mb-4 h-px w-full bg-gradient-to-r from-arcade via-arcade/30 to-transparent" />
        <dl className="space-y-2 font-mono text-[11px] text-foreground/85">
          {KEYS_HELP.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-24 shrink-0 tracking-[0.15em] text-arcade/80">{row.label}</dt>
              <dd className="text-foreground/70">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-arcade-border/50 pt-3 font-mono text-[11px] leading-relaxed text-foreground/60">
          Chain kills fast to build a combo multiplier — every kill inside the combo window is worth
          more. Grab drops for spread shot, rapid fire, shields, homing missiles and screen-clearing
          bombs. A boss shows up every 5 waves.
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full border border-arcade/60 bg-arcade px-4 py-3 font-display text-lg font-bold tracking-[0.15em] text-black uppercase transition hover:bg-arcade-glow"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
