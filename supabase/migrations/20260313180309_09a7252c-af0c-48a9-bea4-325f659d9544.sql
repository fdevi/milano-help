
-- Table for favorite stops
CREATE TABLE public.fermate_preferite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stop_id text NOT NULL,
  stop_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, stop_id)
);

ALTER TABLE public.fermate_preferite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.fermate_preferite FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.fermate_preferite FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.fermate_preferite FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
