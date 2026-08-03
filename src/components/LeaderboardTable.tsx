import { useQuery } from "@tanstack/react-query";
import { scoresQueryOptions } from "@/lib/leaderboard-queries";
import { cn } from "@/lib/utils";

const medal = ["text-arcade", "text-arcade-gold", "text-arcade-pink"];

export function LeaderboardTable({
  limit = 10,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  const { data, isLoading } = useQuery(scoresQueryOptions(limit));

  if (isLoading) {
    return <p className={cn("font-mono text-xs text-arcade/60", className)}>LOADING…</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className={cn("font-mono text-xs text-foreground/50", className)}>
        No scores yet — be the first pilot on the board.
      </p>
    );
  }

  return (
    <ol className={cn("font-mono text-sm", className)}>
      {data.map((row, i) => (
        <li
          key={`${row.tag}-${row.created_at}`}
          className="flex items-center justify-between gap-3 border-b border-arcade-border/30 py-1.5 last:border-0"
        >
          <span className={cn("w-6 tabular-nums text-foreground/40", medal[i])}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className={cn("flex-1 tracking-[0.3em] text-foreground/90", medal[i])}>
            {row.tag}
          </span>
          <span className="text-[10px] tracking-widest text-foreground/45">W{row.wave}</span>
          <span className="font-display tabular-nums text-base font-bold text-foreground">
            {row.score.toLocaleString()}
          </span>
        </li>
      ))}
    </ol>
  );
}
