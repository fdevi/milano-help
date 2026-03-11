// Category emoji and pastel color mapping for events (especially PredictHQ)

const CATEGORY_MAP: Record<string, { emoji: string; bg: string }> = {
  concerts: { emoji: "🎵", bg: "bg-purple-100 dark:bg-purple-900/30" },
  music: { emoji: "🎵", bg: "bg-purple-100 dark:bg-purple-900/30" },
  "performing-arts": { emoji: "🎭", bg: "bg-pink-100 dark:bg-pink-900/30" },
  sports: { emoji: "🏀", bg: "bg-green-100 dark:bg-green-900/30" },
  conferences: { emoji: "📚", bg: "bg-blue-100 dark:bg-blue-900/30" },
  expos: { emoji: "📚", bg: "bg-blue-100 dark:bg-blue-900/30" },
  festivals: { emoji: "🎪", bg: "bg-orange-100 dark:bg-orange-900/30" },
  community: { emoji: "🤝", bg: "bg-teal-100 dark:bg-teal-900/30" },
  "school-holidays": { emoji: "🏫", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  "public-holidays": { emoji: "🎉", bg: "bg-red-100 dark:bg-red-900/30" },
  observances: { emoji: "📅", bg: "bg-slate-100 dark:bg-slate-900/30" },
  daylight_savings: { emoji: "⏰", bg: "bg-amber-100 dark:bg-amber-900/30" },
  "academic": { emoji: "🎓", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  terror: { emoji: "⚠️", bg: "bg-gray-100 dark:bg-gray-900/30" },
  severe_weather: { emoji: "🌪️", bg: "bg-gray-100 dark:bg-gray-900/30" },
  social: { emoji: "🤝", bg: "bg-teal-100 dark:bg-teal-900/30" },
  workshop: { emoji: "🛠️", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
  mercatino: { emoji: "🛍️", bg: "bg-amber-100 dark:bg-amber-900/30" },
  sport: { emoji: "🏀", bg: "bg-green-100 dark:bg-green-900/30" },
  cultura: { emoji: "🎨", bg: "bg-violet-100 dark:bg-violet-900/30" },
  volontariato: { emoji: "❤️", bg: "bg-rose-100 dark:bg-rose-900/30" },
};

const DEFAULT = { emoji: "📅", bg: "bg-muted" };

export function getCategoryStyle(categoria: string | null | undefined) {
  if (!categoria) return DEFAULT;
  const key = categoria.toLowerCase().trim();
  return CATEGORY_MAP[key] || DEFAULT;
}

/** Build a Google Maps link from coordinates */
export function getMapsLink(lat?: number | null, lon?: number | null, luogo?: string | null): string | null {
  if (lat && lon) {
    return `https://maps.google.com/?q=${lat},${lon}`;
  }
  if (luogo) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(luogo + " Milano")}`;
  }
  return null;
}

/** Build a Google search link for an event */
export function getSearchLink(titolo: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(titolo + " Milano evento")}`;
}

export function getAutoDescription(evento: {
  categoria?: string | null;
  data?: string | null;
  descrizione?: string | null;
  fonte_esterna?: string | null;
  luogo?: string | null;
  lat?: number | null;
  lon?: number | null;
  titolo?: string | null;
}): string {
  const desc = evento.descrizione?.trim();
  // If description is meaningful and not a PredictHQ placeholder, use it
  if (
    desc &&
    desc.length >= 10 &&
    !desc.toLowerCase().includes("sourced from predicthq")
  ) {
    return desc;
  }

  // Build a richer auto-description
  const cat = evento.categoria || "generico";
  const parts: string[] = [];

  const dataFormatted = evento.data
    ? new Date(evento.data).toLocaleDateString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  parts.push(`Evento di categoria "${cat}" a Milano.`);
  if (dataFormatted) parts.push(`📅 Data: ${dataFormatted}.`);
  if (evento.luogo) parts.push(`📍 Luogo: ${evento.luogo}.`);

  return parts.join(" ");
}
