CREATE OR REPLACE FUNCTION public.toggle_like_annuncio(_annuncio_id uuid, _user_id uuid DEFAULT NULL::uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_id uuid;
  _exists boolean;
  _new_count integer;
BEGIN
  _actor_id := auth.uid();

  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  IF _user_id IS NOT NULL AND _user_id <> _actor_id THEN
    RAISE EXCEPTION 'User mismatch in toggle_like_annuncio';
  END IF;

  RAISE LOG '[toggle_like_annuncio] called annuncio_id=%, actor_id=%', _annuncio_id, _actor_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.annunci_mi_piace
    WHERE annuncio_id = _annuncio_id
      AND user_id = _actor_id
  ) INTO _exists;

  IF _exists THEN
    DELETE FROM public.annunci_mi_piace
    WHERE annuncio_id = _annuncio_id
      AND user_id = _actor_id;

    RAISE LOG '[toggle_like_annuncio] action=unlike annuncio_id=%, actor_id=%', _annuncio_id, _actor_id;
  ELSE
    INSERT INTO public.annunci_mi_piace (annuncio_id, user_id)
    VALUES (_annuncio_id, _actor_id)
    ON CONFLICT (user_id, annuncio_id) DO NOTHING;

    RAISE LOG '[toggle_like_annuncio] action=like annuncio_id=%, actor_id=%', _annuncio_id, _actor_id;
  END IF;

  UPDATE public.annunci a
  SET mi_piace = COALESCE((
    SELECT COUNT(*)::integer
    FROM public.annunci_mi_piace amp
    WHERE amp.annuncio_id = _annuncio_id
  ), 0)
  WHERE a.id = _annuncio_id
  RETURNING a.mi_piace INTO _new_count;

  RAISE LOG '[toggle_like_annuncio] new_count=% annuncio_id=%', COALESCE(_new_count, 0), _annuncio_id;

  RETURN COALESCE(_new_count, 0);
END;
$$;