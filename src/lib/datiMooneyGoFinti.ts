/**
 * Dati finti in stile MooneyGo per la pagina Fermate.
 * Zona Dergano: nomi completi "MILANO, ...", tipo fermata, distanza, linee con direzione e orario.
 */

export interface LineaFermataMooneyGo {
  numero: string;
  direzione: string;
  orarioPartenza: string;
}

export interface FermataMooneyGo {
  id: string;
  nomeCompleto: string;
  lat: number;
  lng: number;
  tipoFermata: string;
  distanzaMt: number;
  linee: LineaFermataMooneyGo[];
}

/** Centro zona fittizia (via Cannero / Dergano) */
export const CENTRO_ZONA = { lat: 45.506, lng: 9.182 } as const;

/** Elenco fermate nella zona Dergano, formato MooneyGo */
export const fermateMooneyGo: FermataMooneyGo[] = [
  {
    id: "1",
    nomeCompleto: "MILANO,Dergano M3, Milano",
    lat: 45.4972,
    lng: 9.1699,
    tipoFermata: "Fermata bus/tram",
    distanzaMt: 97,
    linee: [
      { numero: "70", direzione: "per MILANO,Monumentale M5", orarioPartenza: "0:20" },
      { numero: "153", direzione: "per MILANO,San Donato M3", orarioPartenza: "0:35" },
      { numero: "M3", direzione: "per Comasina", orarioPartenza: "0:12" },
      { numero: "M3", direzione: "per San Donato", orarioPartenza: "0:18" },
    ],
  },
  {
    id: "2",
    nomeCompleto: "MILANO,Maciachini M3, Milano",
    lat: 45.4934,
    lng: 9.1762,
    tipoFermata: "Metropolitana",
    distanzaMt: 245,
    linee: [
      { numero: "M3", direzione: "per Comasina", orarioPartenza: "0:08" },
      { numero: "M3", direzione: "per San Donato", orarioPartenza: "0:22" },
      { numero: "70", direzione: "per MILANO,Monumentale M5", orarioPartenza: "0:15" },
      { numero: "70", direzione: "per MILANO,Bovisa", orarioPartenza: "0:28" },
    ],
  },
  {
    id: "3",
    nomeCompleto: "MILANO,Zara M3 M5, Milano",
    lat: 45.4919,
    lng: 9.1883,
    tipoFermata: "Metropolitana",
    distanzaMt: 412,
    linee: [
      { numero: "M3", direzione: "per Comasina", orarioPartenza: "0:05" },
      { numero: "M3", direzione: "per San Donato", orarioPartenza: "0:25" },
      { numero: "M5", direzione: "per Bignami", orarioPartenza: "0:10" },
      { numero: "70", direzione: "per MILANO,Monumentale M5", orarioPartenza: "0:12" },
    ],
  },
  {
    id: "4",
    nomeCompleto: "MILANO, Via Imbonati, Milano",
    lat: 45.5011,
    lng: 9.1756,
    tipoFermata: "Fermata bus/tram",
    distanzaMt: 158,
    linee: [
      { numero: "70", direzione: "per MILANO,Bovisa", orarioPartenza: "0:18" },
      { numero: "70", direzione: "per MILANO,Monumentale M5", orarioPartenza: "0:32" },
    ],
  },
  {
    id: "5",
    nomeCompleto: "MILANO,Bovisa, Milano",
    lat: 45.5089,
    lng: 9.1645,
    tipoFermata: "Fermata bus/tram",
    distanzaMt: 520,
    linee: [
      { numero: "70", direzione: "per MILANO,Monumentale M5", orarioPartenza: "0:08" },
      { numero: "70", direzione: "per MILANO,Bovisa", orarioPartenza: "0:42" },
    ],
  },
];

/** Nome fermata breve per match con percorsi (es. "Dergano M3") */
export function nomeBreveFromCompleto(nomeCompleto: string): string {
  const m = nomeCompleto.match(/,\s*([^,]+),\s*Milano$/);
  return m ? m[1].trim() : nomeCompleto;
}

/** Percorsi per disegnare polyline: chiave "LINEA-DirezioneBreve", valore coordinate in ordine */
export interface PercorsoMooneyGo {
  fermateNomi: string[];
  coordinates: { lat: number; lng: number }[];
}

const COORD: Record<string, { lat: number; lng: number }> = {
  "Dergano M3": { lat: 45.4972, lng: 9.1699 },
  "Maciachini": { lat: 45.4934, lng: 9.1762 },
  "Zara M3 M5": { lat: 45.4919, lng: 9.1883 },
  "Via Imbonati": { lat: 45.5011, lng: 9.1756 },
  "Bovisa": { lat: 45.5089, lng: 9.1645 },
  "Monumentale": { lat: 45.4792, lng: 9.1789 },
  "Prato Centenaro": { lat: 45.5123, lng: 9.1589 },
  "Affori FN": { lat: 45.5114, lng: 9.1742 },
  "Affori Centro": { lat: 45.5068, lng: 9.1728 },
  "Comasina": { lat: 45.5182, lng: 9.1759 },
  "Sondrio": { lat: 45.4892, lng: 9.1956 },
  "Centrale FS": { lat: 45.4856, lng: 9.2041 },
  "San Donato": { lat: 45.4167, lng: 9.2334 },
  "Rogoredo FS": { lat: 45.4483, lng: 9.2319 },
};

function coordPath(nomi: string[]): { lat: number; lng: number }[] {
  return nomi.map((n) => COORD[n]).filter(Boolean);
}

/** Percorsi linea 70 e M3 per disegno su mappa */
export const percorsiMooneyGo: Record<string, PercorsoMooneyGo> = {
  "70-Monumentale M5": {
    fermateNomi: ["Prato Centenaro", "Bovisa", "Dergano M3", "Maciachini", "Zara M3 M5", "Monumentale"],
    coordinates: coordPath(["Prato Centenaro", "Bovisa", "Dergano M3", "Maciachini", "Zara M3 M5", "Monumentale"]),
  },
  "70-Bovisa": {
    fermateNomi: ["Monumentale", "Zara M3 M5", "Maciachini", "Dergano M3", "Bovisa"],
    coordinates: coordPath(["Monumentale", "Zara M3 M5", "Maciachini", "Dergano M3", "Bovisa"]),
  },
  "153-San Donato M3": {
    fermateNomi: ["Dergano M3", "Maciachini", "Zara M3 M5", "Sondrio", "Centrale FS", "Rogoredo FS", "San Donato"],
    coordinates: coordPath(["Dergano M3", "Maciachini", "Zara M3 M5", "Sondrio", "Centrale FS", "Rogoredo FS", "San Donato"]),
  },
  "M3-Comasina": {
    fermateNomi: ["Comasina", "Affori FN", "Affori Centro", "Dergano M3", "Maciachini", "Zara M3 M5", "Sondrio", "Centrale FS"],
    coordinates: coordPath(["Comasina", "Affori FN", "Affori Centro", "Dergano M3", "Maciachini", "Zara M3 M5", "Sondrio", "Centrale FS"]),
  },
  "M3-San Donato": {
    fermateNomi: ["Centrale FS", "Sondrio", "Zara M3 M5", "Maciachini", "Dergano M3", "Affori Centro", "Affori FN", "Comasina"],
    coordinates: coordPath(["Centrale FS", "Sondrio", "Zara M3 M5", "Maciachini", "Dergano M3", "Affori Centro", "Affori FN", "Comasina"]),
  },
};

/** Chiave percorso da numero linea e direzione (testo come in lista) */
export function chiavePercorso(numero: string, direzione: string): string {
  const dirBreve = direzione.replace(/^per\s+MILANO,?\s*/i, "").trim();
  return `${numero}-${dirBreve}`;
}

/** Restituisce il percorso per una linea+direzione; se non trovato prova solo numero-dirBreve */
export function getPercorsoPerLinea(numero: string, direzione: string): PercorsoMooneyGo | null {
  const key = chiavePercorso(numero, direzione);
  if (percorsiMooneyGo[key]) return percorsiMooneyGo[key];
  const dirBreve = direzione.replace(/^per\s+MILANO,\s*/i, "").trim();
  const key2 = `${numero}-${dirBreve}`;
  return percorsiMooneyGo[key2] ?? null;
}
