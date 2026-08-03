import { createServerFn } from "@tanstack/react-start";
import {
  submitScoreSchema,
  listScoresSchema,
  dailyKey,
  type ScoreRow,
} from "@/lib/leaderboard-schema";

export const submitScore = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitScoreSchema.parse(input))
  .handler(async ({ data }): Promise<{ rank: number; total: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const day = data.mode === "daily" ? dailyKey() : null;

    const { error } = await supabaseAdmin.from("scores").insert({
      tag: data.tag,
      score: data.score,
      wave: data.wave,
      kills: data.kills,
      accuracy: data.accuracy,
      best_combo: data.bestCombo,
      mode: data.mode,
      day,
    });
    if (error) {
      console.error("[leaderboard] insert failed", error.message);
      throw new Error("Could not save your score. Try again.");
    }

    let betterQuery = supabaseAdmin
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("mode", data.mode)
      .gt("score", data.score);
    let totalQuery = supabaseAdmin
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("mode", data.mode);
    if (day) {
      betterQuery = betterQuery.eq("day", day);
      totalQuery = totalQuery.eq("day", day);
    }

    const [better, total] = await Promise.all([betterQuery, totalQuery]);
    return { rank: (better.count ?? 0) + 1, total: total.count ?? 1 };
  });

export const listScores = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listScoresSchema.parse(input))
  .handler(async ({ data }): Promise<ScoreRow[]> => {
    const { createPublicSupabaseClient } = await import("@/lib/supabase-public.server");
    const supabase = createPublicSupabaseClient();
    let query = supabase
      .from("scores")
      .select("tag, score, wave, created_at")
      .eq("mode", data.mode)
      .order("score", { ascending: false })
      .limit(data.limit ?? 10);
    if (data.mode === "daily") query = query.eq("day", dailyKey());

    const { data: rows, error } = await query;
    if (error) {
      console.error("[leaderboard] read failed", error.message);
      return [];
    }
    return rows ?? [];
  });
