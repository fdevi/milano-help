ALTER TABLE public.eventi ADD COLUMN IF NOT EXISTS prezzo_max numeric, ADD COLUMN IF NOT EXISTS valuta text;
COMMENT ON COLUMN public.eventi.prezzo IS 'Minimum event price; Ticketmaster priceRanges.min';
COMMENT ON COLUMN public.eventi.prezzo_max IS 'Maximum Ticketmaster price, if available';
COMMENT ON COLUMN public.eventi.valuta IS 'Original Ticketmaster price currency';