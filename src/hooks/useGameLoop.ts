import { useEffect, useRef } from 'react';
import { updateGame, CANVAS_W, CANVAS_H } from '@/game/engine';
import { renderGame } from '@/game/render';
import {
  sfxShoot, sfxExplosion, sfxPowerUp, sfxPlayerHit, sfxGameOver, sfxBoss,
  startMusic, stopMusic, closeAudio,
} from '@/game/audio';
import type { GameData, InputState } from '@/game/types';

/** Fixed-timestep accumulator so gameplay speed is identical on 60Hz,
 *  120Hz or 144Hz displays (and when a laptop throttles the refresh rate).
 *  LOGIC_HZ above 60 makes the whole game proportionally faster/snappier. */
const LOGIC_HZ = 78;
const STEP_MS = 1000 / LOGIC_HZ;
const MAX_STEPS_PER_FRAME = 6;
const MAX_DT_MS = 250;


export function useGameLoop(
  gameRef: React.MutableRefObject<GameData>,
  inputRef: React.MutableRefObject<InputState>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);
  const prevBulletCount = useRef(0);
  const prevKillCount = useRef(0);
  const prevPlayerHp = useRef(3);
  const prevPowerUpCount = useRef(0);
  const prevState = useRef<string>('menu');
  const prevBossWarning = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const frameMs = Math.min(timestamp - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = timestamp;

      const game = gameRef.current;
      const input = inputRef.current;

      accRef.current += frameMs;
      let steps = Math.floor(accRef.current / STEP_MS);
      if (steps > MAX_STEPS_PER_FRAME) {
        steps = MAX_STEPS_PER_FRAME;
        accRef.current = 0;
      } else {
        accRef.current -= steps * STEP_MS;
      }

      for (let step = 0; step < steps; step++) {
        // Keep menu / pause / gameover backgrounds alive
        if (game.state !== 'playing') {
          game.frameCount++;
          for (const s of game.stars) {
            s.y += s.speed * (game.state === 'menu' ? 1 : 0.3);
            if (s.y > CANVAS_H) {
              s.y = -5;
              s.x = Math.random() * CANVAS_W;
            }
          }
          if (game.state === 'gameover') {
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
        }

        updateGame(game, input, STEP_MS);

        // SFX / music triggers
        if (game.state === 'playing' || game.state === 'gameover') {
          if (game.bullets.length > prevBulletCount.current) sfxShoot();
          if (game.stats.kills > prevKillCount.current) sfxExplosion();
          if (game.player.hp < prevPlayerHp.current) sfxPlayerHit();
          if (game.powerUps.length < prevPowerUpCount.current && prevPowerUpCount.current > 0) sfxPowerUp();
          if (game.bossWarning > 0 && prevBossWarning.current <= 0) sfxBoss();
        }
        if (game.state === 'gameover' && prevState.current === 'playing') sfxGameOver();

        // Music follows the playing state
        if (game.state === 'playing' && prevState.current !== 'playing') startMusic();
        if (game.state !== 'playing' && prevState.current === 'playing') stopMusic();

        prevBulletCount.current = game.bullets.length;
        prevKillCount.current = game.stats.kills;
        prevPlayerHp.current = game.player.hp;
        prevPowerUpCount.current = game.powerUps.length;
        prevBossWarning.current = game.bossWarning;
        prevState.current = game.state;
      }

      renderGame(ctx, game, canvas.width, canvas.height, input);

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      closeAudio();
      lastTimeRef.current = 0;
    };
  }, [canvasRef, gameRef, inputRef]);
}
