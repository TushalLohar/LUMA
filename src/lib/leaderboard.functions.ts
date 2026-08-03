import { createServerFn } from "@tanstack/react-start";
import {
  submitScoreSchema,
  listScoresSchema,
  type ScoreRow,
} from "@/lib/leaderboard-schema";

export const submitScore = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitScoreSchema.parse(input))
  .handler(async ({ data }): Promise<{ rank: number; total: number }> => {
    const { createPublicSupabaseClient } = await import("@/lib/supabase-public.server");
    const supabase = createPublicSupabaseClient();

    const { data: rows, error } = await supabase.rpc("submit_score", {
      _tag: data.tag,
      _score: data.score,
      _wave: data.wave,
      _kills: data.kills,
      _accuracy: data.accuracy,
      _best_combo: data.bestCombo,
    });

    if (error) {
      console.error("[leaderboard] submit failed", error.message);
      throw new Error("Could not save your score. Try again.");
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    return { rank: row?.rank ?? 1, total: row?.total ?? 1 };
  });

export const listScores = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listScoresSchema.parse(input))
  .handler(async ({ data }): Promise<ScoreRow[]> => {
    const { createPublicSupabaseClient } = await import("@/lib/supabase-public.server");
    const supabase = createPublicSupabaseClient();

    const { data: rows, error } = await supabase
      .from("scores")
      .select("tag, score, wave, created_at")
      .order("score", { ascending: false })
      .limit(data.limit ?? 10);

    if (error) {
      console.error("[leaderboard] read failed", error.message);
      return [];
    }
    return rows ?? [];
  });
