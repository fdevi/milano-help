import { useState, useEffect } from "react";

interface Quartiere {
  nome: string;
  municipio: number;
}

// Lista completa dei quartieri di Milano (semplificata)
const QUARTIERI_MILANO: Quartiere[] = [
  { nome: "Affori", municipio: 9 },
  { nome: "Baggio", municipio: 7 },
  { nome: "Barona", municipio: 6 },
  { nome: "Bicocca", municipio: 9 },
  { nome: "Bovisa", municipio: 9 },
  { nome: "Brera", municipio: 1 },
  { nome: "Chiaravalle", municipio: 5 },
  { nome: "Chinatown", municipio: 8 },
  { nome: "Città Studi", municipio: 3 },
  { nome: "Corvetto", municipio: 4 },
  { nome: "Crescenzago", municipio: 2 },
  { nome: "Dergano", municipio: 9 },
  { nome: "Duomo", municipio: 1 },
  { nome: "Fiera", municipio: 8 },
  { nome: "Figino", municipio: 7 },
  { nome: "Gallaratese", municipio: 8 },
  { nome: "Giambellino", municipio: 6 },
  { nome: "Gorla", municipio: 2 },
  { nome: "Gratosoglio", municipio: 5 },
  { nome: "Greco", municipio: 2 },
  { nome: "Isola", municipio: 9 },
  { nome: "Lambrate", municipio: 3 },
  { nome: "Lampugnano", municipio: 8 },
  { nome: "Lorenteggio", municipio: 6 },
  { nome: "Maggiolina", municipio: 2 },
  { nome: "Musocco", municipio: 8 },
  { nome: "Navigli", municipio: 5 },
  { nome: "Niguarda", municipio: 9 },
  { nome: "NoLo", municipio: 2 },
  { nome: "Ortica", municipio: 3 },
  { nome: "Porta Garibaldi", municipio: 1 },
  { nome: "Porta Genova", municipio: 1 },
  { nome: "Porta Romana", municipio: 1 },
  { nome: "Porta Venezia", municipio: 1 },
  { nome: "Porta Vittoria", municipio: 1 },
  { nome: "Porta Volta", municipio: 8 },
  { nome: "Precotto", municipio: 2 },
  { nome: "QT8", municipio: 8 },
  { nome: "Quarto Oggiaro", municipio: 8 },
  { nome: "Rogoredo", municipio: 4 },
  { nome: "San Siro", municipio: 7 },
  { nome: "Santa Giulia", municipio: 4 },
  { nome: "Sempione", municipio: 8 },
  { nome: "Solari", municipio: 6 },
  { nome: "Taliedo", municipio: 4 },
  { nome: "Trenno", municipio: 8 },
  { nome: "Turro", municipio: 2 },
  { nome: "Vialba", municipio: 8 },
  { nome: "Vigentino", municipio: 5 },
  { nome: "Villapizzone", municipio: 8 },
  { nome: "Washington", municipio: 7 },
];

export const useQuartieri = () => {
  const [quartieri, setQuartieri] = useState<Quartiere[]>([]);

  useEffect(() => {
    setQuartieri(QUARTIERI_MILANO);
  }, []);

  return { quartieri };
};