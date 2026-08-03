import { createFileRoute, Link } from "@tanstack/react-router";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { scoresQueryOptions } from "@/lib/leaderboard-queries";

const title = "NOVA BLASTER Leaderboard — Top Arcade Shooter Scores";
const description =
  "See the highest NOVA BLASTER scores of all time, then jump in and try to beat them in this free browser arcade space shooter.";
const url = "https://play-muse-machine.lovable.app/leaderboard";

export const Route = createFileRoute("/leaderboard")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(scoresQueryOptions(25));
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
    <div className="dark min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

function LeaderboardPage() {
  return (
    <PageShell>
      <p className="font-mono text-[10px] tracking-[0.45em] text-arcade/70">NOVA BLASTER</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground uppercase">
        Leader<span className="text-arcade">board</span>
      </h1>
      <div className="mt-3 h-px w-full bg-gradient-to-r from-arcade via-arcade/30 to-transparent" />
      <p className="mt-3 font-mono text-xs text-foreground/55">
        Every score below was set by a real run. Top 25 pilots, all time.
      </p>

      <section className="mt-8 border border-arcade-border bg-arcade-surface p-4">
        <LeaderboardTable limit={25} />
      </section>

      <div className="mt-8 flex justify-center gap-5 font-mono text-[11px] tracking-[0.2em]">
        <Link to="/" className="text-arcade underline-offset-4 hover:underline">
          PLAY NOW
        </Link>
        <Link to="/how-to-play" className="text-foreground/55 underline-offset-4 hover:underline">
          HOW TO PLAY
        </Link>
      </div>
    </PageShell>
  );
}
