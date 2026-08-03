import { Button } from "@/components/ui/button";
import { KEYS_HELP } from "@/components/game/help-content";

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-xl border border-arcade-border bg-arcade-surface p-5 font-mono shadow-[0_0_40px_-8px_var(--arcade-glow)]">
        <h2 className="mb-4 text-center text-lg font-bold tracking-widest text-arcade">
          HOW TO PLAY
        </h2>
        <dl className="space-y-2 text-xs text-foreground/85">
          {KEYS_HELP.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-28 shrink-0 text-arcade/80">{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-arcade-border/50 pt-3 text-[11px] leading-relaxed text-foreground/70">
          Chain kills fast to build a combo multiplier — every kill inside the combo window is worth
          more. Grab drops for spread shot, rapid fire, shields, homing missiles and screen-clearing
          bombs. A boss shows up every 5 waves.
        </p>
        <Button onClick={onClose} className="mt-5 w-full font-mono tracking-widest" size="lg">
          GOT IT
        </Button>
      </div>
    </div>
  );
}
