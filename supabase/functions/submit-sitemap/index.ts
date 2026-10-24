import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Daily: resubmit the live sitemap when published announcements or events change.
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const TARGET = "https://www.milanohelp.it/";
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const gsc = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovable || !gsc) return json({ error: "Missing Search Console credentials" }, 500);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Missing database configuration" }, 500);
  const db = createClient(url, key);
  const sitemap = "https://www.milanohelp.it/api/public/sitemap.xml";
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await db.from("annunci").select("id", { count: "exact", head: true })
    .eq("stato", "attivo").or(`moderato_il.gte.${since},created_at.gte.${since}`);
  if (error) return json({ error: error.message }, 500);
  const { count: eventCount, error: eventError } = await db.from("eventi").select("id", { count: "exact", head: true })
    .eq("stato", "attivo").or(`created_at.gte.${since},updated_at.gte.${since}`);
  if (eventError) return json({ error: eventError.message }, 500);
  if (!count && !eventCount) return json({ submitted: false, reason: "no new announcements or events" });
  const liveSitemap = await fetch(sitemap);
  if (!liveSitemap.ok || !(await liveSitemap.text()).includes("<urlset")) {
    return json({ submitted: false, reason: "live sitemap awaits site publication" });
  }

  const headers = { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": gsc };
  const list = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
  if (!list.ok) return json({ error: "list failed", status: list.status, details: await list.text() }, list.status);
  const { siteEntry = [] } = await list.json() as { siteEntry?: { siteUrl: string; permissionLevel?: string }[] };
  const verified = siteEntry.filter(e => e.permissionLevel !== "siteUnverifiedUser");
  const site = verified.find(e => e.siteUrl === TARGET) ?? verified.find(e => {
    if (e.siteUrl.startsWith("sc-domain:")) { const d = e.siteUrl.slice(10); return "www.milanohelp.it" === d || "www.milanohelp.it".endsWith(`.${d}`); }
    return TARGET.startsWith(e.siteUrl);
  });
  if (!site) return json({ error: "No verified Search Console property covers the site" }, 403);

  const put = await fetch(`${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/sitemaps/${encodeURIComponent(sitemap)}`, { method: "PUT", headers });
  if (!put.ok) {
    const details = await put.text();
    console.error(`Sitemap submit failed [${put.status}]: ${details}`);
    return json({ error: "submit failed", status: put.status, details }, put.status);
  }
  return json({ submitted: true, newAnnouncements: count, newEvents: eventCount });
});
