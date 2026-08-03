import { useEffect, useState } from "react";
import { initAudio, isMuted, toggleMute } from "@/game/audio";
import { cn } from "@/lib/utils";

/** Mouse/touch-friendly chrome for the running game: sound + pause controls. */
export function GameHud({
  paused,
  onPause,
  onResume,
  onRestart,
  onMenu,
}: {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isMuted());
  }, []);

  const handleMute = () => {
    initAudio();
    toggleMute();
    setMuted(isMuted());
  };

  return (
    <>
      <div className="absolute top-3 right-3 z-30 flex gap-2">
        <HudButton label={muted ? "Unmute sound" : "Mute sound"} onClick={handleMute}>
          {muted ? "MUTED" : "SOUND"}
        </HudButton>
        <HudButton label={paused ? "Resume game" : "Pause game"} onClick={paused ? onResume : onPause}>
          {paused ? "RESUME" : "PAUSE"}
        </HudButton>
      </div>

      {paused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-[3px]">
          <div className="w-full max-w-[300px] px-5">
            <p className="font-mono text-[10px] tracking-[0.4em] text-arcade/70">SYSTEMS HOLD</p>
            <h2 className="mt-1 font-display text-4xl font-bold tracking-tight text-foreground uppercase">
              Paused
            </h2>
            <div className="mt-3 h-px w-full bg-gradient-to-r from-arcade via-arcade/30 to-transparent" />
            <button
              onClick={onResume}
              className="mt-5 w-full border border-arcade/60 bg-arcade px-4 py-3 font-display text-lg font-bold tracking-[0.15em] text-black uppercase transition hover:bg-arcade-glow"
            >
              Resume
            </button>
            <button
              onClick={onRestart}
              className="mt-2 w-full border border-arcade-border bg-arcade-surface px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/80 transition hover:border-arcade/60"
            >
              RESTART RUN
            </button>
            <button
              onClick={onMenu}
              className="mt-2 w-full border border-arcade-border bg-arcade-surface px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-foreground/60 transition hover:border-arcade/60"
            >
              QUIT TO MENU
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function HudButton({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "border border-arcade-border bg-arcade-surface px-3 py-1.5 font-mono text-[9px] tracking-[0.2em] text-foreground/70 transition hover:border-arcade/60 hover:text-arcade",
        className,
      )}
    >
      {children}
    </button>
  );
}
