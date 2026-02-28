
-- Tabella regioni
CREATE TABLE IF NOT EXISTS regioni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  codice_istat TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella province
CREATE TABLE IF NOT EXISTS province (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  regione_id UUID REFERENCES regioni(id) ON DELETE CASCADE,
  codice_istat TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome, regione_id)
);

-- Tabella comuni
CREATE TABLE IF NOT EXISTS comuni (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  provincia_id UUID REFERENCES province(id) ON DELETE CASCADE,
  cap TEXT[],
  lat FLOAT,
  lon FLOAT,
  codice_istat TEXT,
  attivo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome, provincia_id)
);

-- Tabella quartieri
CREATE TABLE IF NOT EXISTS quartieri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  comune_id UUID REFERENCES comuni(id) ON DELETE CASCADE,
  area TEXT,
  lat FLOAT,
  lon FLOAT,
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome, comune_id)
);

-- Indici
CREATE INDEX idx_comuni_attivo ON comuni(attivo);
CREATE INDEX idx_comuni_nome ON comuni(nome);
CREATE INDEX idx_quartieri_comune ON quartieri(comune_id);
CREATE INDEX idx_quartieri_nome ON quartieri(nome);

-- RLS
ALTER TABLE regioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE province ENABLE ROW LEVEL SECURITY;
ALTER TABLE comuni ENABLE ROW LEVEL SECURITY;
ALTER TABLE quartieri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura pubblica regioni" ON regioni FOR SELECT USING (true);
CREATE POLICY "Lettura pubblica province" ON province FOR SELECT USING (true);
CREATE POLICY "Lettura pubblica comuni" ON comuni FOR SELECT USING (true);
CREATE POLICY "Lettura pubblica quartieri" ON quartieri FOR SELECT USING (true);

-- Admin policies for management
CREATE POLICY "Admin gestione regioni" ON regioni FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin gestione province" ON province FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin gestione comuni" ON comuni FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin gestione quartieri" ON quartieri FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
