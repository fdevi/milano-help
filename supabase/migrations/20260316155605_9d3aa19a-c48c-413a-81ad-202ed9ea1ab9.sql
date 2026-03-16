
-- Update notify_messaggio_privato to include message ID in link
CREATE OR REPLACE FUNCTION public.notify_messaggio_privato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    '/chat/' || _conv_id || '?message=' || NEW.id,
    NEW.mittente_id
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_like_messaggio_privato to include message ID in link
CREATE OR REPLACE FUNCTION public.notify_like_messaggio_privato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _msg_user_id uuid;
  _liker_nome text;
  _conv_id uuid;
  _msg_id uuid;
BEGIN
  SELECT mittente_id, conversazione_id, id INTO _msg_user_id, _conv_id, _msg_id
  FROM messaggi_privati WHERE id = NEW.messaggio_id;
  
  IF _msg_user_id IS NULL OR _msg_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _liker_nome
  FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  VALUES (_msg_user_id, 'like_messaggio', 'Nuovo like',
    _liker_nome || ' ha messo like al tuo messaggio',
    '/chat/' || _conv_id || '?message=' || NEW.messaggio_id, NEW.messaggio_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;

-- Update notify_like_messaggio_gruppo to include message ID in link
CREATE OR REPLACE FUNCTION public.notify_like_messaggio_gruppo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _msg_user_id uuid;
  _gruppo_id uuid;
  _liker_nome text;
BEGIN
  SELECT mittente_id, gruppo_id INTO _msg_user_id, _gruppo_id
  FROM gruppi_messaggi WHERE id = NEW.messaggio_id;
  
  IF _msg_user_id IS NULL OR _msg_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _liker_nome
  FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  VALUES (_msg_user_id, 'like_messaggio', 'Nuovo like',
    _liker_nome || ' ha messo like al tuo messaggio',
    '/gruppo/' || _gruppo_id || '?message=' || NEW.messaggio_id, NEW.messaggio_id, NEW.user_id);
  
  RETURN NEW;
END;
$function$;
