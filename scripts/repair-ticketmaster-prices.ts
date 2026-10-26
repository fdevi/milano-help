// One-time repair: bun scripts/repair-ticketmaster-prices.ts [--apply]
// Requires TICKETMASTER_API_KEY and a signed-in administrator session.
// Session: LOVABLE_BROWSER_SUPABASE_SESSION_JSON or `lovable auth-session --json --self`.
// Default is dry-run. Unavailable Ticketmaster events are left unchanged.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { ticketmasterPrice } from "../src/lib/ticketmasterPrice";

async function main() {
  const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
  const apiKey = env.TICKETMASTER_API_KEY;
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!apiKey || !url || !key) throw new Error("Missing Ticketmaster or public configuration");
  const session = env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON
    ? JSON.parse(env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON)
    : JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8")).session;
  if (!session?.access_token) throw new Error("Administrator session required");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  const { data: identity, error: authError } = await client.auth.getUser(session.access_token);
  if (authError || !identity.user) throw new Error("Invalid administrator session");
  const { data: admin, error: roleError } = await client.rpc("has_role", { _user_id: identity.user.id, _role: "admin" });
  const apply = process.argv.includes("--apply");
  if (apply && (roleError || !admin)) throw new Error("Only administrators can repair prices");
  const summary = { checked: 0, updated: 0, paid: 0, free: 0, unavailable: 0, failed: 0 };
  for (let offset = 0; ; offset += 100) {
    const { data: rows, error } = await client.from("eventi").select("id,external_id")
      .eq("fonte_esterna", "ticketmaster").order("id").range(offset, offset + 99);
    if (error) throw new Error("Could not read Ticketmaster events");
    for (const row of rows || []) {
      summary.checked++;
      const externalId = row.external_id?.replace(/^ticketmaster_/, "");
      if (!externalId) { summary.failed++; continue; }
      const endpoint = new URL(`https://app.ticketmaster.com/discovery/v2/events/${encodeURIComponent(externalId)}.json`);
      endpoint.searchParams.set("apikey", apiKey);
      try {
        let response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
        }
        if (response.status === 404 || response.status === 410) { summary.unavailable++; continue; }
        if (!response.ok) { summary.failed++; continue; }
        const event = await response.json();
        if (event.id !== externalId) { summary.failed++; continue; }
        const price = ticketmasterPrice(event.priceRanges);
        if (price.gratuito) summary.free++; else summary.paid++;
        if (apply) {
          const { data: saved, error: saveError } = await client.from("eventi").update(price)
            .eq("id", row.id).eq("fonte_esterna", "ticketmaster").select("id");
          if (saveError || saved?.length !== 1) summary.failed++;
          else summary.updated++;
        }
      } catch { summary.failed++; }
      finally { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!rows || rows.length < 100) break;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }));
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch(() => { console.error("Price repair failed; check configuration and administrator session."); process.exitCode = 1; });