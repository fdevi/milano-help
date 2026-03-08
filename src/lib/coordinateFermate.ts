/**
 * Coordinate (lat, lng) delle fermate per tracciare i percorsi sulla mappa.
 * Chiave = nome fermata come nei percorsi (fermateFinti).
 * Coordinate approssimative Milano (ATM / OSM).
 */

export interface CoordFermata {
  lat: number;
  lng: number;
}

export const coordinateFermate: Record<string, CoordFermata> = {
  // M3 Comasina – San Donato
  Comasina: { lat: 45.5182, lng: 9.1759 },
  "Affori FN": { lat: 45.5114, lng: 9.1742 },
  "Affori Centro": { lat: 45.5068, lng: 9.1728 },
  Dergano: { lat: 45.4972, lng: 9.1699 },
  Maciachini: { lat: 45.4934, lng: 9.1762 },
  Zara: { lat: 45.4919, lng: 9.1883 },
  Sondrio: { lat: 45.4892, lng: 9.1956 },
  "Centrale FS": { lat: 45.4856, lng: 9.2041 },
  Repubblica: { lat: 45.4739, lng: 9.2012 },
  Turati: { lat: 45.4712, lng: 9.2034 },
  Montenapoleone: { lat: 45.4692, lng: 9.1956 },
  Duomo: { lat: 45.4641, lng: 9.1898 },
  Missori: { lat: 45.4602, lng: 9.1934 },
  "Croce Rossa": { lat: 45.4558, lng: 9.1989 },
  "Porta Romana": { lat: 45.4521, lng: 9.2034 },
  "Lodi TIBB": { lat: 45.4489, lng: 9.2102 },
  Brenta: { lat: 45.4456, lng: 9.2178 },
  Corvetto: { lat: 45.4423, lng: 9.2245 },
  "Porto di Mare": { lat: 45.4389, lng: 9.2312 },
  "Rogoredo FS": { lat: 45.4483, lng: 9.2319 },
  "San Donato": { lat: 45.4167, lng: 9.2334 },

  // M5 Bignami – San Siro
  Bignami: { lat: 45.5212, lng: 9.2112 },
  Ponale: { lat: 45.5178, lng: 9.2056 },
  Bovisasca: { lat: 45.5145, lng: 9.1989 },
  "Via Imbonati": { lat: 45.5011, lng: 9.1756 },
  Isola: { lat: 45.4842, lng: 9.1889 },
  "Garibaldi FS": { lat: 45.4846, lng: 9.2044 },
  Monumentale: { lat: 45.4792, lng: 9.1789 },
  Cenisio: { lat: 45.4823, lng: 9.1656 },
  "Domodossola FN": { lat: 45.4845, lng: 9.1589 },
  "Tre Torri": { lat: 45.4789, lng: 9.1523 },
  Portello: { lat: 45.4756, lng: 9.1456 },
  "San Siro Ippodromo": { lat: 45.4723, lng: 9.1389 },
  "San Siro Stadio": { lat: 45.4689, lng: 9.1323 },
  Segesta: { lat: 45.4656, lng: 9.1256 },

  // Bus 70, 42
  Bovisa: { lat: 45.5089, lng: 9.1645 },
  "Prato Centenaro": { lat: 45.5123, lng: 9.1589 },

  // M1 Sesto – Bisceglie
  "Sesto 1º Maggio": { lat: 45.5345, lng: 9.2234 },
  "Sesto Marelli": { lat: 45.5289, lng: 9.2178 },
  Precotto: { lat: 45.5189, lng: 9.2123 },
  Gorla: { lat: 45.5123, lng: 9.2089 },
  Turro: { lat: 45.5056, lng: 9.2067 },
  Rovereto: { lat: 45.4989, lng: 9.2089 },
  Pasteur: { lat: 45.4912, lng: 9.2108 },
  Loreto: { lat: 45.4842, lng: 9.2108 },
  Lima: { lat: 45.4789, lng: 9.2089 },
  "Porta Venezia": { lat: 45.4722, lng: 9.2042 },
  Palestro: { lat: 45.4689, lng: 9.2012 },
  "San Babila": { lat: 45.4656, lng: 9.1956 },
  Cordusio: { lat: 45.4645, lng: 9.1889 },
  Cairoli: { lat: 45.4652, lng: 9.1845 },
  Cadorna: { lat: 45.4682, lng: 9.177 },
  Conciliazione: { lat: 45.4712, lng: 9.1689 },
  Pagano: { lat: 45.4745, lng: 9.1623 },
  "Buenos Aires": { lat: 45.4778, lng: 9.1556 },
  Wagner: { lat: 45.4812, lng: 9.1489 },
  "De Angeli": { lat: 45.4845, lng: 9.1423 },
  Gambara: { lat: 45.4878, lng: 9.1356 },
  "Bande Nere": { lat: 45.4912, lng: 9.1289 },
  Primaticcio: { lat: 45.4945, lng: 9.1223 },
  Inganni: { lat: 45.4978, lng: 9.1156 },
  Bisceglie: { lat: 45.5012, lng: 9.1089 },

  // M2
  "Cologno Nord": { lat: 45.5389, lng: 9.2789 },
  "Cologno Sud": { lat: 45.5323, lng: 9.2723 },
  "Cascina Gobba": { lat: 45.5256, lng: 9.2656 },
  Gessate: { lat: 45.5512, lng: 9.4389 },
  Vimodrone: { lat: 45.5123, lng: 9.2856 },
  "Cascina Burrona": { lat: 45.5056, lng: 9.2923 },
  Cernusco: { lat: 45.5256, lng: 9.3389 },
  "Villa Fiorita": { lat: 45.5189, lng: 9.3256 },
  Prestino: { lat: 45.5123, lng: 9.3123 },
  Gorgonzola: { lat: 45.5312, lng: 9.4056 },
  Bussero: { lat: 45.5245, lng: 9.3789 },
  "Cassina de' Pecchi": { lat: 45.5178, lng: 9.3523 },
  "Villa Pompea": { lat: 45.5112, lng: 9.3389 },
  Cimiano: { lat: 45.5045, lng: 9.3256 },
  Crescenzago: { lat: 45.4978, lng: 9.3123 },
  Udine: { lat: 45.4912, lng: 9.2989 },
  "Lambrate FS": { lat: 45.4819, lng: 9.2342 },
  Romolo: { lat: 45.4523, lng: 9.1656 },
  Famagosta: { lat: 45.4456, lng: 9.1523 },
  "Porta Genova": { lat: 45.4589, lng: 9.1689 },
  "Sant'Agostino": { lat: 45.4623, lng: 9.1723 },
  Lanza: { lat: 45.4689, lng: 9.1789 },
  Moscova: { lat: 45.4723, lng: 9.1856 },
  "Garibaldi FS": { lat: 45.4846, lng: 9.2044 },
  Gioia: { lat: 45.4867, lng: 9.2067 },

  // Bus 90, 91
  "Via Padova": { lat: 45.4889, lng: 9.2289 },
  Linate: { lat: 45.4489, lng: 9.2789 },
  Forlanini: { lat: 45.4512, lng: 9.2567 },
};

/**
 * Restituisce le coordinate per un elenco di nomi fermate (in ordine).
 * Esclude le fermate non presenti in coordinateFermate.
 */
export function coordinatePerPercorso(nomiFermate: string[]): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [];
  for (const nome of nomiFermate) {
    const c = coordinateFermate[nome];
    if (c) out.push({ lat: c.lat, lng: c.lng });
  }
  return out;
}
