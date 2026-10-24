import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { sitemapXml } from "../src/lib/announcementSeo";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing public configuration for sitemap generation");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const paths = ["/", "/annunci", "/categories", "/how-it-works", "/gruppi", "/privacy", "/termini", "/eventi", "/donazioni", "/contattaci", "/collabora", "/faq"];
// Fetch every active row using the same publication filter as the public directory.
for (let from = 0; ; from += 1000) {
  const { data, error } = await client.from("annunci").select("id").eq("stato", "attivo").order("id").range(from, from + 999);
  if (error) throw new Error(`Unable to generate announcement sitemap: ${error.message}`);
  for (const item of data || []) paths.push(`/annuncio/${encodeURIComponent(item.id)}`);
  if (!data || data.length < 1000) break;
}
const { data: categories, error } = await client.from("categorie_annunci").select("nome").order("id");
for (let from = 0; ; from += 1000) {
  const { data, error } = await client.from("eventi").select("id").eq("stato", "attivo").order("id").range(from, from + 999);
  if (error) throw new Error(`Unable to generate event sitemap: ${error.message}`);
  for (const event of data || []) paths.push(`/evento/${encodeURIComponent(event.id)}`);
  if (!data || data.length < 1000) break;
}
if (error) throw new Error(`Unable to generate category sitemap: ${error.message}`);
for (const category of categories || []) paths.push(`/categoria/${encodeURIComponent(category.nome)}`);
if (paths.length > 50000) throw new Error("Sitemap requires splitting before publishing more than 50,000 URLs");
writeFileSync("public/sitemap.xml", sitemapXml(paths));
console.log(`Sitemap generated with ${paths.length} public URLs`);