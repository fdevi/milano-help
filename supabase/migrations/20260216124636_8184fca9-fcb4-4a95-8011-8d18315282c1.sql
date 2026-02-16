
-- 1. User Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can manage roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Categorie
CREATE TABLE public.categorie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  icona text NOT NULL DEFAULT 'Circle',
  ordine integer NOT NULL DEFAULT 0,
  attiva boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categorie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories" ON public.categorie
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert categories" ON public.categorie
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories" ON public.categorie
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories" ON public.categorie
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_categorie_updated_at
  BEFORE UPDATE ON public.categorie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default categories
INSERT INTO public.categorie (nome, icona, ordine) VALUES
  ('Offro Servizio', 'HandHeart', 1),
  ('Cerco', 'Search', 2),
  ('In Vendita', 'ShoppingBag', 3),
  ('Regalo', 'Gift', 4),
  ('Studenti e Insegnanti', 'GraduationCap', 5),
  ('Aiuto Anziani', 'Heart', 6),
  ('Immobili', 'Home', 7),
  ('Negozi di Quartiere', 'Store', 8),
  ('Bambini', 'Baby', 9),
  ('Eventi', 'Calendar', 10),
  ('Chat', 'MessageCircle', 11),
  ('Donazioni', 'CircleDollarSign', 12);

-- 3. Servizi
CREATE TABLE public.servizi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  descrizione text,
  categoria_id uuid REFERENCES public.categorie(id) ON DELETE SET NULL,
  operatore_id uuid NOT NULL,
  stato text NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('attivo', 'in_attesa', 'rifiutato', 'disattivato')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.servizi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active services" ON public.servizi
  FOR SELECT TO authenticated USING (stato = 'attivo' OR operatore_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create services" ON public.servizi
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = operatore_id);

CREATE POLICY "Owners and admins can update services" ON public.servizi
  FOR UPDATE TO authenticated
  USING (auth.uid() = operatore_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete services" ON public.servizi
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_servizi_updated_at
  BEFORE UPDATE ON public.servizi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Prenotazioni
CREATE TABLE public.prenotazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servizio_id uuid REFERENCES public.servizi(id) ON DELETE CASCADE NOT NULL,
  utente_id uuid NOT NULL,
  stato text NOT NULL DEFAULT 'confermata' CHECK (stato IN ('confermata', 'completata', 'cancellata')),
  data_prenotazione timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prenotazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings or admins all" ON public.prenotazioni
  FOR SELECT TO authenticated
  USING (auth.uid() = utente_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create bookings" ON public.prenotazioni
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = utente_id);

CREATE POLICY "Users and admins can update bookings" ON public.prenotazioni
  FOR UPDATE TO authenticated
  USING (auth.uid() = utente_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bookings" ON public.prenotazioni
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_prenotazioni_updated_at
  BEFORE UPDATE ON public.prenotazioni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Activity Logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  azione text NOT NULL,
  dettagli text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow system inserts via service role (triggers etc)
-- Users can view own profile always (add missing self-select for admin queries)
-- Admin needs to read ALL profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin needs to update any profile (for blocking etc)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bloccato boolean DEFAULT false;
