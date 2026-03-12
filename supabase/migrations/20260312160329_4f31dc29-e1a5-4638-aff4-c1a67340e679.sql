
-- Table for event bookmarks/favorites
CREATE TABLE public.eventi_preferiti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  evento_id uuid NOT NULL REFERENCES public.eventi(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, evento_id)
);

ALTER TABLE public.eventi_preferiti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON public.eventi_preferiti
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.eventi_preferiti
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.eventi_preferiti
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table for reminders (ricordamelo + interessato)
CREATE TABLE public.eventi_promemoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  evento_id uuid NOT NULL REFERENCES public.eventi(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ricordamelo', 'interessato')),
  orario_promemoria timestamptz NOT NULL,
  notificato boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, evento_id, tipo)
);

ALTER TABLE public.eventi_promemoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON public.eventi_promemoria
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders" ON public.eventi_promemoria
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON public.eventi_promemoria
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON public.eventi_promemoria
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
