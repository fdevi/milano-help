
CREATE OR REPLACE FUNCTION public.toggle_like_annuncio(_annuncio_id uuid, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _exists boolean;
  _new_count integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM annunci_mi_piace WHERE annuncio_id = _annuncio_id AND user_id = _user_id
  ) INTO _exists;

  IF _exists THEN
    DELETE FROM annunci_mi_piace WHERE annuncio_id = _annuncio_id AND user_id = _user_id;
  ELSE
    INSERT INTO annunci_mi_piace (annuncio_id, user_id) VALUES (_annuncio_id, _user_id);
  END IF;

  SELECT COUNT(*)::integer INTO _new_count FROM annunci_mi_piace WHERE annuncio_id = _annuncio_id;

  UPDATE annunci SET mi_piace = _new_count WHERE id = _annuncio_id;

  RETURN _new_count;
END;
$$;
