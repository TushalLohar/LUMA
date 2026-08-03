CREATE OR REPLACE FUNCTION public.submit_score(
  _tag text,
  _score integer,
  _wave integer,
  _kills integer,
  _accuracy integer,
  _best_combo integer
)
RETURNS TABLE (rank integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_tag text;
BEGIN
  clean_tag := upper(btrim(_tag));
  IF clean_tag !~ '^[A-Z0-9]{3}$' THEN
    RAISE EXCEPTION 'Invalid pilot tag';
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 100000000 THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;

  INSERT INTO public.scores (tag, score, wave, kills, accuracy, best_combo, mode, day)
  VALUES (
    clean_tag,
    _score,
    greatest(1, least(coalesce(_wave, 1), 1000)),
    greatest(0, least(coalesce(_kills, 0), 1000000)),
    greatest(0, least(coalesce(_accuracy, 0), 100)),
    greatest(0, least(coalesce(_best_combo, 0), 10000)),
    'classic',
    NULL
  );

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.scores s WHERE s.score > _score)::int + 1,
    (SELECT count(*) FROM public.scores)::int;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_score(text, integer, integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_score(text, integer, integer, integer, integer, integer) TO anon, authenticated, service_role;