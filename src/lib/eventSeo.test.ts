import { describe, expect, it } from "vitest";
import { eventHeadData, eventUrl, isIndexableEvent } from "./eventSeo";

const event = {
  titolo: "Concerto in quartiere", descrizione: "Musica dal vivo a Milano.",
  luogo: "Alcatraz", stato: "attivo", immagine: "https://cdn.example.com/concerto.jpg",
  data: "2026-10-25T18:00:00Z", fine: null,
};

describe("published event visibility", () => {
  it("makes published events indexable, including existing past events", () => {
    expect(isIndexableEvent("attivo")).toBe(true);
    expect(eventHeadData("existing", { ...event, data: "2025-01-01T18:00:00Z" }).robots).toBe("index,follow");
  });
  it.each(["in_moderazione", "rifiutato", "scaduto", null, undefined])("does not index %s events", stato => {
    expect(isIndexableEvent(stato)).toBe(false);
  });
  it("does not expose unpublished event details in previews", () => {
    const seo = eventHeadData("hidden", { ...event, stato: "in_moderazione" });
    expect(seo.image).toBeNull();
    expect(seo.description).not.toContain("Musica");
    expect(seo.robots).toBe("noindex,follow");
  });
  it("shares the specific event photo and canonical Milano Help address", () => {
    const seo = eventHeadData("abc", event);
    expect(seo.image).toBe(event.immagine);
    expect(seo.url).toBe("https://www.milanohelp.it/evento/abc");
    expect(eventUrl("abc")).toBe(seo.url);
  });
});