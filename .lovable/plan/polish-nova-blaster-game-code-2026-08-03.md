# Polish NOVA BLASTER game code

## Goal
Clean up the uploaded space shooter while keeping it a standalone Vite+React+Tailwind game. Focus on structure, maintainability, and small runtime fixes — no gameplay redesign.

## What I’ll do

1. **Set up a working copy**
   - Extract `game.zip` into the repo under a temporary working path so edits are visible and buildable.
   - Preserve the original Vite/Tailwind setup so `npm run dev` / `npm run build` still work.

2. **Refactor `App.tsx`**
   - Split the single large `useEffect` into focused hooks:
     - `useGameLoop(gameRef, inputRef, canvasRef, onSfx)` — RAF, update, render.
     - `useInputHandlers(gameRef, inputRef, canvasRef)` — keyboard, touch, mouse, coordinate mapping.
   - Keep state refs to avoid React re-renders during gameplay.

3. **Fix audio lifecycle**
   - Close the `AudioContext` and clear the music interval in the cleanup path.
   - Make `localStorage` reads/writes lazy and wrapped, so module-scope storage access doesn’t throw in restricted contexts.

4. **Extract constants and reduce magic numbers**
   - Move input key codes, spawn timers, UI positions, and color literals into named constants in `engine.ts` or a new `constants.ts`.
   - Keep gameplay tuning values in one place.

5. **Tighten types**
   - Replace implicit `any` in event handlers and canvas contexts.
   - Add a small `SfxEvent` type so the game loop can emit sound events cleanly instead of comparing array lengths.

6. **Verify**
   - Run `vite build` to confirm no TypeScript or bundling errors.
   - Smoke-test the game loop starts and responds to input.

## Out of scope
- Integrating the game into the TanStack Start app.
- Adding new features (levels, enemies, art, etc.).
- Rewriting the renderer or game engine.

## Deliverable
A cleaned-up, buildable version of the game with clearer file structure and safer audio/storage handling.
