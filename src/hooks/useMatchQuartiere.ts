import type { Quartiere } from "./useQuartieri";

/**
 * Dato un nome di quartiere grezzo (da geocoding), trova il micro-quartiere
 * più simile dalla lista fornita usando fuzzy matching.
 * Ora accetta una lista di quartieri come parametro invece di usare dati statici.
 */
export function matchQuartiere(
  raw: string,
  quartieriList: Quartiere[] | { nome: string }[] = []
): string | null {
  if (!raw || !raw.trim()) return null;
  if (quartieriList.length === 0) return null;

  const input = normalize(raw);

  // 1. Corrispondenza esatta
  const exact = quartieriList.find((q) => normalize(q.nome) === input);
  if (exact) return exact.nome;

  // 2. Il nome del quartiere contiene l'input o viceversa
  const contains = quartieriList.find(
    (q) =>
      normalize(q.nome).includes(input) || input.includes(normalize(q.nome))
  );
  if (contains) return contains.nome;

  // 3. Match per parole chiave
  const inputTokens = tokenize(input);

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const q of quartieriList) {
    const qTokens = tokenize(normalize(q.nome));
    let score = 0;
    for (const it of inputTokens) {
      for (const qt of qTokens) {
        if (qt.includes(it) || it.includes(qt)) {
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "'")
    .trim();
}

function tokenize(s: string): string[] {
  return s.split(/[\s/,\-()]+/).filter((t) => t.length >= 3);
}
