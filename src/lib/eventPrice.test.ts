import { describe, expect, it } from "vitest";
import { ticketmasterPrice } from "./ticketmasterPrice";
import { formatEventPrice } from "./eventPrice";

describe("Ticketmaster prices", () => {
  it("stores minimum 25, maximum 80 and currency for a paid event", () => {
    expect(ticketmasterPrice([{ min: 25, max: 80, currency: "EUR" }])).toEqual({ prezzo: 25, prezzo_max: 80, valuta: "EUR", gratuito: false });
  });
  it.each([undefined, [], [{ min: 0, max: 80 }]])("marks absent, empty or zero-minimum ranges free: %j", (ranges) => {
    expect(ticketmasterPrice(ranges)).toMatchObject({ prezzo: 0, prezzo_max: null, gratuito: true });
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
});