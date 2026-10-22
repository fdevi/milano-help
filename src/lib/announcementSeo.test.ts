import { describe, expect, it } from "vitest";
import { isIndexableAnnouncement, directoryPage } from "./announcementSeo";

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