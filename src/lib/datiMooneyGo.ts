// src/lib/datiMooneyGo.ts

export interface Fermata {
  id: string;
  nome: string;          // es. "MILANO,Dergano M3, Milano"
  tipo: string;          // es. "Fermata bus/tram", "Metropolitana"
  lat: number;
  lng: number;
  distanza: number;      // in metri
  linee: LineaPassaggio[];
}

export interface LineaPassaggio {
  numero: string;        // es. "70", "153", "M3"
  direzione: string;     // es. "per MILANO,Monumentale M5"
  orario: string;        // es. "0:20"
  percorsoId: string;    // chiave per percorsi
}

export interface Percorso {
  id: string;            // es. "70-Monumentale"
  nome: string;          // es. "70 per MILANO,Monumentale M5"
  colore: string;        // colore della linea
  fermate: {             // coordinate delle fermate in ordine
    nome: string;
    lat: number;
    lng: number;
  }[];
}

// Fermate nella zona Dergano
export const fermate: Fermata[] = [
  {
    id: 'dergano-m3',
    nome: 'MILANO,Dergano M3, Milano',
    tipo: 'Metropolitana',
    lat: 45.506,
    lng: 9.182,
    distanza: 97,
    linee: [
      { numero: 'M3', direzione: 'per Affori FN', orario: '0:22', percorsoId: 'M3-Affori' },
      { numero: 'M3', direzione: 'per San Donato', orario: '0:28', percorsoId: 'M3-SanDonato' },
      { numero: '70', direzione: 'per MILANO,Monumentale M5', orario: '0:20', percorsoId: '70-Monumentale' },
      { numero: '153', direzione: 'per MILANO,San Donato M3', orario: '0:35', percorsoId: '153-SanDonato' },
    ],
  },
  {
    id: 'maciachini',
    nome: 'MILANO,Maciachini, Milano',
    tipo: 'Metropolitana',
    lat: 45.498,
    lng: 9.185,
    distanza: 350,
    linee: [
      { numero: 'M3', direzione: 'per Affori FN', orario: '0:18', percorsoId: 'M3-Affori' },
      { numero: 'M3', direzione: 'per San Donato', orario: '0:32', percorsoId: 'M3-SanDonato' },
      { numero: '70', direzione: 'per MILANO,Monumentale M5', orario: '0:25', percorsoId: '70-Monumentale' },
    ],
  },
  {
    id: 'zara',
    nome: 'MILANO,Zara M3 M5, Milano',
    tipo: 'Metropolitana',
    lat: 45.491,
    lng: 9.189,
    distanza: 620,
    linee: [
      { numero: 'M3', direzione: 'per Affori FN', orario: '0:15', percorsoId: 'M3-Affori' },
      { numero: 'M3', direzione: 'per San Donato', orario: '0:35', percorsoId: 'M3-SanDonato' },
      { numero: 'M5', direzione: 'per Bignami', orario: '0:19', percorsoId: 'M5-Bignami' },
      { numero: 'M5', direzione: 'per San Siro', orario: '0:27', percorsoId: 'M5-SanSiro' },
    ],
  },
];

// Percorsi dettagliati (per disegnare le linee sulla mappa)
export const percorsi: Record<string, Percorso> = {
  '70-Monumentale': {
    id: '70-Monumentale',
    nome: '70 per MILANO,Monumentale M5',
    colore: '#0078ff',
    fermate: [
      { nome: 'MILANO,Q.re Bruzzano', lat: 45.523, lng: 9.167 },
      { nome: 'MILANO,Dergano M3', lat: 45.506, lng: 9.182 },
      { nome: 'MILANO,Maciachini', lat: 45.498, lng: 9.185 },
      { nome: 'MILANO,Zara', lat: 45.491, lng: 9.189 },
      { nome: 'MILANO,Monumentale M5', lat: 45.485, lng: 9.176 },
    ],
  },
  '153-SanDonato': {
    id: '153-SanDonato',
    nome: '153 per MILANO,San Donato M3',
    colore: '#ffaa00',
    fermate: [
      { nome: 'MILANO,Dergano M3', lat: 45.506, lng: 9.182 },
      { nome: 'MILANO,San Donato M3', lat: 45.443, lng: 9.221 },
    ],
  },
  'M3-Affori': {
    id: 'M3-Affori',
    nome: 'M3 per Affori FN',
    colore: '#f1c40f',
    fermate: [
      { nome: 'Affori FN', lat: 45.526, lng: 9.170 },
      { nome: 'Bovisa', lat: 45.517, lng: 9.170 },
      { nome: 'Maciachini', lat: 45.498, lng: 9.185 },
      { nome: 'Dergano M3', lat: 45.506, lng: 9.182 },
      { nome: 'Zara', lat: 45.491, lng: 9.189 },
    ],
  },
  'M3-SanDonato': {
    id: 'M3-SanDonato',
    nome: 'M3 per San Donato',
    colore: '#f1c40f',
    fermate: [
      { nome: 'Dergano M3', lat: 45.506, lng: 9.182 },
      { nome: 'Zara', lat: 45.491, lng: 9.189 },
      { nome: 'Centrale', lat: 45.485, lng: 9.202 },
      { nome: 'Duomo', lat: 45.464, lng: 9.190 },
      { nome: 'San Donato', lat: 45.443, lng: 9.221 },
    ],
  },
  'M5-Bignami': {
    id: 'M5-Bignami',
    nome: 'M5 per Bignami',
    colore: '#8e44ad',
    fermate: [
      { nome: 'Bignami', lat: 45.528, lng: 9.215 },
      { nome: 'Zara', lat: 45.491, lng: 9.189 },
    ],
  },
  'M5-SanSiro': {
    id: 'M5-SanSiro',
    nome: 'M5 per San Siro',
    colore: '#8e44ad',
    fermate: [
      { nome: 'Zara', lat: 45.491, lng: 9.189 },
      { nome: 'San Siro', lat: 45.475, lng: 9.143 },
    ],
  },
};