-- Add moderator policies for annunci (can approve/reject)
CREATE POLICY "Moderator can update annunci"
ON public.annunci
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Add moderator policies for eventi (can approve/reject)
CREATE POLICY "Moderator can update eventi"
ON public.eventi
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can view all annunci (including in_moderazione)
CREATE POLICY "Moderator can view all annunci"
ON public.annunci
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can view all eventi
CREATE POLICY "Moderator can view all eventi"
ON public.eventi
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can view segnalazioni
CREATE POLICY "Moderator can view segnalazioni"
ON public.segnalazioni
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can update segnalazioni
CREATE POLICY "Moderator can update segnalazioni"
ON public.segnalazioni
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can read activity_logs
CREATE POLICY "Moderator can read activity_logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));