/**
 * Abbrevia un indirizzo lungo per la visualizzazione mobile.
 * "Piazzale Francesco Accursio 12, 20156 Milano città metropolitana di Milano, Italia"
 * → "Piazzale F. Accursio 12, Milano"
 */
export function abbreviaIndirizzo(indirizzo: string): string {
  if (!indirizzo) return "";

  // Remove "città metropolitana di ...", "Italia", CAP codes
  let short = indirizzo
    .replace(/,?\s*citt[àa]\s+metropolitana\s+di\s+[^,]+/gi, "")
    .replace(/,?\s*Italia$/i, "")
    .replace(/,?\s*\d{5}\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();

  // Collapse multiple spaces
  short = short.replace(/\s{2,}/g, " ");

  return short;
}

/**
 * Formatta un intervallo di date in modo compatto per mobile.
 * "Dal 5 mar al 8 mar 2026" → "5-8 mar 2026"
 */
export function formatDateRangeCompact(
  start: Date,
  end: Date
): string {
  const sDay = start.getDate();
  const eDay = end.getDate();
  const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const sMonth = months[start.getMonth()];
  const eMonth = months[end.getMonth()];
  const eYear = end.getFullYear();

  if (sMonth === eMonth && start.getFullYear() === end.getFullYear()) {
    return `${sDay}-${eDay} ${sMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
}
