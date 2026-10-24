import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchUpcomingEvents } from "./upcomingEvents";

function queryAtCurrentTime() {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  const client = { from: vi.fn(() => query) };
  fetchUpcomingEvents(client as unknown as SupabaseClient<Database>, new Date("2026-10-24T10:10:00Z"));
  return query;
}

describe("homepage upcoming events", () => {
  it("excludes earlier start dates before selecting the six events", () => {
    const query = queryAtCurrentTime();
    expect(query.gte).toHaveBeenCalledWith("data", "2026-10-24T10:10:00.000Z");
    const filterOrder = query.gte.mock.invocationCallOrder[0];
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