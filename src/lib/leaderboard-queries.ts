import { queryOptions } from "@tanstack/react-query";
import { listScores } from "@/lib/leaderboard.functions";
import type { ScoreMode } from "@/lib/leaderboard-schema";

export function scoresQueryOptions(mode: ScoreMode, limit = 10) {
  return queryOptions({
    queryKey: ["scores", mode, limit] as const,
    queryFn: () => listScores({ data: { mode, limit } }),
    staleTime: 30_000,
  });
}
