
-- =============================================
-- 1. Tabella categorie_annunci
-- =============================================
CREATE TABLE public.categorie_annunci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  label text NOT NULL,
  icona text NOT NULL DEFAULT 'Circle',
  richiede_prezzo boolean NOT NULL DEFAULT false,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categorie_annunci ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categorie_annunci"
  ON public.categorie_annunci FOR SELECT
  USING (true);

-- Precompila categorie
INSERT INTO public.categorie_annunci (nome, label, icona, richiede_prezzo, ordine) VALUES
  ('offro_servizio', 'Offro Servizio', 'Wrench', false, 1),
  ('cerco', 'Cerco', 'Search', false, 2),
  ('in_vendita', 'In Vendita', 'ShoppingBag', true, 3),
  ('regalo', 'Regalo', 'Gift', false, 4),
  ('evento', 'Evento', 'Calendar', false, 5),
  ('altro', 'Altro', 'HelpCircle', false, 6);

-- =============================================
-- 2. Tabella annunci
-- =============================================
CREATE TABLE public.annunci (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  descrizione text,
  categoria_id uuid REFERENCES public.categorie_annunci(id),
  prezzo numeric,
  immagini text[] DEFAULT '{}',
  user_id uuid NOT NULL,
  quartiere text,
  stato text NOT NULL DEFAULT 'in_moderazione',
  motivo_rifiuto text,
  moderato_da uuid,
  moderato_il timestamptz,
  visualizzazioni integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.annunci ENABLE ROW LEVEL SECURITY;

-- SELECT: tutti vedono annunci attivi + proprietario vede i propri
CREATE POLICY "Anyone can view active annunci"
  ON public.annunci FOR SELECT
  USING (stato = 'attivo' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- INSERT: solo utenti autenticati
CREATE POLICY "Authenticated users can create annunci"
  ON public.annunci FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: proprietario o admin
CREATE POLICY "Owner or admin can update annunci"
  ON public.annunci FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- DELETE: solo admin
CREATE POLICY "Admin can delete annunci"
  ON public.annunci FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_annunci_updated_at
  BEFORE UPDATE ON public.annunci
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. Tabella segnalazioni
-- =============================================
CREATE TABLE public.segnalazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annuncio_id uuid NOT NULL REFERENCES public.annunci(id) ON DELETE CASCADE,
  utente_id uuid NOT NULL,
  motivo text NOT NULL,
  note text,
  stato text NOT NULL DEFAULT 'aperta',
  gestita_da uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.segnalazioni ENABLE ROW LEVEL SECURITY;

-- INSERT: utenti autenticati
CREATE POLICY "Authenticated users can report"
  ON public.segnalazioni FOR INSERT
  WITH CHECK (auth.uid() = utente_id);

-- SELECT: solo admin
CREATE POLICY "Admin can view segnalazioni"
  ON public.segnalazioni FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- UPDATE: solo admin
CREATE POLICY "Admin can update segnalazioni"
  ON public.segnalazioni FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- DELETE: solo admin
CREATE POLICY "Admin can delete segnalazioni"
  ON public.segnalazioni FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 4. Storage bucket per immagini annunci
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('annunci-images', 'annunci-images', true);

CREATE POLICY "Anyone can view annunci images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'annunci-images');

CREATE POLICY "Authenticated users can upload annunci images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'annunci-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own annunci images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'annunci-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own annunci images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'annunci-images' AND auth.uid()::text = (storage.foldername(name))[1]);
