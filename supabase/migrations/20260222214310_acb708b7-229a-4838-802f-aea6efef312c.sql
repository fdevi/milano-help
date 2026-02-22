
-- Public function to count approved members of a group (no RLS restriction)
CREATE OR REPLACE FUNCTION public.count_group_members(_gruppo_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM gruppi_membri
  WHERE gruppo_id = _gruppo_id AND stato = 'approvato';
$$;
