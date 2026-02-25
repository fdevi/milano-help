
-- 1. Create impostazioni table
CREATE TABLE public.impostazioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chiave text UNIQUE NOT NULL,
  valore text NOT NULL DEFAULT 'false',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impostazioni ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Anyone can read impostazioni" ON public.impostazioni
  FOR SELECT TO authenticated USING (true);

-- Only admin can modify
CREATE POLICY "Admin can update impostazioni" ON public.impostazioni
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert impostazioni" ON public.impostazioni
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.impostazioni (chiave, valore) VALUES
  ('servizi_approvazione_automatica', 'false'),
  ('prenotazioni_visibili_entrambi', 'true');

-- 2. Add missing columns to servizi (quartiere, prezzo, immagini)
ALTER TABLE public.servizi ADD COLUMN IF NOT EXISTS quartiere text;
ALTER TABLE public.servizi ADD COLUMN IF NOT EXISTS prezzo numeric;
ALTER TABLE public.servizi ADD COLUMN IF NOT EXISTS immagini text[] DEFAULT '{}'::text[];

-- 3. Fix RLS on servizi - add SELECT, UPDATE, DELETE policies
CREATE POLICY "Anyone can view active servizi" ON public.servizi
  FOR SELECT TO authenticated
  USING (stato = 'attivo' OR operatore_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can update servizi" ON public.servizi
  FOR UPDATE TO authenticated
  USING (operatore_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete servizi" ON public.servizi
  FOR DELETE TO authenticated
  USING (operatore_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix RLS on prenotazioni - add SELECT, UPDATE, DELETE policies
CREATE POLICY "Users can view own prenotazioni" ON public.prenotazioni
  FOR SELECT TO authenticated
  USING (
    utente_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM servizi s WHERE s.id = prenotazioni.servizio_id AND s.operatore_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Owner or admin can update prenotazioni" ON public.prenotazioni
  FOR UPDATE TO authenticated
  USING (
    utente_id = auth.uid()
    OR EXISTS (SELECT 1 FROM servizi s WHERE s.id = prenotazioni.servizio_id AND s.operatore_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin can delete prenotazioni" ON public.prenotazioni
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Trigger for notifications on servizio status change
CREATE OR REPLACE FUNCTION public.notify_servizio_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato THEN
    IF NEW.stato = 'attivo' THEN
      INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link)
      VALUES (NEW.operatore_id, 'servizio_approvato', 'Servizio approvato', 'Il tuo servizio "' || NEW.titolo || '" è stato approvato.', '/servizio/' || NEW.id);
    ELSIF NEW.stato = 'rifiutato' THEN
      INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link)
      VALUES (NEW.operatore_id, 'servizio_rifiutato', 'Servizio rifiutato', 'Il tuo servizio "' || NEW.titolo || '" è stato rifiutato.', '/miei-servizi');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_servizio_status
  AFTER UPDATE ON servizi FOR EACH ROW EXECUTE FUNCTION notify_servizio_status();

-- 6. Trigger for notifications on new prenotazione
CREATE OR REPLACE FUNCTION public.notify_prenotazione_creata()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _operatore_id uuid;
  _titolo_servizio text;
BEGIN
  SELECT operatore_id, titolo INTO _operatore_id, _titolo_servizio FROM servizi WHERE id = NEW.servizio_id;
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, mittente_id)
  VALUES (_operatore_id, 'nuova_prenotazione', 'Nuova prenotazione', 'Hai ricevuto una prenotazione per "' || _titolo_servizio || '".', '/miei-servizi-prenotati', NEW.utente_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_prenotazione_creata
  AFTER INSERT ON prenotazioni FOR EACH ROW EXECUTE FUNCTION notify_prenotazione_creata();

-- 7. Trigger for notifications on prenotazione status change
CREATE OR REPLACE FUNCTION public.notify_prenotazione_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _titolo_servizio text;
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato THEN
    SELECT titolo INTO _titolo_servizio FROM servizi WHERE id = NEW.servizio_id;
    INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link)
    VALUES (NEW.utente_id, 'prenotazione_' || NEW.stato, 'Prenotazione ' || NEW.stato, 'La tua prenotazione per "' || _titolo_servizio || '" è ora ' || NEW.stato || '.', '/miei-prenotazioni');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_prenotazione_status
  AFTER UPDATE ON prenotazioni FOR EACH ROW EXECUTE FUNCTION notify_prenotazione_status();
