/**
 * Dati finti per testare l'UI stile MooneyGo: percorsi e arrivi per fermata.
 * Chiave = nome fermata (come in FERMATE_INIZIALI / lista).
 */

export interface ArrivoFinto {
  tempo: number; // minuti
  tipo?: "treno" | "bus" | "metro";
}

export interface DirezioneFinta {
  nome: string; // capolinea / direzione
  fermate: string[];
  arrivi: ArrivoFinto[];
}

export interface ColoreLinea {
  bg: string;
  text: string;
}

export interface LineaFinta {
  nome: string;
  /** Colori ATM: M1 rosso, M2 verde, M3 giallo, M5 viola, bus blu. Compilato in getPercorsiPerFermata se assente. */
  colore?: ColoreLinea;
  direzioni: DirezioneFinta[];
}

/** Colori ufficiali linee ATM */
export const LINEA_COLORI: Record<string, ColoreLinea> = {
  M1: { bg: "#fef2f2", text: "#b91c1c" },
  M2: { bg: "#f0fdf4", text: "#15803d" },
  M3: { bg: "#fefce8", text: "#a16207" },
  M5: { bg: "#f5f3ff", text: "#6d28d9" },
  "70": { bg: "#eff6ff", text: "#1d4ed8" },
  "90": { bg: "#eff6ff", text: "#1d4ed8" },
  "91": { bg: "#eff6ff", text: "#1d4ed8" },
  "42": { bg: "#eff6ff", text: "#1d4ed8" },
};

const COLORE_DEFAULT: ColoreLinea = { bg: "#f1f5f9", text: "#475569" };

export function getColoreLinea(nome: string): ColoreLinea {
  return LINEA_COLORI[nome] ?? COLORE_DEFAULT;
}

export interface PercorsoFermataFinto {
  linee: LineaFinta[];
}

/** Percorsi e arrivi finti per nome fermata */
export const percorsiFinti: Record<string, PercorsoFermataFinto> = {
  "Dergano M3": {
    linee: [
      {
        nome: "M3",
        direzioni: [
          {
            nome: "Comasina",
            fermate: [
              "Comasina",
              "Affori FN",
              "Affori Centro",
              "Dergano",
              "Maciachini",
              "Zara",
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
            arrivi: [
              { tempo: 3, tipo: "metro" },
              { tempo: 8 },
              { tempo: 13 },
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
              "Zara",
              "Maciachini",
              "Dergano",
              "Affori Centro",
              "Affori FN",
              "Comasina",
            ],
            arrivi: [
              { tempo: 5, tipo: "metro" },
              { tempo: 12 },
              { tempo: 20 },
            ],
          },
        ],
      },
      {
        nome: "70",
        direzioni: [
          {
            nome: "Monumentale",
            fermate: ["Monumentale", "Zara", "Dergano", "Via Imbonati", "Bovisa", "Prato Centenaro"],
            arrivi: [{ tempo: 8 }, { tempo: 18 }],
          },
          {
            nome: "Bovisa",
            fermate: ["Bovisa", "Via Imbonati", "Dergano", "Zara", "Monumentale"],
            arrivi: [{ tempo: 6 }, { tempo: 14 }],
          },
        ],
      },
    ],
  },
  "Via Imbonati": {
    linee: [
      {
        nome: "M5",
        direzioni: [
          {
            nome: "Bignami",
            fermate: ["Bignami", "Ponale", "Bovisasca", "Via Imbonati", "Zara", "Isola", "Garibaldi FS", "Monumentale", "Cenisio", "Domodossola FN", "Tre Torri", "Portello", "San Siro Ippodromo", "San Siro Stadio", "Segesta"],
            arrivi: [{ tempo: 4 }, { tempo: 11 }],
          },
          {
            nome: "San Siro Stadio",
            fermate: ["San Siro Stadio", "San Siro Ippodromo", "Portello", "Tre Torri", "Domodossola FN", "Cenisio", "Monumentale", "Garibaldi FS", "Isola", "Zara", "Via Imbonati", "Bovisasca", "Ponale", "Bignami"],
            arrivi: [{ tempo: 7 }, { tempo: 15 }],
          },
        ],
      },
      {
        nome: "70",
        direzioni: [
          { nome: "Monumentale", fermate: ["Monumentale", "Zara", "Dergano", "Via Imbonati", "Bovisa"], arrivi: [{ tempo: 10 }, { tempo: 22 }] },
          { nome: "Bovisa", fermate: ["Bovisa", "Via Imbonati", "Dergano", "Zara"], arrivi: [{ tempo: 5 }, { tempo: 17 }] },
        ],
      },
      {
        nome: "42",
        direzioni: [
          { nome: "Loreto", fermate: ["Loreto", "Pasteur", "Via Imbonati", "Zara"], arrivi: [{ tempo: 6 }] },
          { nome: "Bovisa", fermate: ["Bovisa", "Via Imbonati", "Dergano"], arrivi: [{ tempo: 9 }, { tempo: 19 }] },
        ],
      },
    ],
  },
  "Zara M3 M5": {
    linee: [
      {
        nome: "M3",
        direzioni: [
          { nome: "Comasina", fermate: ["Comasina", "Affori FN", "Affori Centro", "Dergano", "Maciachini", "Zara", "Sondrio", "Centrale FS", "Repubblica", "Turati", "Montenapoleone", "Duomo", "Missori", "Croce Rossa", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [{ tempo: 2 }, { tempo: 7 }, { tempo: 12 }] },
          { nome: "San Donato", fermate: ["San Donato", "Rogoredo FS", "Porto di Mare", "Corvetto", "Brenta", "Lodi TIBB", "Porta Romana", "Croce Rossa", "Missori", "Duomo", "Montenapoleone", "Turati", "Repubblica", "Centrale FS", "Sondrio", "Zara", "Maciachini", "Dergano", "Affori Centro", "Affori FN", "Comasina"], arrivi: [{ tempo: 4 }, { tempo: 10 }, { tempo: 18 }] },
        ],
      },
      {
        nome: "M5",
        direzioni: [
          { nome: "Bignami", fermate: ["Bignami", "Ponale", "Bovisasca", "Via Imbonati", "Zara", "Isola", "Garibaldi FS", "Monumentale", "Cenisio", "Domodossola FN", "Tre Torri", "Portello", "San Siro Ippodromo", "San Siro Stadio", "Segesta"], arrivi: [{ tempo: 3 }, { tempo: 9 }] },
          { nome: "San Siro Stadio", fermate: ["San Siro Stadio", "San Siro Ippodromo", "Portello", "Tre Torri", "Domodossola FN", "Cenisio", "Monumentale", "Garibaldi FS", "Isola", "Zara", "Via Imbonati", "Bovisasca", "Ponale", "Bignami"], arrivi: [{ tempo: 6 }, { tempo: 14 }] },
        ],
      },
    ],
  },
  "Loreto M1 M2": {
    linee: [
      {
        nome: "M1",
        direzioni: [
          { nome: "Sesto 1º Maggio", fermate: ["Sesto 1º Maggio", "Sesto Marelli", "Precotto", "Gorla", "Turro", "Rovereto", "Pasteur", "Loreto", "Lima", "Porta Venezia", "Palestro", "San Babila", "Duomo", "Cordusio", "Cairoli", "Cadorna", "Conciliazione", "Pagano", "Buenos Aires", "Wagner", "De Angeli", "Gambara", "Bande Nere", "Primaticcio", "Inganni", "Bisceglie"], arrivi: [{ tempo: 2 }, { tempo: 8 }, { tempo: 14 }] },
          { nome: "Bisceglie", fermate: ["Bisceglie", "Inganni", "Primaticcio", "Bande Nere", "Gambara", "De Angeli", "Wagner", "Buenos Aires", "Pagano", "Conciliazione", "Cadorna", "Cairoli", "Duomo", "San Babila", "Palestro", "Porta Venezia", "Lima", "Loreto", "Pasteur", "Rovereto", "Turro", "Gorla", "Precotto", "Sesto Marelli", "Sesto 1º Maggio"], arrivi: [{ tempo: 5 }, { tempo: 11 }, { tempo: 19 }] },
        ],
      },
      {
        nome: "M2",
        direzioni: [
          { nome: "Cologno Nord", fermate: ["Cologno Nord", "Cologno Sud", "Cascina Gobba", "Gessate", "Vimodrone", "Cascina Burrona", "Cernusco", "Villa Fiorita", "Prestino", "Gorgonzola", "Bussero", "Cassina de' Pecchi", "Villa Pompea", "Cimiano", "Crescenzago", "Udine", "Lambrate FS", "Romolo", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [] },
          { nome: "Abbiategrasso", fermate: ["Abbiategrasso", "Romolo", "Famagosta", "Porta Genova", "Sant'Agostino", "Cadorna", "Lanza", "Moscova", "Garibaldi FS", "Gioia", "Centrale FS", "Loreto", "Pasteur", "Udine", "Crescenzago", "Cimiano", "Villa Pompea", "Cassina de' Pecchi", "Bussero", "Gorgonzola", "Prestino", "Villa Fiorita", "Cernusco", "Cascina Burrona", "Vimodrone", "Cascina Gobba", "Cologno Sud", "Cologno Nord"], arrivi: [{ tempo: 1 }, { tempo: 6 }, { tempo: 12 }] },
        ],
      },
    ],
  },
  "Centrale FS": {
    linee: [
      {
        nome: "M2",
        direzioni: [
          { nome: "Cologno Nord", fermate: ["Cologno Nord", "Cologno Sud", "Cascina Gobba", "Gessate", "Vimodrone", "Cascina Burrona", "Cernusco", "Villa Fiorita", "Prestino", "Gorgonzola", "Bussero", "Cassina de' Pecchi", "Villa Pompea", "Cimiano", "Crescenzago", "Udine", "Lambrate FS", "Romolo", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [] },
          { nome: "Abbiategrasso", fermate: ["Abbiategrasso", "Romolo", "Famagosta", "Porta Genova", "Sant'Agostino", "Cadorna", "Lanza", "Moscova", "Garibaldi FS", "Gioia", "Centrale FS", "Loreto", "Pasteur", "Udine", "Crescenzago", "Cimiano", "Villa Pompea", "Cassina de' Pecchi", "Bussero", "Gorgonzola", "Prestino", "Villa Fiorita", "Cernusco", "Cascina Burrona", "Vimodrone", "Cascina Gobba", "Cologno Sud", "Cologno Nord"], arrivi: [{ tempo: 2 }, { tempo: 7 }, { tempo: 15 }] },
        ],
      },
      {
        nome: "M3",
        direzioni: [
          { nome: "Comasina", fermate: ["Comasina", "Affori FN", "Affori Centro", "Dergano", "Maciachini", "Zara", "Sondrio", "Centrale FS", "Repubblica", "Turati", "Montenapoleone", "Duomo", "Missori", "Croce Rossa", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [{ tempo: 1 }, { tempo: 6 }, { tempo: 11 }] },
          { nome: "San Donato", fermate: ["San Donato", "Rogoredo FS", "Porto di Mare", "Corvetto", "Brenta", "Lodi TIBB", "Porta Romana", "Croce Rossa", "Missori", "Duomo", "Montenapoleone", "Turati", "Repubblica", "Centrale FS", "Sondrio", "Zara", "Maciachini", "Dergano", "Affori Centro", "Affori FN", "Comasina"], arrivi: [{ tempo: 4 }, { tempo: 9 }, { tempo: 16 }] },
        ],
      },
    ],
  },
  "Cadorna": {
    linee: [
      {
        nome: "M1",
        direzioni: [
          { nome: "Sesto 1º Maggio", fermate: ["Sesto 1º Maggio", "Sesto Marelli", "Precotto", "Gorla", "Turro", "Rovereto", "Pasteur", "Loreto", "Lima", "Porta Venezia", "Palestro", "San Babila", "Duomo", "Cordusio", "Cairoli", "Cadorna", "Conciliazione", "Pagano", "Buenos Aires", "Wagner", "De Angeli", "Gambara", "Bande Nere", "Primaticcio", "Inganni", "Bisceglie"], arrivi: [{ tempo: 3 }, { tempo: 9 }] },
          { nome: "Bisceglie", fermate: ["Bisceglie", "Inganni", "Primaticcio", "Bande Nere", "Gambara", "De Angeli", "Wagner", "Buenos Aires", "Pagano", "Conciliazione", "Cadorna", "Cairoli", "Duomo", "San Babila", "Palestro", "Porta Venezia", "Lima", "Loreto", "Pasteur", "Rovereto", "Turro", "Gorla", "Precotto", "Sesto Marelli", "Sesto 1º Maggio"], arrivi: [{ tempo: 6 }, { tempo: 12 }] },
        ],
      },
      {
        nome: "M2",
        direzioni: [
          { nome: "Cologno Nord", fermate: ["Cologno Nord", "Cologno Sud", "Cascina Gobba", "Gessate", "Vimodrone", "Cascina Burrona", "Cernusco", "Villa Fiorita", "Prestino", "Gorgonzola", "Bussero", "Cassina de' Pecchi", "Villa Pompea", "Cimiano", "Crescenzago", "Udine", "Lambrate FS", "Romolo", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [] },
          { nome: "Abbiategrasso", fermate: ["Abbiategrasso", "Romolo", "Famagosta", "Porta Genova", "Sant'Agostino", "Cadorna", "Lanza", "Moscova", "Garibaldi FS", "Gioia", "Centrale FS", "Loreto", "Pasteur", "Udine", "Crescenzago", "Cimiano", "Villa Pompea", "Cassina de' Pecchi", "Bussero", "Gorgonzola", "Prestino", "Villa Fiorita", "Cernusco", "Cascina Burrona", "Vimodrone", "Cascina Gobba", "Cologno Sud", "Cologno Nord"], arrivi: [{ tempo: 2 }, { tempo: 8 }, { tempo: 14 }] },
        ],
      },
    ],
  },
  "Porta Garibaldi": {
    linee: [
      {
        nome: "M2",
        direzioni: [
          { nome: "Cologno Nord", fermate: ["Cologno Nord", "Cologno Sud", "Cascina Gobba", "Gessate", "Vimodrone", "Cascina Burrona", "Cernusco", "Villa Fiorita", "Prestino", "Gorgonzola", "Bussero", "Cassina de' Pecchi", "Villa Pompea", "Cimiano", "Crescenzago", "Udine", "Lambrate FS", "Romolo", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [] },
          { nome: "Abbiategrasso", fermate: ["Abbiategrasso", "Romolo", "Famagosta", "Porta Genova", "Sant'Agostino", "Cadorna", "Lanza", "Moscova", "Garibaldi FS", "Gioia", "Centrale FS", "Loreto", "Pasteur", "Udine", "Crescenzago", "Cimiano", "Villa Pompea", "Cassina de' Pecchi", "Bussero", "Gorgonzola", "Prestino", "Villa Fiorita", "Cernusco", "Cascina Burrona", "Vimodrone", "Cascina Gobba", "Cologno Sud", "Cologno Nord"], arrivi: [{ tempo: 1 }, { tempo: 6 }, { tempo: 13 }] },
        ],
      },
      {
        nome: "M5",
        direzioni: [
          { nome: "Bignami", fermate: ["Bignami", "Ponale", "Bovisasca", "Via Imbonati", "Zara", "Isola", "Garibaldi FS", "Monumentale", "Cenisio", "Domodossola FN", "Tre Torri", "Portello", "San Siro Ippodromo", "San Siro Stadio", "Segesta"], arrivi: [{ tempo: 4 }, { tempo: 10 }] },
          { nome: "San Siro Stadio", fermate: ["San Siro Stadio", "San Siro Ippodromo", "Portello", "Tre Torri", "Domodossola FN", "Cenisio", "Monumentale", "Garibaldi FS", "Isola", "Zara", "Via Imbonati", "Bovisasca", "Ponale", "Bignami"], arrivi: [{ tempo: 7 }, { tempo: 15 }] },
        ],
      },
    ],
  },
  "Porta Venezia": {
    linee: [
      {
        nome: "M1",
        direzioni: [
          { nome: "Sesto 1º Maggio", fermate: ["Sesto 1º Maggio", "Sesto Marelli", "Precotto", "Gorla", "Turro", "Rovereto", "Pasteur", "Loreto", "Lima", "Porta Venezia", "Palestro", "San Babila", "Duomo", "Cordusio", "Cairoli", "Cadorna", "Conciliazione", "Pagano", "Buenos Aires", "Wagner", "De Angeli", "Gambara", "Bande Nere", "Primaticcio", "Inganni", "Bisceglie"], arrivi: [{ tempo: 2 }, { tempo: 8 }, { tempo: 14 }] },
          { nome: "Bisceglie", fermate: ["Bisceglie", "Inganni", "Primaticcio", "Bande Nere", "Gambara", "De Angeli", "Wagner", "Buenos Aires", "Pagano", "Conciliazione", "Cadorna", "Cairoli", "Duomo", "San Babila", "Palestro", "Porta Venezia", "Lima", "Loreto", "Pasteur", "Rovereto", "Turro", "Gorla", "Precotto", "Sesto Marelli", "Sesto 1º Maggio"], arrivi: [{ tempo: 5 }, { tempo: 11 }, { tempo: 18 }] },
        ],
      },
    ],
  },
  "Lambrate": {
    linee: [
      {
        nome: "M2",
        direzioni: [
          { nome: "Cologno Nord", fermate: ["Cologno Nord", "Cologno Sud", "Cascina Gobba", "Gessate", "Vimodrone", "Cascina Burrona", "Cernusco", "Villa Fiorita", "Prestino", "Gorgonzola", "Bussero", "Cassina de' Pecchi", "Villa Pompea", "Cimiano", "Crescenzago", "Udine", "Lambrate FS", "Romolo", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [] },
          { nome: "Abbiategrasso", fermate: ["Abbiategrasso", "Romolo", "Famagosta", "Porta Genova", "Sant'Agostino", "Cadorna", "Lanza", "Moscova", "Garibaldi FS", "Gioia", "Centrale FS", "Loreto", "Pasteur", "Udine", "Crescenzago", "Cimiano", "Villa Pompea", "Cassina de' Pecchi", "Bussero", "Gorgonzola", "Prestino", "Villa Fiorita", "Cernusco", "Cascina Burrona", "Vimodrone", "Cascina Gobba", "Cologno Sud", "Cologno Nord"], arrivi: [{ tempo: 3 }, { tempo: 9 }, { tempo: 16 }] },
        ],
      },
      {
        nome: "90",
        direzioni: [
          { nome: "Romolo", fermate: ["Romolo", "Porta Romana", "Lodi TIBB", "Lambrate FS", "Via Padova", "Pasteur"], arrivi: [{ tempo: 6 }, { tempo: 14 }] },
          { nome: "Pasteur", fermate: ["Pasteur", "Via Padova", "Lambrate FS", "Lodi TIBB", "Porta Romana", "Romolo"], arrivi: [{ tempo: 4 }, { tempo: 12 }] },
        ],
      },
    ],
  },
  "Rogoredo FS": {
    linee: [
      {
        nome: "M3",
        direzioni: [
          { nome: "Comasina", fermate: ["Comasina", "Affori FN", "Affori Centro", "Dergano", "Maciachini", "Zara", "Sondrio", "Centrale FS", "Repubblica", "Turati", "Montenapoleone", "Duomo", "Missori", "Croce Rossa", "Porta Romana", "Lodi TIBB", "Brenta", "Corvetto", "Porto di Mare", "Rogoredo FS", "San Donato"], arrivi: [{ tempo: 2 }, { tempo: 7 }, { tempo: 12 }] },
          { nome: "San Donato", fermate: ["San Donato", "Rogoredo FS", "Porto di Mare", "Corvetto", "Brenta", "Lodi TIBB", "Porta Romana", "Croce Rossa", "Missori", "Duomo", "Montenapoleone", "Turati", "Repubblica", "Centrale FS", "Sondrio", "Zara", "Maciachini", "Dergano", "Affori Centro", "Affori FN", "Comasina"], arrivi: [{ tempo: 4 }, { tempo: 10 }, { tempo: 18 }] },
        ],
      },
      {
        nome: "91",
        direzioni: [
          { nome: "Linate", fermate: ["Linate", "Forlanini", "Rogoredo FS", "Corvetto", "Porta Romana"], arrivi: [{ tempo: 8 }, { tempo: 18 }] },
          { nome: "Porta Romana", fermate: ["Porta Romana", "Corvetto", "Rogoredo FS", "Forlanini", "Linate"], arrivi: [{ tempo: 5 }, { tempo: 15 }] },
        ],
      },
    ],
  },
};

/** Arricchisce le linee con colore se mancante */
function conColori(linee: LineaFinta[]): LineaFinta[] {
  return linee.map((l) => ({
    ...l,
    colore: l.colore ?? getColoreLinea(l.nome),
  }));
}

/** Restituisce i percorsi per una fermata; se non in mappa usa fallback con linee dalla fermata */
export function getPercorsiPerFermata(nomeFermata: string, lineeFermata: string[]): PercorsoFermataFinto {
  const found = percorsiFinti[nomeFermata];
  if (found) {
    return { linee: conColori(found.linee) };
  }
  return {
    linee: conColori(
      lineeFermata.map((nome) => ({
        nome,
        direzioni: [
          { nome: "Direzione A", fermate: [nomeFermata, "Fermata 2", "Capolinea"], arrivi: [{ tempo: 5 }, { tempo: 12 }] },
          { nome: "Direzione B", fermate: [nomeFermata, "Fermata 2", "Capolinea"], arrivi: [{ tempo: 7 }, { tempo: 15 }] },
        ],
      }))
    ),
  };
}
