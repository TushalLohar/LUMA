import { z } from "zod";

export const TAG_LENGTH = 3;

export const scoreModeSchema = z.enum(["classic", "daily"]);
export type ScoreMode = z.infer<typeof scoreModeSchema>;

export const submitScoreSchema = z.object({
  tag: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3}$/, "Tag must be 3 letters or numbers"),
  score: z.number().int().min(0).max(100_000_000),
  wave: z.number().int().min(1).max(1000),
  kills: z.number().int().min(0).max(1_000_000),
  accuracy: z.number().int().min(0).max(100),
  bestCombo: z.number().int().min(0).max(10_000),
  mode: scoreModeSchema,
});

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>;

export const listScoresSchema = z.object({
  mode: scoreModeSchema,
  limit: z.number().int().min(1).max(50).optional(),
});

export interface ScoreRow {
  tag: string;
  score: number;
  wave: number;
  created_at: string;
}

/** UTC day key used for the daily challenge, e.g. "2026-08-03". */
export function dailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
