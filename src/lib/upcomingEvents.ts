import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Apply the date filter before the limit so past events cannot occupy the six slots. */
export function fetchUpcomingEvents(client: SupabaseClient<Database>, now = new Date()) {
  return client
    .from("eventi")
    .select("*")
    .eq("stato", "attivo")
    .gte("data", now.toISOString())
    .order("data", { ascending: true })
    .limit(6);
}