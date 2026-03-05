
-- Table for likes on private messages
CREATE TABLE IF NOT EXISTS public.messaggi_privati_piace (
  user_id UUID NOT NULL,
  messaggio_id UUID NOT NULL REFERENCES public.messaggi_privati(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (messaggio_id, user_id)
);

ALTER TABLE public.messaggi_privati_piace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_msg_privati_likes" ON public.messaggi_privati_piace FOR SELECT USING (true);
CREATE POLICY "like_msg_privati" ON public.messaggi_privati_piace FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike_msg_privati" ON public.messaggi_privati_piace FOR DELETE USING (auth.uid() = user_id);

-- Table for likes on group messages
CREATE TABLE IF NOT EXISTS public.gruppi_messaggi_piace (
  user_id UUID NOT NULL,
  messaggio_id UUID NOT NULL REFERENCES public.gruppi_messaggi(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (messaggio_id, user_id)
);

ALTER TABLE public.gruppi_messaggi_piace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_group_msg_likes" ON public.gruppi_messaggi_piace FOR SELECT USING (true);
CREATE POLICY "like_group_msg" ON public.gruppi_messaggi_piace FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike_group_msg" ON public.gruppi_messaggi_piace FOR DELETE USING (auth.uid() = user_id);

-- Notification trigger for private message likes
CREATE OR REPLACE FUNCTION public.notify_like_messaggio_privato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _msg_user_id uuid;
  _liker_nome text;
  _conv_id uuid;
BEGIN
  SELECT mittente_id, conversazione_id INTO _msg_user_id, _conv_id
  FROM messaggi_privati WHERE id = NEW.messaggio_id;
  
  IF _msg_user_id IS NULL OR _msg_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(nome, username, 'Qualcuno') INTO _liker_nome
  FROM profiles WHERE user_id = NEW.user_id;
  
  INSERT INTO notifiche (user_id, tipo, titolo, messaggio, link, riferimento_id, mittente_id)
  VALUES (_msg_user_id, 'like_messaggio', 'Nuovo like',
    _liker_nome || ' ha messo like al tuo messaggio',
    '/chat/' || _conv_id, NEW.messaggio_id, NEW.user_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_like_messaggio_privato
  AFTER INSERT ON public.messaggi_privati_piace
  FOR EACH ROW EXECUTE FUNCTION public.notify_like_messaggio_privato();

-- Notification trigger for group message likes
CREATE OR REPLACE FUNCTION public.notify_like_messaggio_gruppo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    '/gruppo/' || _gruppo_id, NEW.messaggio_id, NEW.user_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_like_messaggio_gruppo
  AFTER INSERT ON public.gruppi_messaggi_piace
  FOR EACH ROW EXECUTE FUNCTION public.notify_like_messaggio_gruppo();

-- Enable realtime for like tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaggi_privati_piace;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gruppi_messaggi_piace;
