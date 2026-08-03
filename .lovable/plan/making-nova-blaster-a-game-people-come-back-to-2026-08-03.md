# Making NOVA BLASTER a game people come back to

Right now the game is fun but anonymous: you land on a black canvas, play, and your score dies in your own browser. The three things that turn an arcade prototype into something people share are: a reason to come back, a reason to compete, and a reason to link it.

## Phase 1 — Retention loop (biggest impact)

**Global leaderboard.** Scores currently live in local storage only. Add a cloud-backed leaderboard: after a run, the player enters a 3-letter arcade tag, the score is submitted, and the menu shows the global top 10 plus the player's rank. This is the single strongest driver of repeat play in arcade games.

**Daily challenge.** One seeded run per day (same wave order and power-up drops for everyone) with its own daily leaderboard that resets at midnight UTC. Gives a reason to open the site every day.

**Progression that carries over.** Track lifetime stats (runs, best wave, total kills, bosses beaten) and unlock a handful of cosmetic ship skins at milestones. Cheap to build, strong pull.

## Phase 2 — Feel and first-30-seconds polish

- Short "how to play" overlay on first visit only (move, shoot, pause), auto-dismissed after the first input.
- Combo/multiplier meter with escalating score and a rising audio pitch — rewards aggressive play.
- Near-miss slow-mo and a subtle hit-stop on boss kills, so big moments read as big.
- On-death summary card: wave reached, accuracy, best combo, rank delta vs. your previous best.
- Mobile pass: bigger touch zones, optional virtual stick, haptics on hit, and a run that fits comfortably in portrait.

## Phase 3 — Getting real users

- **Shareable result image**: a "share score" button that produces a score card image plus link, so results spread on social.
- **Landing content**: keep the game at `/` but add a lightweight `/how-to-play` and `/leaderboard` route with real text so search engines have something to index, plus proper titles, descriptions, and a video-game JSON-LD block.
- **Submit-ready listing**: itch.io / Reddit r/WebGames / Hacker News do well with browser arcade games; the share card and leaderboard make those posts land better.
- **Basic analytics**: track runs started, runs completed, and average session length so we can see which changes actually help.

## Technical notes

- Leaderboard, daily challenge, and lifetime stats need Lovable Cloud (database + anonymous identity). Scores are submitted through a server function that validates the payload and rate-limits per session; the client never writes directly.
- Daily runs use a date-seeded PRNG in `src/game/engine.ts` so the same day is identical for everyone; local `Math.random()` calls in wave/power-up spawning switch to the seeded source when in daily mode.
- Score card generation renders the existing canvas plus an overlay layer to a PNG on the client — no server image pipeline needed.
- Combo, unlocks, and tuning values go into the existing `src/game/constants.ts` so balance stays in one place.

## Suggested order

Start with Phase 1's global leaderboard and the on-death summary card — together they change the feel of the game most per unit of work. Then daily challenge, then share card and the content routes for discovery.
