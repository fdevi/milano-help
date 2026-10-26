import { eventUrl } from "./eventSeo";

export const SOCIAL_DAILY_LIMIT = 3;
export const SOCIAL_WINDOW_DAYS = 7;

export interface SocialEvent {
  id: string;
  titolo: string;
  data: string;
  luogo: string;
  immagine: string | null;
  social_posted_at: string | null;
}

/** Window from start of today (Rome) to 7 days ahead. */
export function socialWindow(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + (SOCIAL_WINDOW_DAYS + 1) * 86400000 - 1);
  return { start, end };
}

/** Never-posted events in the window, nearest first, max 3. */
export function pickEventsToPost<T extends SocialEvent>(events: T[], now = new Date()): T[] {
  const { start, end } = socialWindow(now);
  return events
    .filter((e) => !e.social_posted_at)
    .filter((e) => {
      const d = new Date(e.data);
      return d >= start && d <= end;
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, SOCIAL_DAILY_LIMIT);
}

export function socialMessage(e: Pick<SocialEvent, "id" | "titolo" | "data" | "luogo">) {
  const data = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(e.data));
  return `📅 ${e.titolo} - ${data} a ${e.luogo}. Scopri di più: ${eventUrl(e.id)}`;
}
