
-- Add updated_at column to gruppi_messaggi
ALTER TABLE public.gruppi_messaggi ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Allow post authors to update their own posts
CREATE POLICY "update_own_group_msg"
ON public.gruppi_messaggi
FOR UPDATE
USING (auth.uid() = mittente_id)
WITH CHECK (auth.uid() = mittente_id);

-- Allow group admins to update posts in their groups
CREATE POLICY "admin_update_group_msg"
ON public.gruppi_messaggi
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.gruppi_membri gm
    WHERE gm.gruppo_id = gruppi_messaggi.gruppo_id
      AND gm.user_id = auth.uid()
      AND gm.ruolo = 'admin'
      AND gm.stato = 'approvato'
  )
);

-- Allow site admins to update any group message
CREATE POLICY "site_admin_update_group_msg"
ON public.gruppi_messaggi
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow post authors to delete their own posts
CREATE POLICY "delete_own_group_msg"
ON public.gruppi_messaggi
FOR DELETE
USING (auth.uid() = mittente_id);

-- Allow group admins to delete posts
CREATE POLICY "admin_delete_group_msg"
ON public.gruppi_messaggi
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.gruppi_membri gm
    WHERE gm.gruppo_id = gruppi_messaggi.gruppo_id
      AND gm.user_id = auth.uid()
      AND gm.ruolo = 'admin'
      AND gm.stato = 'approvato'
  )
);

-- Allow site admins to delete any group message
CREATE POLICY "site_admin_delete_group_msg"
ON public.gruppi_messaggi
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
