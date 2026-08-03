import { queryOptions } from "@tanstack/react-query";
import { listScores } from "@/lib/leaderboard.functions";

export function scoresQueryOptions(limit = 10) {
  return queryOptions({
    queryKey: ["scores", limit] as const,
    queryFn: () => listScores({ data: { limit } }),
    staleTime: 30_000,
  });
}
