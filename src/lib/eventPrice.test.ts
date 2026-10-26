import { describe, expect, it } from "vitest";
import { ticketmasterPrice } from "./ticketmasterPrice";
import { formatEventPrice } from "./eventPrice";

describe("Ticketmaster prices", () => {
  it("stores minimum 25, maximum 80 and currency for a paid event", () => {
    expect(ticketmasterPrice([{ min: 25, max: 80, currency: "EUR" }])).toEqual({ prezzo: 25, prezzo_max: 80, valuta: "EUR", gratuito: false });
  });
  it.each([undefined, [], [{}]])("marks absent, empty or min-less ranges as unknown price: %j", (ranges) => {
    expect(ticketmasterPrice(ranges)).toEqual({ prezzo: null, prezzo_max: null, valuta: "EUR", gratuito: null });
  });
  it("marks an explicit zero minimum as free", () => {
    expect(ticketmasterPrice([{ min: 0, max: 80 }])).toMatchObject({ prezzo: 0, prezzo_max: null, gratuito: true });
  });
  it("preserves original currency", () => {
    expect(ticketmasterPrice([{ min: 25, currency: "USD" }]).valuta).toBe("USD");
  });
  it("keeps an unavailable maximum null", () => {
    expect(ticketmasterPrice([{ min: 25 }])).toMatchObject({ prezzo: 25, prezzo_max: null, gratuito: false });
  });
  it("formats 25–80 in Italian EUR", () => {
    expect(formatEventPrice({ gratuito: false, prezzo: 25, prezzo_max: 80 })).toBe("25,00 € – 80,00 €");
  });
  it("formats a minimum-only price in Italian EUR", () => {
    expect(formatEventPrice({ gratuito: false, prezzo: 25 })).toBe("a partire da 25,00 €");
  });
  it("never infers free from missing paid-event pricing", () => {
    expect(formatEventPrice({ gratuito: false, prezzo: null })).toBe("A pagamento");
  });
  it("shows unknown price instead of a free badge when pricing is absent", () => {
    expect(formatEventPrice({ gratuito: null, prezzo: null })).toBe("Prezzo da verificare");
    expect(formatEventPrice({})).toBe("Prezzo da verificare");
  });
  it("shows the free badge only for explicitly free events", () => {
    expect(formatEventPrice({ gratuito: true, prezzo: 0 })).toBe("Gratuito");
  });
});
