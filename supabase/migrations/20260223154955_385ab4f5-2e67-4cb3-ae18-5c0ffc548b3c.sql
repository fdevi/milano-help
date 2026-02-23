
-- Fix RLS on messaggi_privati_letti: allow users to insert and update their own read status
CREATE POLICY "Users can insert their read status"
  ON messaggi_privati_letti FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their read status"
  ON messaggi_privati_letti FOR UPDATE
  USING (auth.uid() = user_id);

-- Fix RLS on conversazioni_private: allow participants to update their conversations
CREATE POLICY "Users can update their conversations"
  ON conversazioni_private FOR UPDATE
  USING (auth.uid() = acquirente_id OR auth.uid() = venditore_id);

-- Fix RLS on messaggi_privati: allow participants to update messages (mark as read)
CREATE POLICY "Users can update messages in their conversations"
  ON messaggi_privati FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversazioni_private
    WHERE conversazioni_private.id = messaggi_privati.conversazione_id
    AND (auth.uid() = conversazioni_private.acquirente_id OR auth.uid() = conversazioni_private.venditore_id)
  ));
