
CREATE TABLE IF NOT EXISTS public.messaggi_letti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gruppo_id UUID REFERENCES public.gruppi(id) ON DELETE CASCADE NOT NULL,
  ultimo_messaggio_letto_id UUID,
  ultimo_letto TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gruppo_id)
);

ALTER TABLE public.messaggi_letti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status" ON messaggi_letti
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status" ON messaggi_letti
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read status" ON messaggi_letti
  FOR UPDATE USING (auth.uid() = user_id);
