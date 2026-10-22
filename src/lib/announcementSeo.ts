export const SITE_URL = "https://www.milanohelp.it";
export const ANNOUNCEMENTS_PAGE_SIZE = 24;

export function isIndexableAnnouncement(stato: string | null | undefined) {
  return stato === "attivo";
}

export function announcementUrl(id: string) {
  return `${SITE_URL}/annuncio/${encodeURIComponent(id)}`;
}

export function announcementDescription(description: string | null, title: string, area?: string | null) {
  const text = (description || `${title} a ${area || "Milano"}. Scopri l'annuncio su Milano Help.`)
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export function directoryPage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function directoryUrl(page: number) {
  return `${SITE_URL}/annunci${page > 1 ? `?pagina=${page}` : ""}`;
}

export function sitemapXml(paths: string[]) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map(path => `  <url><loc>${escape(`${SITE_URL}${path}`)}</loc></url>`).join("\n")}\n</urlset>\n`;
}