/**
 * Determines the temporal status of an event based on start/end dates.
 * - IN ARRIVO: event hasn't started yet
 * - IN CORSO: event is currently happening
 * - TERMINATO: event has ended
 */
export type EventTemporalStatus = "in_arrivo" | "in_corso" | "terminato";

export function getEventTemporalStatus(
  dataInizio: string,
  dataFine?: string | null
): EventTemporalStatus {
  const now = new Date();
  const inizio = new Date(dataInizio);

  // If no end date, event ends at 23:59:59 of the start day
  const fine = dataFine
    ? new Date(dataFine)
    : new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate(), 23, 59, 59);

  if (now < inizio) return "in_arrivo";
  if (now >= inizio && now <= fine) return "in_corso";
  return "terminato";
}

export function getEventStatusLabel(status: EventTemporalStatus): string {
  switch (status) {
    case "in_arrivo": return "In arrivo";
    case "in_corso": return "In corso";
    case "terminato": return "Terminato";
  }
}

export function getEventStatusColor(status: EventTemporalStatus): string {
  switch (status) {
    case "in_arrivo": return "bg-blue-100 text-blue-700 border-blue-200";
    case "in_corso": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "terminato": return "bg-muted text-muted-foreground border-border";
  }
}
