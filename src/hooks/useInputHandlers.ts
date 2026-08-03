import { useCallback, useEffect } from 'react';
import { CANVAS_W, CANVAS_H, KEYS, UI } from '@/game/constants';
import { initAudio, toggleMute } from '@/game/audio';
import { resetGame } from '@/game/engine';
import type { GameData, InputState } from '@/game/types';

function getCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const pixelX = (clientX - rect.left) * scaleX;
  const pixelY = (clientY - rect.top) * scaleY;

  const gameScaleX = canvas.width / CANVAS_W;
  const gameScaleY = canvas.height / CANVAS_H;
  const scale = Math.min(gameScaleX, gameScaleY);
  const offsetX = (canvas.width - CANVAS_W * scale) / 2;
  const offsetY = (canvas.height - CANVAS_H * scale) / 2;

  return {
    x: (pixelX - offsetX) / scale,
    y: (pixelY - offsetY) / scale,
  };
}

function isKey(key: string, codes: readonly string[]): boolean {
  return codes.includes(key);
}

export function useInputHandlers(
  gameRef: React.MutableRefObject<GameData>,
  inputRef: React.MutableRefObject<InputState>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const getCanvasCoordsRef = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return getCanvasCoords(canvas, clientX, clientY);
    },
    [canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const keyDown = (e: KeyboardEvent) => {
      const input = inputRef.current;
      const game = gameRef.current;

      if (isKey(e.code, KEYS.left)) { input.left = true; e.preventDefault(); }
      else if (isKey(e.code, KEYS.right)) { input.right = true; e.preventDefault(); }
      else if (isKey(e.code, KEYS.up)) { input.up = true; e.preventDefault(); }
      else if (isKey(e.code, KEYS.down)) { input.down = true; e.preventDefault(); }
      else if (isKey(e.code, KEYS.fire)) { input.fire = true; e.preventDefault(); }
      else if (isKey(e.code, KEYS.mute)) { toggleMute(); e.preventDefault(); }
      else if (isKey(e.code, KEYS.pause)) {
        if (game.state === 'playing') game.state = 'paused';
        else if (game.state === 'paused') game.state = 'playing';
        e.preventDefault();
      } else if (isKey(e.code, KEYS.start)) {
        if (game.state === 'menu' || game.state === 'gameover') {
          initAudio();
          resetGame(game);
        } else if (game.state === 'paused') {
          game.state = 'playing';
        }
        e.preventDefault();
      }
    };

    const keyUp = (e: KeyboardEvent) => {
      const input = inputRef.current;
      if (isKey(e.code, KEYS.left)) input.left = false;
      else if (isKey(e.code, KEYS.right)) input.right = false;
      else if (isKey(e.code, KEYS.up)) input.up = false;
      else if (isKey(e.code, KEYS.down)) input.down = false;
      else if (isKey(e.code, KEYS.fire)) input.fire = false;
    };

    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      const game = gameRef.current;
      const input = inputRef.current;
      const touch = e.touches[0];
      if (!touch) return;
      const coords = getCanvasCoordsRef(touch.clientX, touch.clientY);

      // Sound toggle zone (top area, left of pause) — works in every state
      if (
        coords.y < UI.topZoneY &&
        coords.x > UI.soundButtonXMin &&
        coords.x <= UI.soundButtonXMax
      ) {
        initAudio();
        toggleMute();
        return;
      }

      if (game.state === 'menu' || game.state === 'gameover') {
        initAudio();
        resetGame(game);
        return;
      }
      if (game.state === 'paused') {
        game.state = 'playing';
        return;
      }

      // Pause button zone (top-right corner)
      if (coords.x > UI.pauseButtonX && coords.y < UI.topZoneY) {
        game.state = 'paused';
        return;
      }

      input.touchX = coords.x;
      input.touchY = coords.y;
      input.touchActive = true;
    };

    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      const touch = e.touches[0];
      if (!touch) return;
      const coords = getCanvasCoordsRef(touch.clientX, touch.clientY);
      input.touchX = coords.x;
      input.touchY = coords.y;
    };

    const touchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      input.touchActive = false;
      input.touchX = null;
      input.touchY = null;
    };

    const mouseDown = () => {
      const game = gameRef.current;
      if (game.state === 'menu' || game.state === 'gameover') {
        initAudio();
        resetGame(game);
      } else if (game.state === 'paused') {
        game.state = 'playing';
      }
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvas.addEventListener('touchstart', touchStart, { passive: false });
    canvas.addEventListener('touchmove', touchMove, { passive: false });
    canvas.addEventListener('touchend', touchEnd, { passive: false });
    canvas.addEventListener('mousedown', mouseDown);

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchmove', touchMove);
      canvas.removeEventListener('touchend', touchEnd);
      canvas.removeEventListener('mousedown', mouseDown);
    };
  }, [canvasRef, gameRef, inputRef, getCanvasCoordsRef]);
}
