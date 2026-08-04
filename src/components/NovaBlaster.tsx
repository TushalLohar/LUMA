import { useEffect, useRef, useCallback } from "react";
import {
  createGameData,
  resetGame,
  updateGame,
  saveTheme,
  CANVAS_W,
  CANVAS_H,
  LOGIC_HZ,
} from "@/game/engine";
import { renderGame } from "@/game/render";
import type { GameData, InputState } from "@/game/types";
import {
  sfxShoot,
  sfxExplosion,
  sfxPowerUp,
  sfxPlayerHit,
  sfxGameOver,
  sfxBoss,
  initAudio,
  toggleMute,
  startMusic,
  stopMusic,
  closeAudio,
} from "@/game/audio";

const STEP_MS = 1000 / LOGIC_HZ;

export default function NovaBlaster() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData>(createGameData());
  const rectRef = useRef<DOMRect | null>(null);
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
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const prevBulletCount = useRef(0);
  const prevKillCount = useRef(0);
  const prevPlayerHp = useRef(3);
  const prevPowerUpCount = useRef(0);
  const prevState = useRef<string>("menu");
  const prevBossWarning = useRef(0);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    if (!rectRef.current) rectRef.current = canvas.getBoundingClientRect();
    const rect = rectRef.current;
    const pixelX = (clientX - rect.left) * (canvas.width / rect.width);
    const pixelY = (clientY - rect.top) * (canvas.height / rect.height);
    const scale = Math.min(canvas.width / CANVAS_W, canvas.height / CANVAS_H);
    const offsetX = (canvas.width - CANVAS_W * scale) / 2;
    const offsetY = (canvas.height - CANVAS_H * scale) / 2;
    return { x: (pixelX - offsetX) / scale, y: (pixelY - offsetY) / scale };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const vv = window.visualViewport;
      const w = Math.round(vv?.width ?? window.innerWidth);
      const h = Math.round(vv?.height ?? window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      rectRef.current = canvas.getBoundingClientRect();
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    window.visualViewport?.addEventListener("resize", resize);

    const keyDown = (e: KeyboardEvent) => {
      const input = inputRef.current;
      const game = gameRef.current;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          input.left = true;
          e.preventDefault();
          break;
        case "ArrowRight":
        case "KeyD":
          input.right = true;
          e.preventDefault();
          break;
        case "ArrowUp":
        case "KeyW":
          input.up = true;
          e.preventDefault();
          break;
        case "ArrowDown":
        case "KeyS":
          input.down = true;
          e.preventDefault();
          break;
        case "Space":
          input.fire = true;
          e.preventDefault();
          break;
        case "KeyM":
          initAudio();
          toggleMute();
          e.preventDefault();
          break;
        case "Escape":
          if (game.state === "playing") game.state = "paused";
          else if (game.state === "paused") game.state = "playing";
          e.preventDefault();
          break;
        case "Enter":
          if (game.state === "menu" || game.state === "gameover") {
            initAudio();
            resetGame(game);
          } else if (game.state === "paused") {
            game.state = "playing";
          }
          e.preventDefault();
          break;
      }
    };

    const keyUp = (e: KeyboardEvent) => {
      const input = inputRef.current;
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          input.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          input.right = false;
          break;
        case "ArrowUp":
        case "KeyW":
          input.up = false;
          break;
        case "ArrowDown":
        case "KeyS":
          input.down = false;
          break;
        case "Space":
          input.fire = false;
          break;
      }
    };

    /** Shared hit-zone handling for both touch and mouse. Returns true if consumed. */
    const handlePointerDown = (x: number, y: number) => {
      const game = gameRef.current;

      // Theme selector pills hit testing on Menu & Pause screens
      const themeY = game.state === "menu" ? 360 : CANVAS_H / 2 + 30;
      if ((game.state === "menu" || game.state === "paused") && y >= themeY - 10 && y <= themeY + 45) {
        initAudio();
        if (x < CANVAS_W / 3) {
          game.theme = "spiderman";
          saveTheme("spiderman");
          sfxPowerUp();
          return true;
        } else if (x >= CANVAS_W / 3 && x < (2 * CANVAS_W) / 3) {
          game.theme = "ironman";
          saveTheme("ironman");
          sfxPowerUp();
          return true;
        } else if (x >= (2 * CANVAS_W) / 3) {
          game.theme = "thor";
          saveTheme("thor");
          sfxPowerUp();
          return true;
        }
      }

      // Sound toggle (top-right, left of pause) — active in every state
      if (y < 70 && x > CANVAS_W - 115 && x <= CANVAS_W - 62) {
        initAudio();
        toggleMute();
        return true;
      }
      // Pause button (top-right corner) while playing
      if (game.state === "playing" && y < 70 && x > CANVAS_W - 60) {
        game.state = "paused";
        return true;
      }
      if (game.state === "menu" || game.state === "gameover") {
        initAudio();
        resetGame(game);
        return true;
      }
      if (game.state === "paused") {
        game.state = "playing";
        return true;
      }
      return false;
    };

    const touchStart = (e: TouchEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      const touch = e.touches[0];
      if (!touch) return;
      const c = getCanvasCoords(touch.clientX, touch.clientY);
      if (handlePointerDown(c.x, c.y)) return;
      input.touchX = c.x;
      input.touchY = c.y;
      input.touchActive = true;
    };

    const touchMove = (e: TouchEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      const touch = e.touches[0];
      if (touch) {
        const c = getCanvasCoords(touch.clientX, touch.clientY);
        input.touchX = c.x;
        input.touchY = c.y;
      }
    };

    const touchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const input = inputRef.current;
      const remaining = e.touches[0];
      if (remaining) {
        const c = getCanvasCoords(remaining.clientX, remaining.clientY);
        input.touchX = c.x;
        input.touchY = c.y;
        return;
      }
      input.touchActive = false;
      input.touchX = null;
      input.touchY = null;
    };

    const mouseDown = (e: MouseEvent) => {
      const c = getCanvasCoords(e.clientX, e.clientY);
      handlePointerDown(c.x, c.y);
    };

    // Auto-pause when the phone locks / the tab is backgrounded.
    const visibility = () => {
      if (document.hidden && gameRef.current.state === "playing") {
        gameRef.current.state = "paused";
        stopMusic();
      }
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    canvas.addEventListener("touchstart", touchStart, { passive: false });
    canvas.addEventListener("touchmove", touchMove, { passive: false });
    canvas.addEventListener("touchend", touchEnd, { passive: false });
    canvas.addEventListener("touchcancel", touchEnd, { passive: false });
    canvas.addEventListener("mousedown", mouseDown);
    document.addEventListener("visibilitychange", visibility);

    const stepIdleBackground = (game: GameData) => {
      game.frameCount++;
      for (const s of game.stars) {
        s.y += s.speed * (game.state === "menu" ? 1 : 0.3);
        if (s.y > CANVAS_H) {
          s.y = -5;
          s.x = Math.random() * CANVAS_W;
        }
      }
      if (game.state === "gameover") {
        for (let i = game.particles.length - 1; i >= 0; i--) {
          const pt = game.particles[i]!;
          pt.x += pt.vx * 0.3;
          pt.y += pt.vy * 0.3;
          pt.life -= 0.5;
          pt.vx *= 0.98;
          pt.vy *= 0.98;
          if (pt.life <= 0) game.particles.splice(i, 1);
        }
      }
    };

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = Math.min(timestamp - lastTimeRef.current, 250);
      lastTimeRef.current = timestamp;
      accRef.current += elapsed;

      const game = gameRef.current;
      const input = inputRef.current;

      // Fixed timestep: identical pace on 60Hz, 120Hz or 144Hz displays.
      let steps = 0;
      while (accRef.current >= STEP_MS && steps < 8) {
        accRef.current -= STEP_MS;
        steps++;
        if (game.state !== "playing") stepIdleBackground(game);
        updateGame(game, input, STEP_MS);

        if (game.state === "playing" || game.state === "gameover") {
          if (game.bullets.length > prevBulletCount.current) sfxShoot();
          if (game.stats.kills > prevKillCount.current) sfxExplosion();
          if (game.player.hp < prevPlayerHp.current) sfxPlayerHit();
          if (
            game.powerUps.length < prevPowerUpCount.current &&
            prevPowerUpCount.current > 0
          )
            sfxPowerUp();
          if (game.bossWarning > 0 && prevBossWarning.current <= 0) sfxBoss();
        }
        if (game.state === "gameover" && prevState.current === "playing")
          sfxGameOver();
        if (game.state === "playing" && prevState.current !== "playing")
          startMusic();
        if (game.state !== "playing" && prevState.current === "playing")
          stopMusic();

        prevBulletCount.current = game.bullets.length;
        prevKillCount.current = game.stats.kills;
        prevPlayerHp.current = game.player.hp;
        prevPowerUpCount.current = game.powerUps.length;
        prevBossWarning.current = game.bossWarning;
        prevState.current = game.state;
      }
      if (steps === 8) accRef.current = 0;

      renderGame(ctx, game, canvas.width, canvas.height, input);
      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      stopMusic();
      closeAudio();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("touchmove", touchMove);
      canvas.removeEventListener("touchend", touchEnd);
      canvas.removeEventListener("touchcancel", touchEnd);
      canvas.removeEventListener("mousedown", mouseDown);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [getCanvasCoords]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background select-none touch-none">
      <h1 className="sr-only">NOVA BLASTER — arcade space shooter</h1>
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
