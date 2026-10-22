import { createClient } from "npm:@supabase/supabase-js@2";

// Live sitemap: always lists current active announcements, without needing a site publish.
const SITE = "https://www.milanohelp.it";
const STATIC = ["/", "/annunci", "/categories", "/how-it-works", "/gruppi", "/privacy", "/termini", "/eventi", "/donazioni", "/contattaci", "/collabora", "/faq"];
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const paths = [...STATIC];
  for (let from = 0; from < 49000; from += 1000) {
    const { data, error } = await db.from("annunci").select("id").eq("stato", "attivo").order("id").range(from, from + 999);
    if (error) return new Response("error", { status: 500 });
    for (const a of data || []) paths.push(`/annuncio/${encodeURIComponent(a.id)}`);
    if (!data || data.length < 1000) break;
  }
  const { data: cats } = await db.from("categorie_annunci").select("nome").order("id");
  for (const c of cats || []) paths.push(`/categoria/${encodeURIComponent(c.nome)}`);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map(p => `  <url><loc>${esc(SITE + p)}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
});
