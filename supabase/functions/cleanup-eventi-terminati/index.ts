import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("[cleanup-eventi] Starting cleanup of terminated events older than 30 days...");

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Delete events where the end date (or start date + end of day if no end date) is older than 30 days
    // We need to find events that ended more than 30 days ago
    // 1. Events with explicit 'fine' column that is < thirtyDaysAgo
    // 2. Events without 'fine' where 'data' (start) + 1 day < thirtyDaysAgo
    const { data: deleted, error } = await supabase
      .from("eventi")
      .delete()
      .or(`fine.lt.${thirtyDaysAgo},and(fine.is.null,data.lt.${thirtyDaysAgo})`)
      .select("id, titolo");

    if (error) {
      console.error("[cleanup-eventi] Error deleting events:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cleanup-eventi] Deleted ${deleted?.length || 0} terminated events`);
    if (deleted && deleted.length > 0) {
      deleted.forEach((e: any) => console.log(`  - ${e.titolo} (${e.id})`));
    }

    return new Response(JSON.stringify({ deleted: deleted?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cleanup-eventi] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
