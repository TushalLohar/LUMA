import { useRef } from 'react';
import { createGameData } from './game/engine';
import type { GameData, InputState } from './game/types';
import { useCanvas } from './hooks/useCanvas';
import { useInputHandlers } from './hooks/useInputHandlers';
import { useGameLoop } from './hooks/useGameLoop';

export default function App() {
  const canvasRef = useCanvas();
  const gameRef = useRef<GameData>(createGameData());
  const inputRef = useRef<InputState>({
    left: false, right: false, up: false, down: false,
    fire: false, pause: false,
    touchX: null, touchY: null, touchActive: false, touchFire: false,
  });

  useInputHandlers(gameRef, inputRef, canvasRef);
  useGameLoop(gameRef, inputRef, canvasRef);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
