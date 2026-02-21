-- Creatore e admin possono modificare e cancellare il gruppo
-- Sostituisce le policy che permettevano solo al creatore

DROP POLICY IF EXISTS "update_gruppi" ON public.gruppi;
DROP POLICY IF EXISTS "delete_gruppi" ON public.gruppi;

CREATE POLICY "update_gruppi" ON public.gruppi FOR UPDATE USING (
  auth.uid() = creatore_id
  OR EXISTS (
    SELECT 1 FROM public.gruppi_membri gm
    WHERE gm.gruppo_id = gruppi.id AND gm.user_id = auth.uid()
    AND gm.ruolo = 'admin' AND gm.stato = 'approvato'
  )
);

CREATE POLICY "delete_gruppi" ON public.gruppi FOR DELETE USING (
  auth.uid() = creatore_id
  OR EXISTS (
    SELECT 1 FROM public.gruppi_membri gm
    WHERE gm.gruppo_id = gruppi.id AND gm.user_id = auth.uid()
    AND gm.ruolo = 'admin' AND gm.stato = 'approvato'
  )
);
