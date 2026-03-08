/**
 * API fermate – placeholder per quando Lovable avrà creato le tabelle.
 * Le chiamate Supabase sono commentate; le funzioni restituiscono dati di esempio.
 */

// import { supabase } from "@/integrations/supabase/client";

export type TipoFermata = "Metro" | "Bus" | "Treno";

export interface Fermata {
  id: string;
  nome: string;
  linee: string[];
  lat: number;
  lng: number;
  tipo: TipoFermata;
}

export interface PercorsoLinea {
  linea: string;
  direzione: string;
  fermate: Fermata[];
}

export interface PreferitoFermata {
  id: string;
  userId: string;
  fermataId: string;
  fermata?: Fermata;
}

/** Dati di esempio usati dai placeholder (stesso set di Fermate.tsx) */
const FERMATE_ESEMPIO: Fermata[] = [
  { id: "1", nome: "Dergano M3", linee: ["M3"], lat: 45.4972, lng: 9.1699, tipo: "Metro" },
  { id: "2", nome: "Via Imbonati", linee: ["M5", "70", "42"], lat: 45.5011, lng: 9.1756, tipo: "Bus" },
  { id: "3", nome: "Zara M3 M5", linee: ["M3", "M5"], lat: 45.4919, lng: 9.1883, tipo: "Metro" },
  { id: "4", nome: "Loreto M1 M2", linee: ["M1", "M2"], lat: 45.4842, lng: 9.2108, tipo: "Metro" },
  { id: "5", nome: "Centrale FS", linee: ["M2", "M3"], lat: 45.4856, lng: 9.2041, tipo: "Metro" },
  { id: "6", nome: "Cadorna", linee: ["M1", "M2"], lat: 45.4682, lng: 9.177, tipo: "Metro" },
  { id: "7", nome: "Porta Garibaldi", linee: ["M2", "M5", "S1", "S2"], lat: 45.4846, lng: 9.2044, tipo: "Treno" },
  { id: "8", nome: "Porta Venezia", linee: ["M1"], lat: 45.4722, lng: 9.2042, tipo: "Metro" },
  { id: "9", nome: "Lambrate", linee: ["M2", "S1", "S2"], lat: 45.4819, lng: 9.2342, tipo: "Treno" },
  { id: "10", nome: "Rogoredo FS", linee: ["M3", "S1", "S2", "S12"], lat: 45.4483, lng: 9.2319, tipo: "Treno" },
];

function distanzaMetri(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Restituisce le fermate entro un raggio (metri) dalla posizione.
 * Placeholder: filtra FERMATE_ESEMPIO per distanza; quando pronto usare Supabase (es. RPC o query con bounds).
 */
export async function getFermateVicine(
  lat: number,
  lng: number,
  raggio: number
): Promise<Fermata[]> {
  // const { data, error } = await supabase.rpc('get_fermate_vicine', { lat, lng, raggio });
  // if (error) throw error;
  // return data ?? [];

  const vicine = FERMATE_ESEMPIO.filter((f) => {
    const d = distanzaMetri(lat, lng, f.lat, f.lng);
    return d <= raggio;
  });
  vicine.sort(
    (a, b) =>
      distanzaMetri(lat, lng, a.lat, a.lng) - distanzaMetri(lat, lng, b.lat, b.lng)
  );
  return Promise.resolve(vicine);
}

/**
 * Restituisce il percorso (sequenza fermate) di una linea in una direzione.
 * Placeholder: restituisce fermate di esempio che contengono quella linea; quando pronto usare tabella percorsi/fermate.
 */
export async function getPercorsiLinea(
  linea: string,
  direzione: string
): Promise<PercorsoLinea> {
  // const { data, error } = await supabase
  //   .from('percorsi_linea')
  //   .select('*, fermate(*)')
  //   .eq('linea', linea)
  //   .eq('direzione', direzione)
  //   .order('ordine');
  // if (error) throw error;

  const fermate = FERMATE_ESEMPIO.filter((f) => f.linee.includes(linea));
  return Promise.resolve({
    linea,
    direzione,
    fermate,
  });
}

/**
 * Salva una fermata tra i preferiti dell'utente.
 * Placeholder: solo log; quando pronto usare tabella preferiti_fermate.
 */
export async function salvaPreferito(
  userId: string,
  fermataId: string
): Promise<void> {
  // const { error } = await supabase
  //   .from('preferiti_fermate')
  //   .upsert({ user_id: userId, fermata_id: fermataId });
  // if (error) throw error;

  console.log("[fermate] salvaPreferito placeholder:", { userId, fermataId });
  return Promise.resolve();
}

/**
 * Rimuove una fermata dai preferiti dell'utente.
 * Placeholder: solo log; quando pronto usare Supabase delete.
 */
export async function rimuoviPreferito(
  userId: string,
  fermataId: string
): Promise<void> {
  // const { error } = await supabase
  //   .from('preferiti_fermate')
  //   .delete()
  //   .eq('user_id', userId)
  //   .eq('fermata_id', fermataId);
  // if (error) throw error;

  console.log("[fermate] rimuoviPreferito placeholder:", { userId, fermataId });
  return Promise.resolve();
}

/**
 * Restituisce le fermate preferite dell'utente.
 * Placeholder: restituisce prime 2 fermate di esempio; quando pronto join con tabella fermate.
 */
export async function getPreferiti(userId: string): Promise<PreferitoFermata[]> {
  // const { data, error } = await supabase
  //   .from('preferiti_fermate')
  //   .select('*, fermate(*)')
  //   .eq('user_id', userId);
  // if (error) throw error;
  // return data ?? [];

  const esempio = FERMATE_ESEMPIO.slice(0, 2).map((f) => ({
    id: `pref-${userId}-${f.id}`,
    userId,
    fermataId: f.id,
    fermata: f,
  }));
  return Promise.resolve(esempio);
}
