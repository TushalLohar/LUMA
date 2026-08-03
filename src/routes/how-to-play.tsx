import { createFileRoute, Link } from "@tanstack/react-router";
import { KEYS_HELP } from "@/components/game/help-content";
import { SHIPS } from "@/game/progress";

const title = "How to Play NOVA BLASTER — Controls, Power-Ups & Combos";
const description =
  "Learn the NOVA BLASTER controls, power-ups, combo scoring and boss waves so you can climb the global leaderboard.";
const url = "https://play-muse-machine.lovable.app/how-to-play";

const POWER_UPS = [
  ["SPREAD", "Adds extra angled shots — stacks twice."],
  ["RAPID", "Much faster fire rate for a short burst."],
  ["SHIELD", "Absorbs hits while the ring is up."],
  ["MISSILE", "Homing missiles that chase the nearest enemy."],
  ["HEALTH", "Restores one hull point (max 5)."],
  ["BOMB", "Clears every enemy bullet and damages the screen."],
];

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "NOVA BLASTER",
          description,
          url: "https://play-muse-machine.lovable.app/",
          genre: ["Arcade", "Shoot 'em up"],
          playMode: "SinglePlayer",
          applicationCategory: "Game",
          operatingSystem: "Web browser",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: HowToPlayPage,
});

function HowToPlayPage() {
  return (
    <div className="dark min-h-screen bg-black px-4 py-12">
      <article className="mx-auto max-w-xl font-mono">
        <h1 className="text-center text-2xl font-bold tracking-[0.2em] text-arcade">
          HOW TO PLAY
        </h1>

        <section className="mt-8 rounded-lg border border-arcade-border bg-arcade-surface p-4">
          <h2 className="mb-3 text-xs tracking-[0.2em] text-arcade/80">CONTROLS</h2>
          <dl className="space-y-2 text-xs text-foreground/85">
            {KEYS_HELP.map((row) => (
              <div key={row.label} className="flex gap-3">
                <dt className="w-24 shrink-0 text-arcade/70">{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-arcade-border bg-arcade-surface p-4">
          <h2 className="mb-3 text-xs tracking-[0.2em] text-arcade/80">POWER-UPS</h2>
          <dl className="space-y-2 text-xs text-foreground/85">
            {POWER_UPS.map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <dt className="w-24 shrink-0 text-arcade/70">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-arcade-border bg-arcade-surface p-4 text-xs leading-relaxed text-foreground/85">
          <h2 className="mb-3 text-xs tracking-[0.2em] text-arcade/80">SCORING</h2>
          <p>
            Kills made in quick succession build a combo multiplier up to 10x. Let the combo timer
            run out and it resets, so keep pressure on the closest targets. A boss arrives every 5
            waves and is worth a large point bonus.
          </p>
          <p className="mt-3">
            Every run is endless: waves keep escalating until you lose your last hull point, and the
            score you finish with is the one that goes on the global board.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-arcade-border bg-arcade-surface p-4">
          <h2 className="mb-3 text-xs tracking-[0.2em] text-arcade/80">SHIP UNLOCKS</h2>
          <ul className="space-y-2 text-xs text-foreground/85">
            {SHIPS.map((ship) => (
              <li key={ship.id} className="flex gap-3">
                <span className="w-28 shrink-0" style={{ color: ship.color }}>
                  {ship.name}
                </span>
                <span>
                  {ship.unlockAt === 0
                    ? "Available from the start"
                    : `${ship.unlockAt.toLocaleString()} lifetime kills`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex justify-center gap-4 text-xs tracking-widest">
          <Link to="/" className="text-arcade underline-offset-4 hover:underline">
            PLAY NOW
          </Link>
          <Link to="/leaderboard" className="text-foreground/60 underline-offset-4 hover:underline">
            LEADERBOARD
          </Link>
        </div>
      </article>
    </div>
  );
}
