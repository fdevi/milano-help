import { describe, expect, it } from "vitest";
import { instagramCaption, pickEventsToPost, socialMessage } from "./socialPost";

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

  it("instagram caption points to the bio link instead of a raw URL", () => {
    const caption = instagramCaption(ev("x1", "2026-10-27T10:00:00Z"));
    expect(caption).toContain("Link agli eventi in bio");
    expect(caption).not.toContain("https://");
  });
});

import { IG_MAX_RUNS, IG_ROUND_DELAYS_MS, containerReusable, pickInstagramRetries } from "./socialPost";

const pend = (id: string, extra: Partial<Parameters<typeof pickInstagramRetries>[0][number]> = {}) => ({
  id, data: "2026-10-29T09:00:00Z", immagine: "https://img/x.jpg", social_posted_at: "2026-10-28T07:00:00Z",
  ig_posted_at: null, ig_giri: 1, ...extra,
});

describe("instagram recovery", () => {
  const at = new Date("2026-10-28T07:30:00Z");
  it("retries an instagram post that failed after facebook went out", () => {
    expect(pickInstagramRetries([pend("a")], at).map((e) => e.id)).toEqual(["a"]);
  });
  it("never retries an instagram post already published", () => {
    expect(pickInstagramRetries([pend("a", { ig_posted_at: "2026-10-28T07:01:00Z" })], at)).toEqual([]);
  });
  it("stops retrying once the event has started", () => {
    expect(pickInstagramRetries([pend("a", { data: "2026-10-28T07:00:00Z" })], at)).toEqual([]);
  });
  it(`gives up after ${IG_MAX_RUNS} scheduled runs`, () => {
    expect(pickInstagramRetries([pend("a", { ig_giri: 3 })], at)).toEqual([]);
  });
  it("waits at least 8 rounds with progressive backoff starting at 5 seconds", () => {
    expect(IG_ROUND_DELAYS_MS.length).toBeGreaterThanOrEqual(8);
    expect(IG_ROUND_DELAYS_MS[0]).toBe(5000);
  });
  it("reuses a Meta container only within 23 hours", () => {
    expect(containerReusable("2026-10-27T09:00:00Z", at)).toBe(true);
    expect(containerReusable("2026-10-27T08:00:00Z", at)).toBe(false);
  });
});
