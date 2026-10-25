export interface TicketmasterPriceRange {
  min?: number;
  max?: number;
  currency?: string;
}

export function ticketmasterPrice(priceRanges?: TicketmasterPriceRange[] | null) {
  const range = priceRanges?.[0];
  const min = range?.min;
  const paid = typeof min === "number" && Number.isFinite(min) && min > 0;
  const max = range?.max;
  return {
    prezzo: paid ? min : 0,
    prezzo_max: paid && typeof max === "number" && Number.isFinite(max) && max >= min ? max : null,
    valuta: range?.currency || "EUR",
    gratuito: !paid,
  };
}