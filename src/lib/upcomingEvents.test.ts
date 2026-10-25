import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchUpcomingEvents } from "./upcomingEvents";

function queryAtCurrentTime() {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  const client = { from: vi.fn(() => query) };
  fetchUpcomingEvents(client as unknown as SupabaseClient<Database>, new Date("2026-10-24T10:10:00Z"));
  return query;
}

describe("homepage upcoming events", () => {
  it("includes ongoing events with an end date and today's events without one before limiting", () => {
    const query = queryAtCurrentTime();
    const startOfToday = new Date("2026-10-24T10:10:00Z");
    startOfToday.setHours(0, 0, 0, 0);
    expect(query.or).toHaveBeenCalledWith(`fine.gte.2026-10-24T10:10:00.000Z,and(fine.is.null,data.gte.${startOfToday.toISOString()})`);
    const filterOrder = query.or.mock.invocationCallOrder[0];
    const limitOrder = query.limit.mock.invocationCallOrder[0];
    if (filterOrder === undefined || limitOrder === undefined) throw new Error("Missing query filter or limit");
    expect(filterOrder).toBeLessThan(limitOrder);
    expect(query.eq).toHaveBeenCalledWith("stato", "attivo");
  });

  it("orders events by the nearest upcoming start date", () => {
    expect(queryAtCurrentTime().order).toHaveBeenCalledWith("data", { ascending: true });
  });

  it("keeps the homepage limited to six upcoming events", () => {
    expect(queryAtCurrentTime().limit).toHaveBeenCalledWith(6);
  });
});