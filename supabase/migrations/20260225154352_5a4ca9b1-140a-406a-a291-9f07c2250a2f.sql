
-- Function for annunci INSERT
CREATE OR REPLACE FUNCTION public.log_annuncio_creato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO activity_logs (user_id, azione, dettagli)
  VALUES (NEW.user_id, 'annuncio_creato', json_build_object('annuncio_id', NEW.id, 'titolo', NEW.titolo)::text);
  RETURN NEW;
END;
$$;

-- Function for annunci UPDATE (stato changes)
CREATE OR REPLACE FUNCTION public.log_annuncio_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato THEN
    IF NEW.stato = 'attivo' THEN
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NEW.moderato_da, 'annuncio_approvato', json_build_object('annuncio_id', NEW.id, 'titolo', NEW.titolo)::text);
    ELSIF NEW.stato = 'rifiutato' THEN
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NEW.moderato_da, 'annuncio_rifiutato', json_build_object('annuncio_id', NEW.id, 'titolo', NEW.titolo, 'motivo', NEW.motivo_rifiuto)::text);
    ELSIF NEW.stato = 'eliminato' THEN
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NEW.moderato_da, 'annuncio_eliminato_segnalazione', json_build_object('annuncio_id', NEW.id, 'titolo', NEW.titolo)::text);
    ELSE
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NEW.user_id, 'annuncio_modificato', json_build_object('annuncio_id', NEW.id, 'titolo', NEW.titolo, 'nuovo_stato', NEW.stato)::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function for eventi INSERT
CREATE OR REPLACE FUNCTION public.log_evento_creato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO activity_logs (user_id, azione, dettagli)
  VALUES (NEW.organizzatore_id, 'evento_creato', json_build_object('evento_id', NEW.id, 'titolo', NEW.titolo)::text);
  RETURN NEW;
END;
$$;

-- Function for eventi UPDATE (stato changes)
CREATE OR REPLACE FUNCTION public.log_evento_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato THEN
    IF NEW.stato = 'attivo' THEN
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NULL, 'evento_approvato', json_build_object('evento_id', NEW.id, 'titolo', NEW.titolo)::text);
    ELSIF NEW.stato = 'rifiutato' THEN
      INSERT INTO activity_logs (user_id, azione, dettagli)
      VALUES (NULL, 'evento_rifiutato', json_build_object('evento_id', NEW.id, 'titolo', NEW.titolo, 'motivo', NEW.motivo_rifiuto)::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Function for new user (profiles INSERT since we can't attach to auth.users)
CREATE OR REPLACE FUNCTION public.log_utente_registrato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO activity_logs (user_id, azione, dettagli)
  VALUES (NEW.user_id, 'utente_registrato', json_build_object('username', NEW.username, 'email', NEW.email)::text);
  RETURN NEW;
END;
$$;

-- Function for segnalazioni stato change
CREATE OR REPLACE FUNCTION public.log_segnalazione_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.stato IS DISTINCT FROM NEW.stato AND NEW.stato = 'ignorata' THEN
    INSERT INTO activity_logs (user_id, azione, dettagli)
    VALUES (NEW.gestita_da, 'segnalazione_ignorata', json_build_object('segnalazione_id', NEW.id, 'annuncio_id', NEW.annuncio_id)::text);
  END IF;
  RETURN NEW;
END;
$$;

-- Function for user blocked
CREATE OR REPLACE FUNCTION public.log_utente_bloccato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.bloccato IS DISTINCT FROM NEW.bloccato AND NEW.bloccato = true THEN
    INSERT INTO activity_logs (user_id, azione, dettagli)
    VALUES (NULL, 'utente_bloccato_segnalazione', json_build_object('user_id', NEW.user_id, 'username', NEW.username)::text);
  END IF;
  RETURN NEW;
END;
$$;

-- Create all triggers
CREATE TRIGGER trg_log_annuncio_creato AFTER INSERT ON annunci FOR EACH ROW EXECUTE FUNCTION log_annuncio_creato();
CREATE TRIGGER trg_log_annuncio_update AFTER UPDATE ON annunci FOR EACH ROW EXECUTE FUNCTION log_annuncio_update();
CREATE TRIGGER trg_log_evento_creato AFTER INSERT ON eventi FOR EACH ROW EXECUTE FUNCTION log_evento_creato();
CREATE TRIGGER trg_log_evento_update AFTER UPDATE ON eventi FOR EACH ROW EXECUTE FUNCTION log_evento_update();
CREATE TRIGGER trg_log_utente_registrato AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION log_utente_registrato();
CREATE TRIGGER trg_log_segnalazione_update AFTER UPDATE ON segnalazioni FOR EACH ROW EXECUTE FUNCTION log_segnalazione_update();
CREATE TRIGGER trg_log_utente_bloccato AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION log_utente_bloccato();
