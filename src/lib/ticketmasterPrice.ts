export interface TicketmasterPriceRange {
  min?: number;
  max?: number;
  currency?: string;
}

/**
 * Mappa i priceRanges di Ticketmaster sul prezzo dell'evento.
 * Tre stati possibili:
 * - min > 0: a pagamento (conserva minimo, massimo e valuta)
 * - min === 0: gratuito
 * - priceRanges assente/vuoto o senza min: prezzo sconosciuto (gratuito: null),
 *   perché Ticketmaster non espone i prezzi di molti eventi italiani e
 *   l'assenza del dato NON significa che l'evento sia gratuito.
 */
export function ticketmasterPrice(priceRanges?: TicketmasterPriceRange[] | null) {
  const range = priceRanges?.[0];
  const currency = range?.currency || "EUR";
  if (!range) {
    return { prezzo: null, prezzo_max: null, valuta: currency, gratuito: null };
  }
  const min = range.min;
  const max = range.max;
  if (typeof min === "number" && Number.isFinite(min) && min > 0) {
    return {
      prezzo: min,
      prezzo_max: typeof max === "number" && Number.isFinite(max) && max >= min ? max : null,
      valuta: currency,
      gratuito: false,
    };
  }
  if (min === 0) {
    return { prezzo: 0, prezzo_max: null, valuta: currency, gratuito: true };
  }
  return { prezzo: null, prezzo_max: null, valuta: currency, gratuito: null };
}
