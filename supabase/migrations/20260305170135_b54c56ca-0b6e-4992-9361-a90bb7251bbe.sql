
-- Create eventi_commenti_piace table and functions together
CREATE TABLE public.eventi_commenti_piace (
  user_id uuid NOT NULL,
  commento_id uuid NOT NULL REFERENCES public.eventi_commenti(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, commento_id)
);

ALTER TABLE public.eventi_commenti_piace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_event_comment_likes" ON public.eventi_commenti_piace
  FOR SELECT USING (true);

CREATE POLICY "like_event_comments" ON public.eventi_commenti_piace
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "unlike_event_comments" ON public.eventi_commenti_piace
  FOR DELETE USING (auth.uid() = user_id);

-- Annunci comment like notification function
CREATE OR REPLACE FUNCTION public.notify_like_commento_annuncio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    '/annuncio/' || _annuncio_id, NEW.commento_id, NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Eventi comment like notification function
CREATE OR REPLACE FUNCTION public.notify_like_commento_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    '/evento/' || _evento_id, NEW.commento_id, NEW.user_id);
  
  RETURN NEW;
END;
$$;

-- Triggers
CREATE TRIGGER on_like_commento_annuncio
  AFTER INSERT ON public.annunci_commenti_piace
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_like_commento_annuncio();

CREATE TRIGGER on_like_commento_evento
  AFTER INSERT ON public.eventi_commenti_piace
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_like_commento_evento();
