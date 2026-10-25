import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Keep ongoing and future events; exclude ended events before selecting six slots. */
export function fetchUpcomingEvents(client: SupabaseClient<Database>, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return client
    .from("eventi")
    .select("*")
    .eq("stato", "attivo")
    .or(`fine.gte.${now.toISOString()},and(fine.is.null,data.gte.${startOfToday.toISOString()})`)
    .order("data", { ascending: true })
    .limit(6);
}