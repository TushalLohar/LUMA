import { createFileRoute, Link } from "@tanstack/react-router";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { scoresQueryOptions } from "@/lib/leaderboard-queries";

const title = "NOVA BLASTER Leaderboard — Top Arcade Shooter Scores";
const description =
  "See the highest NOVA BLASTER scores of all time and today's daily challenge board, then jump in and try to beat them.";
const url = "https://play-muse-machine.lovable.app/leaderboard";

export const Route = createFileRoute("/leaderboard")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(scoresQueryOptions("classic", 20)),
      context.queryClient.ensureQueryData(scoresQueryOptions("daily", 20)),
    ]);
    return null;
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: url }],
  }),
  component: LeaderboardPage,
  errorComponent: () => (
    <PageShell>
      <p className="font-mono text-sm text-arcade/70">The leaderboard could not be loaded.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="font-mono text-sm text-arcade/70">No scores found.</p>
    </PageShell>
  ),
});

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-black px-4 py-12">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <PageShell>
      <h1 className="text-center font-mono text-2xl font-bold tracking-[0.2em] text-arcade">
        LEADERBOARD
      </h1>
      <p className="mt-2 text-center font-mono text-xs text-foreground/60">
        Every score is set by a real run of NOVA BLASTER.
      </p>

      <section className="mt-8 rounded-lg border border-arcade-border bg-arcade-surface p-4">
        <h2 className="mb-3 font-mono text-xs tracking-[0.2em] text-arcade/80">ALL TIME</h2>
        <LeaderboardTable mode="classic" limit={20} />
      </section>

      <section className="mt-6 rounded-lg border border-arcade-border bg-arcade-surface p-4">
        <h2 className="mb-3 font-mono text-xs tracking-[0.2em] text-arcade/80">
          TODAY'S DAILY CHALLENGE
        </h2>
        <LeaderboardTable mode="daily" limit={20} />
      </section>

      <div className="mt-8 flex justify-center gap-4 font-mono text-xs tracking-widest">
        <Link to="/" className="text-arcade underline-offset-4 hover:underline">
          PLAY NOW
        </Link>
        <Link to="/how-to-play" className="text-foreground/60 underline-offset-4 hover:underline">
          HOW TO PLAY
        </Link>
      </div>
    </PageShell>
  );
}
