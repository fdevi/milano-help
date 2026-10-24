import { SITE_URL, announcementDescription } from "./announcementSeo";

export interface EventSeoInput {
  titolo: string;
  descrizione: string | null;
  luogo: string;
  stato: string | null;
  immagine: string | null;
  data: string;
  fine: string | null;
}

export function eventUrl(id: string) {
  return `${SITE_URL}/evento/${encodeURIComponent(id)}`;
}

export function isIndexableEvent(stato: string | null | undefined) {
  return stato === "attivo";
}

export function eventHeadData(id: string, event: EventSeoInput | null) {
  const active = !!event && isIndexableEvent(event.stato);
  const image = active && event.immagine?.startsWith("https://") ? event.immagine : null;
  const description = active
    ? announcementDescription(event.descrizione, event.titolo, event.luogo)
    : "Eventi della community di Milano Help.";
  return {
    title: active ? `${event.titolo} | Milano Help` : "Evento non disponibile | Milano Help",
    description,
    url: eventUrl(id),
    image,
    robots: active ? "index,follow" : "noindex,follow",
  };
}