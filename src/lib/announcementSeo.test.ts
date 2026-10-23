import { describe, expect, it } from "vitest";
import { isIndexableAnnouncement, directoryPage, announcementHeadData } from "./announcementSeo";

describe("announcement publication rules", () => {
  it("indexes published active announcements", () => {
    expect(isIndexableAnnouncement("attivo")).toBe(true);
  });
  it.each(["in_moderazione", "rifiutato", "scaduto", "eliminato", null, undefined])("does not index %s announcements", stato => {
    expect(isIndexableAnnouncement(stato)).toBe(false);
  });
  it("uses valid positive page numbers only", () => {
    expect(directoryPage("2")).toBe(2);
    expect(directoryPage("-1")).toBe(1);
    expect(directoryPage("1.5")).toBe(1);
    expect(directoryPage(null)).toBe(1);
  });
});

describe("announcement share preview", () => {
  const base = { titolo: "Bici da città", descrizione: "Bici usata in ottimo stato", quartiere: "Isola", stato: "attivo", immagini: ["https://cdn.example.com/bici.jpg"] };

  it("shows the announcement's own title and description, marked as Milano Help", () => {
    const seo = announcementHeadData("abc", base);
    expect(seo.title).toBe("Bici da città | Milano Help");
    expect(seo.description).toBe("Bici usata in ottimo stato");
    expect(seo.url).toBe("https://www.milanohelp.it/annuncio/abc");
  });
  it("uses the announcement's first photo as preview image", () => {
    expect(announcementHeadData("abc", base).image).toBe("https://cdn.example.com/bici.jpg");
  });
  it("does not expose details of non-active announcements", () => {
    const seo = announcementHeadData("abc", { ...base, stato: "in_moderazione" });
    expect(seo.title).toBe("Annuncio non disponibile | Milano Help");
    expect(seo.image).toBeNull();
    expect(seo.robots).toBe("noindex,follow");
  });
});
