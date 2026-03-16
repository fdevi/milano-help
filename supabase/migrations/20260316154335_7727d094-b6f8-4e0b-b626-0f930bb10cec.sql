
CREATE OR REPLACE FUNCTION public.notify_like_commento_annuncio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _commento_user_id uuid;
  _annuncio_id uuid;
  _liker_nome text;
BEGIN
  SELECT user_id, annuncio_id INTO _commento_user_id, _annuncio_id
  FROM annunci_commenti WHERE id = NEW.commento_id;
  
  IF _commento_user_id IS NULL OR _commento_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _liker_nome
  FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  VALUES (_commento_user_id, 'like_commento', 'Nuovo like',
    _liker_nome || ' ha messo like al tuo commento',
    '/annuncio/' || _annuncio_id || '#comment-' || NEW.commento_id, NEW.commento_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_like_commento_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _commento_user_id uuid;
  _evento_id uuid;
  _liker_nome text;
BEGIN
  SELECT user_id, evento_id INTO _commento_user_id, _evento_id
  FROM eventi_commenti WHERE id = NEW.commento_id;
  
  IF _commento_user_id IS NULL OR _commento_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _liker_nome
  FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  VALUES (_commento_user_id, 'like_commento', 'Nuovo like',
    _liker_nome || ' ha messo like al tuo commento',
    '/evento/' || _evento_id || '#comment-' || NEW.commento_id, NEW.commento_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;
