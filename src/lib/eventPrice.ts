export interface EventPrice {
  gratuito?: boolean | null;
  prezzo?: number | null;
  prezzo_max?: number | null;
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function formatEventPrice(event: EventPrice): string {
  if (event.gratuito) return "Gratuito";
  const min = event.prezzo;
  if (min == null || !Number.isFinite(min)) {
    // gratuito === false: sappiamo che è a pagamento ma non conosciamo l'importo.
    // gratuito null/undefined: prezzo sconosciuto, non mostriamo mai "Gratuito".
    return event.gratuito === false ? "A pagamento" : "Prezzo da verificare";
  }
  const max = event.prezzo_max;
  if (max != null && Number.isFinite(max) && max > min) return `${euro.format(min)} – ${euro.format(max)}`;
  return `a partire da ${euro.format(min)}`;
}
