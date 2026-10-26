import { describe, expect, it } from "vitest";
import { pickEventsToPost, socialMessage } from "./socialPost";

const now = new Date("2026-10-26T07:00:00Z");
const ev = (id: string, data: string, posted: string | null = null) => ({
  id, titolo: id, data, luogo: "Milano", immagine: null, social_posted_at: posted,
});

describe("social auto publish", () => {
  it("posts at most 3 events per day, nearest first", () => {
    const list = [ev("d", "2026-10-30T10:00:00Z"), ev("a", "2026-10-26T18:00:00Z"), ev("c", "2026-10-28T10:00:00Z"), ev("b", "2026-10-27T10:00:00Z")];
    expect(pickEventsToPost(list, now).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("never reposts an event already published", () => {
    expect(pickEventsToPost([ev("a", "2026-10-27T10:00:00Z", "2026-10-25T08:00:00Z")], now)).toEqual([]);
  });

  it("ignores events beyond the next 7 days", () => {
    expect(pickEventsToPost([ev("far", "2026-11-05T10:00:00Z")], now)).toEqual([]);
  });

  it("includes the event link in the message", () => {
    expect(socialMessage(ev("x1", "2026-10-27T10:00:00Z"))).toContain("https://www.milanohelp.it/evento/x1");
  });
});
