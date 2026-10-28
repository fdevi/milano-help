import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { eventUrl } from "./eventSeo";
import {
  IG_ROUND_DELAYS_MS,
  containerReusable,
  instagramCaption,
  pickEventsToPost,
  pickInstagramRetries,
  socialMessage,
  socialWindow,
} from "./socialPost";
import { ADMIN_USER_ID } from "./adminProfile";

const GRAPH = "https://graph.facebook.com/v26.0";

type MetaError = { code?: number; message?: string; error_subcode?: number; type?: string; fbtrace_id?: string };
type GraphError = Error & { code?: number; raw?: unknown };

async function graphCall(method: "GET" | "POST", path: string, token: string, body?: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: MetaError };
  if (!res.ok || json.error) {
    const e = json.error;
    const detail = e
      ? [e.message, e.error_subcode ? `subcode ${e.error_subcode}` : null, e.type, e.fbtrace_id ? `trace ${e.fbtrace_id}` : null]
          .filter(Boolean)
          .join(" | ")
      : `HTTP ${res.status}`;
    const err = new Error(detail) as GraphError;
    err.code = e?.code;
    err.raw = Object.keys(json).length ? json : { http_status: res.status };
    throw err;
  }
  return json;
}

const graphPost = (path: string, body: Record<string, string>, token: string) =>
  graphCall("POST", path, token, body) as Promise<{ id?: string }>;

interface LogExtra {
  creation_id?: string | null;
  tentativo?: number;
  risposta?: unknown;
}

async function log(evento_id: string | null, piattaforma: string, esito: string, dettaglio?: string, extra: LogExtra = {}) {
  await supabaseAdmin.from("social_post_logs").insert({
    evento_id,
    piattaforma,
    esito,
    dettaglio: dettaglio ?? null,
    creation_id: extra.creation_id ?? null,
    tentativo: extra.tentativo ?? null,
    risposta: (extra.risposta ?? null) as never,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface IgJob {
  id: string;
  titolo: string;
  data: string;
  luogo: string;
  immagine: string;
  ig_creation_id: string | null;
  ig_creation_at: string | null;
  ig_giri: number;
  done?: boolean;
  creationId?: string;
}

/**
 * Instagram in phases: create (or reuse) every container, then poll status_code and publish
 * with progressive backoff. Containers stay saved on the event so later runs can reuse them.
 */
async function publishInstagram(jobs: IgJob[], igId: string, token: string) {
  let tokenExpired = false;
  const results = new Map<string, string>();

  for (const j of jobs) {
    await supabaseAdmin.from("eventi").update({ ig_giri: j.ig_giri + 1 }).eq("id", j.id);
    if (j.ig_creation_id && containerReusable(j.ig_creation_at)) {
      j.creationId = j.ig_creation_id;
      await log(j.id, "instagram", "tentativo", "Riuso container esistente", { creation_id: j.creationId, tentativo: 0 });
      continue;
    }
    try {
      const c = await graphPost(`${igId}/media`, { image_url: j.immagine, caption: instagramCaption(j) }, token);
      j.creationId = c.id!;
      await supabaseAdmin
        .from("eventi")
        .update({ ig_creation_id: j.creationId, ig_creation_at: new Date().toISOString() })
        .eq("id", j.id);
      await log(j.id, "instagram", "tentativo", "Container creato", { creation_id: j.creationId, tentativo: 0, risposta: c });
    } catch (err) {
      const x = err as GraphError;
      if (x.code === 190) tokenExpired = true;
      j.done = true;
      results.set(j.id, x.message);
      await log(j.id, "instagram", "errore", `creazione container: ${x.code ?? ""} ${x.message}`, { tentativo: 0, risposta: x.raw });
    }
  }

  for (let round = 0; round < IG_ROUND_DELAYS_MS.length; round++) {
    const pending = jobs.filter((j) => !j.done && j.creationId);
    if (!pending.length) break;
    await sleep(IG_ROUND_DELAYS_MS[round]);
    const tentativo = round + 1;

    for (const j of pending) {
      const creation_id = j.creationId!;
      let status: string | undefined;
      try {
        const s = (await graphCall("GET", `${creation_id}?fields=status_code,status`, token)) as { status_code?: string };
        status = s.status_code;
        if (status !== "FINISHED") {
          await log(j.id, "instagram", "tentativo", `stato container ${status ?? "sconosciuto"}`, { creation_id, tentativo, risposta: s });
        }
        if (status === "PUBLISHED") {
          j.done = true;
          results.set(j.id, "ok");
          await supabaseAdmin.from("eventi").update({ ig_posted_at: new Date().toISOString() }).eq("id", j.id);
          await log(j.id, "instagram", "ok", "Container già pubblicato", { creation_id, tentativo, risposta: s });
          continue;
        }
        if (status === "ERROR" || status === "EXPIRED") {
          // Broken container: forget it so the next run recreates it from scratch.
          j.done = true;
          results.set(j.id, `container ${status}`);
          await supabaseAdmin.from("eventi").update({ ig_creation_id: null, ig_creation_at: null }).eq("id", j.id);
          await log(j.id, "instagram", "errore", `container ${status}`, { creation_id, tentativo, risposta: s });
          continue;
        }
        if (status !== "FINISHED") continue;
      } catch (err) {
        const x = err as GraphError;
        await log(j.id, "instagram", "tentativo", `controllo stato: ${x.code ?? ""} ${x.message}`, { creation_id, tentativo, risposta: x.raw });
        continue;
      }

      try {
        const p = await graphPost(`${igId}/media_publish`, { creation_id }, token);
        j.done = true;
        results.set(j.id, "ok");
        await supabaseAdmin.from("eventi").update({ ig_posted_at: new Date().toISOString() }).eq("id", j.id);
        await log(j.id, "instagram", "ok", p.id, { creation_id, tentativo, risposta: p });
      } catch (err) {
        const x = err as GraphError;
        if (x.code === 190) tokenExpired = true;
        const retryable = x.code === 9007 || x.code === 2 || x.code === 4;
        await log(j.id, "instagram", retryable ? "tentativo" : "errore", `pubblicazione: ${x.code ?? ""} ${x.message}`, {
          creation_id,
          tentativo,
          risposta: x.raw,
        });
        if (!retryable) {
          j.done = true;
          results.set(j.id, x.message);
        }
      }
    }
  }

  for (const j of jobs.filter((j) => !j.done)) {
    results.set(j.id, "in attesa");
    await log(j.id, "instagram", "errore", "Non pubblicato dopo tutti i tentativi: riprovo al prossimo giro con lo stesso container", {
      creation_id: j.creationId ?? null,
    });
  }
  return { results, tokenExpired };
}

export async function runSocialPublish(onlyEventId?: string, soloInstagram = false) {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  const igId = process.env.META_IG_USER_ID;
  if (!token || !pageId || !igId) {
    await log(null, "sistema", "errore", "Token o ID Meta mancanti");
    return { posted: 0, error: "missing_config" };
  }

  if (!soloInstagram) await checkTokenExpiry(token);

  // 1. Instagram posts that failed on earlier runs (Facebook already went out).
  let rq = supabaseAdmin
    .from("eventi")
    .select("id, titolo, data, luogo, immagine, social_posted_at, ig_posted_at, ig_creation_id, ig_creation_at, ig_giri")
    .eq("stato", "attivo")
    .not("social_posted_at", "is", null)
    .is("ig_posted_at", null)
    .gt("data", new Date().toISOString())
    .order("data", { ascending: true })
    .limit(20);
  if (onlyEventId) rq = rq.eq("id", onlyEventId);
  const { data: retryRows } = await rq;
  const igJobs: IgJob[] = pickInstagramRetries(retryRows ?? []).map((e) => ({ ...e, immagine: e.immagine! }));

  // 2. New events: Facebook immediately, Instagram queued with the retries.
  const results: Array<{ id: string; facebook: string }> = [];
  let tokenExpired = false;
  if (!soloInstagram) {
    const { start, end } = socialWindow();
    let q = supabaseAdmin
      .from("eventi")
      .select("id, titolo, data, luogo, immagine, social_posted_at, ig_creation_id, ig_creation_at, ig_giri")
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
    } catch {
      /* fall back to the stored token */
    }

    for (const e of chosen) {
      // Claim first: guarantees no double posting even after partial failure.
      const { data: claimed } = await supabaseAdmin
        .from("eventi")
        .update({ social_posted_at: new Date().toISOString() })
        .eq("id", e.id)
        .is("social_posted_at", null)
        .select("id");
      if (!claimed?.length) continue;

      const r = { id: e.id, facebook: "ok" };
      try {
        const fb = await graphPost(`${pageId}/feed`, { message: socialMessage(e), link: eventUrl(e.id) }, pageToken);
        await log(e.id, "facebook", "ok", fb.id, { risposta: fb });
      } catch (err) {
        const x = err as GraphError;
        if (x.code === 190) tokenExpired = true;
        r.facebook = x.message;
        await log(e.id, "facebook", "errore", `${x.code ?? ""} ${x.message}`, { risposta: x.raw });
      }
      results.push(r);

      if (e.immagine?.startsWith("https://")) {
        igJobs.push({ ...e, immagine: e.immagine });
      } else {
        await log(e.id, "instagram", "saltato", "Evento senza immagine pubblica");
      }
    }
  }

  const ig = await publishInstagram(igJobs, igId, token);
  tokenExpired ||= ig.tokenExpired;

  if (tokenExpired) {
    await log(null, "sistema", "avviso", "Token Meta scaduto (errore 190)");
    await supabaseAdmin.from("notifiche").insert({
      user_id: ADMIN_USER_ID,
      tipo: "sistema",
      titolo: "Token Facebook/Instagram scaduto",
      messaggio: "La pubblicazione automatica degli eventi sui social è fallita: rinnova il token Meta.",
    });
  }
  return { posted: results.length, facebook: results, instagram: Object.fromEntries(ig.results) };
}

const EXPIRY_WARNING_DAYS = 7;

/** Warns the admin (once a day, via the daily run) when the Meta token expires within 7 days. */
async function checkTokenExpiry(token: string) {
  try {
    const r = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = (await r.json()) as { data?: { expires_at?: number; data_access_expires_at?: number } };
    const dates = [j.data?.expires_at, j.data?.data_access_expires_at].filter((v): v is number => !!v && v > 0);
    if (!dates.length) return;
    const expiry = Math.min(...dates) * 1000;
    const daysLeft = Math.floor((expiry - Date.now()) / 86400000);
    if (daysLeft > EXPIRY_WARNING_DAYS) return;
    const quando = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "long" }).format(new Date(expiry));
    await log(null, "sistema", "avviso", `Token Meta in scadenza il ${quando}`);
    await supabaseAdmin.from("notifiche").insert({
      user_id: ADMIN_USER_ID,
      tipo: "sistema",
      titolo: "Token Facebook/Instagram in scadenza",
      messaggio: `Il token Meta scade il ${quando}. Rigeneralo seguendo la guida in docs/meta-token.md.`,
    });
  } catch {
    /* expiry check must never block publishing */
  }
}
