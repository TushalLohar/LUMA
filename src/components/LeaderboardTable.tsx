import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listScores } from "@/lib/leaderboard.functions";
import type { ScoreMode } from "@/lib/leaderboard-schema";
import { cn } from "@/lib/utils";

const medal = ["text-arcade-gold", "text-foreground/80", "text-arcade-pink"];

export function LeaderboardTable({
  mode,
  limit = 10,
  className,
}: {
  mode: ScoreMode;
  limit?: number;
  className?: string;
}) {
  const fetchScores = useServerFn(listScores);
  const { data, isLoading } = useQuery({
    queryKey: ["scores", mode, limit],
    queryFn: () => fetchScores({ data: { mode, limit } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <p className={cn("font-mono text-xs text-arcade/60", className)}>LOADING…</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className={cn("font-mono text-xs text-arcade/60", className)}>
        No scores yet — be the first pilot on the board.
      </p>
    );
  }

  return (
    <ol className={cn("space-y-1 font-mono text-sm", className)}>
      {data.map((row, i) => (
        <li
          key={`${row.tag}-${row.created_at}`}
          className="flex items-center justify-between gap-3 border-b border-arcade-border/40 pb-1 last:border-0"
        >
          <span className={cn("w-6 tabular-nums text-arcade/60", medal[i])}>{i + 1}</span>
          <span className={cn("flex-1 tracking-[0.2em] text-foreground", medal[i])}>{row.tag}</span>
          <span className="text-arcade/70">W{row.wave}</span>
          <span className="tabular-nums font-bold text-foreground">
            {row.score.toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}
