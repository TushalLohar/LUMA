import { useCallback, useEffect, useRef, useState } from "react";
import { createGameData, resetGame } from "@/game/engine";
import type { GameData, InputState } from "@/game/types";
import { useCanvas } from "@/hooks/useCanvas";
import { useInputHandlers } from "@/hooks/useInputHandlers";
import { useGameLoop } from "@/hooks/useGameLoop";
import { initAudio } from "@/game/audio";
import {
  hasSeenHelp,
  loadProgress,
  loadSkin,
  markHelpSeen,
  saveSkin,
  type Progress,
} from "@/game/progress";
import { MenuOverlay } from "@/components/game/MenuOverlay";
import { GameOverOverlay, type RunSummary } from "@/components/game/GameOverOverlay";
import { HowToPlay } from "@/components/game/HowToPlay";
import { GameHud } from "@/components/game/GameHud";

export default function NovaBlaster() {
  const canvasRef = useCanvas();
  const gameRef = useRef<GameData>(createGameData());
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    pause: false,
    touchX: null,
    touchY: null,
    touchActive: false,
    touchFire: false,
  });

  const [screen, setScreen] = useState<"menu" | "playing" | "paused" | "gameover">("menu");
  const [progress, setProgress] = useState<Progress>({
    runs: 0,
    kills: 0,
    bestScore: 0,
    bestWave: 0,
    totalTime: 0,
  });
  const [skin, setSkin] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [run, setRun] = useState<RunSummary | null>(null);
  const bestAtStart = useRef(0);

  useInputHandlers(gameRef, inputRef, canvasRef);
  useGameLoop(gameRef, inputRef, canvasRef);

  // Hydrate local progression on the client only.
  useEffect(() => {
    setProgress(loadProgress());
    setSkin(loadSkin());
    if (!hasSeenHelp()) setShowHelp(true);
    document.documentElement.classList.add("arcade-locked");
    return () => document.documentElement.classList.remove("arcade-locked");
  }, []);

  const buildSummary = useCallback((game: GameData): RunSummary => {
    const acc =
      game.stats.shots > 0 ? Math.round((game.stats.hits / game.stats.shots) * 100) : 0;
    return {
      score: Math.round(game.score),
      wave: game.wave + 1,
      kills: game.stats.kills,
      accuracy: acc,
      bestCombo: game.stats.bestCombo,
      time: game.stats.time,
      mode: "classic",
      skin: game.skin,
      isPersonalBest: Math.round(game.score) > bestAtStart.current,
    };
  }, []);

  // Mirror the canvas game state into React so overlays can react to it.
  useEffect(() => {
    const id = window.setInterval(() => {
      const game = gameRef.current;
      const next =
        game.state === "gameover"
          ? "gameover"
          : game.state === "menu"
            ? "menu"
            : game.state === "paused"
              ? "paused"
              : "playing";
      setScreen((prev) => {
        if (prev === next) return prev;
        if (next === "gameover") {
          setRun(buildSummary(game));
          setProgress(loadProgress());
        }
        return next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [buildSummary]);

  const play = useCallback(() => {
    initAudio();
    bestAtStart.current = loadProgress().bestScore;
    resetGame(gameRef.current, "classic");
    setScreen("playing");
  }, []);

  const closeHelp = useCallback(() => {
    markHelpSeen();
    setShowHelp(false);
  }, []);

  const selectSkin = useCallback((id: number) => {
    saveSkin(id);
    setSkin(id);
    gameRef.current.skin = id;
  }, []);

  const goMenu = useCallback(() => {
    gameRef.current.state = "menu";
    setScreen("menu");
    setProgress(loadProgress());
  }, []);

  return (
    <div className="dark fixed inset-0 overflow-hidden bg-background select-none touch-none">
      <h1 className="sr-only">NOVA BLASTER — free arcade space shooter</h1>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />

      {(screen === "playing" || screen === "paused") && (
        <GameHud
          paused={screen === "paused"}
          onPause={() => {
            gameRef.current.state = "paused";
            setScreen("paused");
          }}
          onResume={() => {
            gameRef.current.state = "playing";
            setScreen("playing");
          }}
          onRestart={play}
          onMenu={goMenu}
        />
      )}

      {screen === "menu" && !showHelp && (
        <MenuOverlay
          progress={progress}
          onPlay={play}
          onHowToPlay={() => setShowHelp(true)}
        />
      )}


      {screen === "gameover" && run && (
        <GameOverOverlay run={run} onPlayAgain={play} onMenu={goMenu} />
      )}

      {showHelp && <HowToPlay onClose={closeHelp} />}
    </div>
  );
}
