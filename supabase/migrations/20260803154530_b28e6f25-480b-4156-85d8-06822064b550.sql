CREATE TABLE public.scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag text NOT NULL,
  score integer NOT NULL,
  wave integer NOT NULL DEFAULT 1,
  kills integer NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 0,
  best_combo integer NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'classic',
  day date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT scores_tag_len CHECK (char_length(tag) = 3),
  CONSTRAINT scores_score_range CHECK (score >= 0 AND score <= 100000000),
  CONSTRAINT scores_wave_range CHECK (wave >= 1 AND wave <= 1000),
  CONSTRAINT scores_mode_valid CHECK (mode IN ('classic', 'daily'))
);

CREATE INDEX scores_classic_rank_idx ON public.scores (score DESC) WHERE mode = 'classic';
CREATE INDEX scores_daily_rank_idx ON public.scores (day, score DESC) WHERE mode = 'daily';

GRANT SELECT ON public.scores TO anon;
GRANT SELECT ON public.scores TO authenticated;
GRANT ALL ON public.scores TO service_role;

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
  ON public.scores FOR SELECT
  TO anon, authenticated
  USING (true);