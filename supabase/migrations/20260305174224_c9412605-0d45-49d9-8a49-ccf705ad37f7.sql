
-- Add parent_id to messaggi_privati for reply threading
ALTER TABLE public.messaggi_privati ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.messaggi_privati(id) ON DELETE SET NULL;

-- Add parent_id to gruppi_messaggi for reply threading
ALTER TABLE public.gruppi_messaggi ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.gruppi_messaggi(id) ON DELETE SET NULL;

-- Notification trigger for new private messages
CREATE OR REPLACE FUNCTION public.notify_messaggio_privato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _other_user_id uuid;
  _sender_nome text;
  _conv_id uuid;
BEGIN
  _conv_id := NEW.conversazione_id;
  
  SELECT CASE 
    WHEN acquirente_id = NEW.mittente_id THEN venditore_id
    ELSE acquirente_id
  END INTO _other_user_id
  FROM conversazioni_private
  WHERE id = _conv_id;
  
  IF _other_user_id IS NULL OR _other_user_id = NEW.mittente_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _sender_nome
  FROM profiles WHERE user_id = NEW.mittente_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, mittente_id)
  VALUES (
    _other_user_id,
    'messaggio_privato',
    'Nuovo messaggio',
    _sender_nome || ': ' || LEFT(NEW.testo, 50) || CASE WHEN LENGTH(NEW.testo) > 50 THEN '…' ELSE '' END,
    '/chat/' || _conv_id,
    NEW.mittente_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_messaggio_privato ON public.messaggi_privati;
CREATE TRIGGER trg_notify_messaggio_privato
  AFTER INSERT ON public.messaggi_privati
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_messaggio_privato();
