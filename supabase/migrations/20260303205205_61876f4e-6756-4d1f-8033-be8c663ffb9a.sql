
CREATE TABLE public.email_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_email text NOT NULL,
  new_email text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.email_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email changes"
  ON public.email_changes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
