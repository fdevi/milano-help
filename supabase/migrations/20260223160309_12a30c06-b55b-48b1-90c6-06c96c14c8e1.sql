-- Add unique constraint for upsert on messaggi_privati_letti
ALTER TABLE messaggi_privati_letti 
ADD CONSTRAINT messaggi_privati_letti_conv_user_unique 
UNIQUE (conversazione_id, user_id);