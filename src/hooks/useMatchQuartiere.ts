import { QUARTIERI } from "./useQuartieri";

/**
 * Dato un nome di quartiere grezzo (da geocoding), trova il micro-quartiere
 * più simile dalla lista ufficiale usando fuzzy matching.
 */
export function matchQuartiere(raw: string): string | null {
  if (!raw || !raw.trim()) return null;

  const input = normalize(raw);

  // 1. Corrispondenza esatta
  const exact = QUARTIERI.find(q => normalize(q.nome) === input);
  if (exact) return exact.nome;

  // 2. Il nome del quartiere contiene l'input o viceversa
  const contains = QUARTIERI.find(
    q => normalize(q.nome).includes(input) || input.includes(normalize(q.nome))
  );
  if (contains) return contains.nome;

  // 3. Match per parole chiave: splitta l'input e i nomi in token,
  //    cerca il quartiere con il maggior numero di token in comune
  const inputTokens = tokenize(input);

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const q of QUARTIERI) {
    const qTokens = tokenize(normalize(q.nome));
    let score = 0;
    for (const it of inputTokens) {
      for (const qt of qTokens) {
        if (qt.includes(it) || it.includes(qt)) {
          // Peso maggiore per match più lunghi
          score += Math.min(it.length, qt.length);
        }
      }
    }
    if (score > bestScore && score >= 3) {
      bestScore = score;
      bestMatch = q.nome;
    }
  }

  return bestMatch;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuovi accenti
    .replace(/[''`]/g, "'")
    .trim();
}

function tokenize(s: string): string[] {
  return s.split(/[\s/,\-()]+/).filter(t => t.length >= 3);
}
