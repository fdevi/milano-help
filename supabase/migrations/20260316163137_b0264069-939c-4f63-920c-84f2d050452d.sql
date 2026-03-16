CREATE OR REPLACE FUNCTION public.notify_messaggio_gruppo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sender_nome text;
  _gruppo_nome text;
  _preview text;
  _inserted_count integer := 0;
BEGIN
  RAISE LOG '[notify_messaggio_gruppo] start gruppo_id=%, message_id=%, sender_id=%', NEW.gruppo_id, NEW.id, NEW.mittente_id;

  SELECT COALESCE(nome, username, 'Qualcuno')
    INTO _sender_nome
  FROM public.profiles
  WHERE user_id = NEW.mittente_id;

  SELECT nome
    INTO _gruppo_nome
  FROM public.gruppi
  WHERE id = NEW.gruppo_id;

  _preview := LEFT(COALESCE(NEW.testo, ''), 50)
    || CASE WHEN LENGTH(COALESCE(NEW.testo, '')) > 50 THEN '…' ELSE '' END;

  INSERT INTO public.notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  SELECT
    gm.user_id,
    'messaggio_gruppo',
    'Nuovo messaggio nel gruppo',
    _sender_nome || ' in ' || COALESCE(_gruppo_nome, 'gruppo') || ': ' || _preview,
    '/gruppo/' || NEW.gruppo_id || '?message=' || NEW.id,
    NEW.id,
    NEW.mittente_id
  FROM public.gruppi_membri gm
  WHERE gm.gruppo_id = NEW.gruppo_id
    AND gm.stato = 'approvato'
    AND gm.user_id IS DISTINCT FROM NEW.mittente_id;

  GET DIAGNOSTICS _inserted_count = ROW_COUNT;

  RAISE LOG '[notify_messaggio_gruppo] inserted notifications=% gruppo_id=% message_id=%', _inserted_count, NEW.gruppo_id, NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_messaggio_gruppo ON public.gruppi_messaggi;

CREATE TRIGGER trg_notify_messaggio_gruppo
AFTER INSERT ON public.gruppi_messaggi
FOR EACH ROW
EXECUTE FUNCTION public.notify_messaggio_gruppo();