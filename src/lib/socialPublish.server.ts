import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { eventUrl } from "./eventSeo";
import { pickEventsToPost, socialMessage, socialWindow } from "./socialPost";
import { ADMIN_USER_ID } from "./adminProfile";

const GRAPH = "https://graph.facebook.com/v26.0";

async function graphPost(path: string, body: Record<string, string>, token: string) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { code?: number; message?: string } };
  if (!res.ok || json.error) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: number };
    err.code = json.error?.code;
    throw err;
  }
  return json;
}

async function log(evento_id: string | null, piattaforma: string, esito: string, dettaglio?: string) {
  await supabaseAdmin.from("social_post_logs").insert({ evento_id, piattaforma, esito, dettaglio: dettaglio ?? null });
}

export async function runSocialPublish(onlyEventId?: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igId = process.env.META_IG_USER_ID;
  if (!token || !pageId || !igId) {
    await log(null, "sistema", "errore", "Token o ID Meta mancanti");
    return { posted: 0, error: "missing_config" };
  }

  const { start, end } = socialWindow();
  let q = supabaseAdmin
    .from("eventi")
    .select("id, titolo, data, luogo, immagine, social_posted_at")
    .eq("stato", "attivo")
    .is("social_posted_at", null)
    .gte("data", start.toISOString())
    .lte("data", end.toISOString())
    .order("data", { ascending: true })
    .limit(20);
  if (onlyEventId) q = q.eq("id", onlyEventId);
  const { data, error } = await q;
  if (error) throw error;

  const chosen = pickEventsToPost(data ?? []);
  // Page posts need a Page token: derive it from the stored user token.
  let pageToken = token;
  try {
    const r = await fetch(`${GRAPH}/${pageId}?fields=access_token`, { headers: { Authorization: `Bearer ${token}` } });
    const j = (await r.json()) as { access_token?: string };
    if (j.access_token) pageToken = j.access_token;
  } catch { /* fall back to the stored token */ }
  let tokenExpired = false;
  const results: Array<{ id: string; facebook: string; instagram: string }> = [];

  for (const e of chosen) {
    // Claim first: guarantees no double posting even after partial failure.
    const { data: claimed } = await supabaseAdmin
      .from("eventi")
      .update({ social_posted_at: new Date().toISOString() })
      .eq("id", e.id)
      .is("social_posted_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const message = socialMessage(e);
    const r = { id: e.id, facebook: "ok", instagram: "ok" };

    try {
      const fb = await graphPost(`${pageId}/feed`, { message, link: eventUrl(e.id) }, pageToken);
      await log(e.id, "facebook", "ok", fb.id);
    } catch (err) {
      const x = err as Error & { code?: number };
      if (x.code === 190) tokenExpired = true;
      r.facebook = x.message;
      await log(e.id, "facebook", "errore", `${x.code ?? ""} ${x.message}`);
    }

    if (e.immagine?.startsWith("https://")) {
      try {
        const c = await graphPost(`${igId}/media`, { image_url: e.immagine, caption: message }, token);
        const p = await graphPost(`${igId}/media_publish`, { creation_id: c.id! }, token);
        await log(e.id, "instagram", "ok", p.id);
      } catch (err) {
        const x = err as Error & { code?: number };
        if (x.code === 190) tokenExpired = true;
        r.instagram = x.message;
        await log(e.id, "instagram", "errore", `${x.code ?? ""} ${x.message}`);
      }
    } else {
      r.instagram = "nessuna immagine pubblica";
      await log(e.id, "instagram", "saltato", "Evento senza immagine pubblica");
    }
    results.push(r);
  }

  if (tokenExpired) {
    await log(null, "sistema", "avviso", "Token Meta scaduto (errore 190)");
    await supabaseAdmin.from("notifiche").insert({
      user_id: ADMIN_USER_ID,
      tipo: "sistema",
      titolo: "Token Facebook/Instagram scaduto",
      messaggio: "La pubblicazione automatica degli eventi sui social è fallita: rinnova il token Meta.",
    });
  }
  return { posted: results.length, results };
}
