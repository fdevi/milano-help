/**
 * Dati finti per la pagina Fermate: fermate con coordinate, percorsi delle linee, orari simulati.
 * Zona Dergano / via Cannero. Usato per testare l'interfaccia mobile-first.
 */

export type TipoFermata = "Metro" | "Bus" | "Treno";

export interface FermataFinto {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  linee: string[];
  tipo: TipoFermata;
}

/** Chiave orari: "LINEA-Direzione" (es. "M3-Comasina"). Direzione senza spazi. */
export type ChiaveOrario = string;

/** Elenco fermate con coordinate realistiche (zona Dergano + M3 + 70). */
export const fermate: FermataFinto[] = [
  // Zona Dergano / via Cannero
  { id: "1", nome: "Dergano M3", lat: 45.4972, lng: 9.1699, linee: ["M3", "70"], tipo: "Metro" },
  { id: "2", nome: "Maciachini", lat: 45.4934, lng: 9.1762, linee: ["M3", "70"], tipo: "Metro" },
  { id: "3", nome: "Zara M3 M5", lat: 45.4919, lng: 9.1883, linee: ["M3", "M5", "70"], tipo: "Metro" },
  { id: "4", nome: "Via Imbonati", lat: 45.5011, lng: 9.1756, linee: ["M5", "70", "42"], tipo: "Bus" },
  { id: "5", nome: "Bovisa", lat: 45.5089, lng: 9.1645, linee: ["70"], tipo: "Bus" },
  { id: "6", nome: "Affori FN", lat: 45.5114, lng: 9.1742, linee: ["M3"], tipo: "Metro" },
  { id: "7", nome: "Affori Centro", lat: 45.5068, lng: 9.1728, linee: ["M3"], tipo: "Metro" },
  { id: "8", nome: "Comasina", lat: 45.5182, lng: 9.1759, linee: ["M3"], tipo: "Metro" },
  { id: "9", nome: "Sondrio", lat: 45.4892, lng: 9.1956, linee: ["M3"], tipo: "Metro" },
  { id: "10", nome: "Centrale FS", lat: 45.4856, lng: 9.2041, linee: ["M2", "M3"], tipo: "Metro" },
  { id: "11", nome: "Repubblica", lat: 45.4739, lng: 9.2012, linee: ["M3"], tipo: "Metro" },
  { id: "12", nome: "Duomo", lat: 45.4641, lng: 9.1898, linee: ["M3"], tipo: "Metro" },
  { id: "13", nome: "Porta Romana", lat: 45.4521, lng: 9.2034, linee: ["M3"], tipo: "Metro" },
  { id: "14", nome: "Rogoredo FS", lat: 45.4483, lng: 9.2319, linee: ["M3"], tipo: "Treno" },
  { id: "15", nome: "San Donato", lat: 45.4167, lng: 9.2334, linee: ["M3"], tipo: "Metro" },
  { id: "16", nome: "Monumentale", lat: 45.4792, lng: 9.1789, linee: ["70"], tipo: "Bus" },
  { id: "17", nome: "Prato Centenaro", lat: 45.5123, lng: 9.1589, linee: ["70"], tipo: "Bus" },
  { id: "18", nome: "Turati", lat: 45.4712, lng: 9.2034, linee: ["M3"], tipo: "Metro" },
  { id: "19", nome: "Missori", lat: 45.4602, lng: 9.1934, linee: ["M3"], tipo: "Metro" },
  { id: "20", nome: "Lodi TIBB", lat: 45.4489, lng: 9.2102, linee: ["M3"], tipo: "Metro" },
  { id: "21", nome: "Corvetto", lat: 45.4423, lng: 9.2245, linee: ["M3"], tipo: "Metro" },
  { id: "22", nome: "Porto di Mare", lat: 45.4389, lng: 9.2312, linee: ["M3"], tipo: "Metro" },
  { id: "23", nome: "Brenta", lat: 45.4456, lng: 9.2178, linee: ["M3"], tipo: "Metro" },
  { id: "24", nome: "Croce Rossa", lat: 45.4558, lng: 9.1989, linee: ["M3"], tipo: "Metro" },
  { id: "25", nome: "Montenapoleone", lat: 45.4692, lng: 9.1956, linee: ["M3"], tipo: "Metro" },
];

/** Percorsi delle linee: per ogni linea, array di direzioni con sequenza fermate (nomi come in fermate[].nome). */
export const percorsi: Record<string, { nome: string; fermate: string[] }[]> = {
  M3: [
    {
      nome: "Comasina",
      fermate: [
        "Comasina",
        "Affori FN",
        "Affori Centro",
        "Dergano M3",
        "Maciachini",
        "Zara M3 M5",
        "Sondrio",
        "Centrale FS",
        "Repubblica",
        "Turati",
        "Montenapoleone",
        "Duomo",
        "Missori",
        "Croce Rossa",
        "Porta Romana",
        "Lodi TIBB",
        "Brenta",
        "Corvetto",
        "Porto di Mare",
        "Rogoredo FS",
        "San Donato",
      ],
    },
    {
      nome: "San Donato",
      fermate: [
        "San Donato",
        "Rogoredo FS",
        "Porto di Mare",
        "Corvetto",
        "Brenta",
        "Lodi TIBB",
        "Porta Romana",
        "Croce Rossa",
        "Missori",
        "Duomo",
        "Montenapoleone",
        "Turati",
        "Repubblica",
        "Centrale FS",
        "Sondrio",
        "Zara M3 M5",
        "Maciachini",
        "Dergano M3",
        "Affori Centro",
        "Affori FN",
        "Comasina",
      ],
    },
  ],
  "70": [
    {
      nome: "Monumentale",
      fermate: ["Monumentale", "Zara M3 M5", "Maciachini", "Dergano M3", "Bovisa", "Prato Centenaro"],
    },
    {
      nome: "Bovisa",
      fermate: ["Bovisa", "Dergano M3", "Maciachini", "Zara M3 M5", "Monumentale"],
    },
  ],
};

/** Orari finti: per ogni fermata (nome), per chiave "LINEA-Direzione", array di minuti di attesa. */
export const orariFinti: Record<string, Record<ChiaveOrario, number[]>> = {
  "Dergano M3": {
    "M3-Comasina": [3, 12, 22],
    "M3-San Donato": [5, 15, 25],
    "70-Monumentale": [8, 18, 28],
    "70-Bovisa": [10, 20, 30],
  },
  Maciachini: {
    "M3-Comasina": [2, 11, 21],
    "M3-San Donato": [6, 16, 26],
    "70-Monumentale": [7, 17, 27],
    "70-Bovisa": [11, 21, 31],
  },
  "Zara M3 M5": {
    "M3-Comasina": [2, 7, 12],
    "M3-San Donato": [4, 10, 18],
    "70-Monumentale": [4, 14, 24],
    "70-Bovisa": [6, 16, 26],
  },
  "Via Imbonati": {
    "70-Monumentale": [9, 19, 29],
    "70-Bovisa": [5, 15, 25],
  },
  Bovisa: {
    "70-Monumentale": [10, 20, 30],
    "70-Bovisa": [3, 13, 23],
  },
  "Affori FN": {
    "M3-Comasina": [1, 10, 20],
    "M3-San Donato": [7, 17, 27],
  },
  "Affori Centro": {
    "M3-Comasina": [2, 11, 21],
    "M3-San Donato": [6, 16, 26],
  },
  Comasina: {
    "M3-Comasina": [0, 9, 19],
    "M3-San Donato": [8, 18, 28],
  },
  Sondrio: {
    "M3-Comasina": [4, 13, 23],
    "M3-San Donato": [3, 9, 17],
  },
  "Centrale FS": {
    "M3-Comasina": [5, 14, 24],
    "M3-San Donato": [2, 8, 16],
  },
  Repubblica: {
    "M3-Comasina": [6, 15, 25],
    "M3-San Donato": [1, 7, 15],
  },
  Duomo: {
    "M3-Comasina": [8, 17, 27],
    "M3-San Donato": [4, 10, 18],
  },
  "Porta Romana": {
    "M3-Comasina": [10, 19, 29],
    "M3-San Donato": [2, 8, 16],
  },
  "Rogoredo FS": {
    "M3-Comasina": [12, 21, 31],
    "M3-San Donato": [2, 7, 12],
  },
  "San Donato": {
    "M3-Comasina": [14, 23, 33],
    "M3-San Donato": [0, 5, 10],
  },
  Monumentale: {
    "70-Monumentale": [0, 10, 20],
    "70-Bovisa": [8, 18, 28],
  },
  "Prato Centenaro": {
    "70-Monumentale": [12, 22, 32],
    "70-Bovisa": [5, 15, 25],
  },
};

/** Posizione finta "via Cannero" (Dergano) per test. */
export const VIA_CANNERO = { lat: 45.506, lng: 9.182 } as const;

/** Raggio default per "fermate vicine" in metri. */
export const RAGGIO_DEFAULT_M = 1500;

/**
 * Restituisce le fermate entro un raggio (metri) dalla posizione.
 * Usa la formula haversine per la distanza.
 */
export function getFermateVicineFinto(
  lat: number,
  lng: number,
  raggio: number = RAGGIO_DEFAULT_M
): FermataFinto[] {
  const R = 6371e3;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };
  const vicine = fermate.filter((f) => dist(lat, lng, f.lat, f.lng) <= raggio);
  vicine.sort((a, b) => dist(lat, lng, a.lat, a.lng) - dist(lat, lng, b.lat, b.lng));
  return vicine;
}

/** Alias nomi fermata -> nome in elenco (per compatibilità con fermateFinti, es. "Dergano" -> "Dergano M3"). */
const ALIAS_NOMI: Record<string, string> = {
  Dergano: "Dergano M3",
  Zara: "Zara M3 M5",
};

/**
 * Dato il nome di una fermata (come in percorsi), restituisce { lat, lng } dall'elenco fermate.
 * Se non trovata, prova con alias (es. "Dergano" -> "Dergano M3"). Ritorna undefined se assente.
 */
export function getCoordFermataByNome(nome: string): { lat: number; lng: number } | undefined {
  const nomeLookup = ALIAS_NOMI[nome] ?? nome;
  const f = fermate.find((x) => x.nome === nomeLookup);
  return f ? { lat: f.lat, lng: f.lng } : undefined;
}

/**
 * Converte una sequenza di nomi fermate (da percorsi) in coordinate in ordine.
 * Esclude i nomi non presenti in fermate.
 */
export function coordinatePerPercorsoFinto(
  nomiFermate: string[]
): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  for (const nome of nomiFermate) {
    const c = getCoordFermataByNome(nome);
    if (c) out.push(c);
  }
  return out;
}

/**
 * Chiave orario per linea e direzione (es. "M3-Comasina", "70-Bovisa").
 */
export function chiaveOrario(linea: string, direzioneNome: string): ChiaveOrario {
  return `${linea}-${direzioneNome}`;
}
