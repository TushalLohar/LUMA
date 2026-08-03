import { useRef } from "react";
import { createGameData } from "@/game/engine";
import type { GameData, InputState } from "@/game/types";
import { useCanvas } from "@/hooks/useCanvas";
import { useInputHandlers } from "@/hooks/useInputHandlers";
import { useGameLoop } from "@/hooks/useGameLoop";

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

  useInputHandlers(gameRef, inputRef, canvasRef);
  useGameLoop(gameRef, inputRef, canvasRef);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none touch-none">
      <h1 className="sr-only">NOVA BLASTER — arcade space shooter</h1>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
