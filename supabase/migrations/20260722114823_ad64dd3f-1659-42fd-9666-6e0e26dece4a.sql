
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.exercises_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  name_pt text,
  body_part text,
  target text,
  equipment text,
  difficulty text,
  secondary_muscles text[],
  instructions text[],
  instructions_pt text[],
  gif_path text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exercises_catalog TO authenticated, anon;
GRANT ALL ON public.exercises_catalog TO service_role;

ALTER TABLE public.exercises_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_catalog readable by all"
  ON public.exercises_catalog FOR SELECT
  USING (true);

CREATE INDEX exercises_catalog_body_part_idx ON public.exercises_catalog(body_part);
CREATE INDEX exercises_catalog_equipment_idx ON public.exercises_catalog(equipment);
CREATE INDEX exercises_catalog_target_idx ON public.exercises_catalog(target);
CREATE INDEX exercises_catalog_name_trgm ON public.exercises_catalog USING gin (lower(name) gin_trgm_ops, lower(coalesce(name_pt,'')) gin_trgm_ops);

CREATE POLICY "authenticated can read exercise gifs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-gifs');
