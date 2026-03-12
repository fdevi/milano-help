import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

async function enhanceDescription(titolo: string, categoria: string | null, luogo: string, data: string, descrizione_originale: string | null): Promise<string | null> {
  // Extract link from original description
  const linkMatch = (descrizione_originale || "").match(/\n\n🔗\s*(https?:\/\/\S+)/);
  const originalLink = linkMatch ? linkMatch[1] : null;

  // Clean description (remove link part) for AI prompt
  const cleanDesc = (descrizione_originale || "").replace(/\n\n🔗.*$/s, "").trim();

  let dataFormatted = data || "";
  try {
    if (data) {
      dataFormatted = new Date(data).toLocaleDateString("it-IT", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
  } catch { /* keep original */ }

  const hasOriginal = cleanDesc.length > 10;
  const prompt = hasOriginal
    ? `Riscrivi e arricchisci questa descrizione di un evento per renderla più coinvolgente e informativa. Mantieni un tono amichevole e invitante.\n\nEvento: "${titolo}"\nCategoria: ${categoria || "Evento"}\nLuogo: ${luogo || "Milano"}\nData: ${dataFormatted}\nDescrizione originale: "${cleanDesc}"\n\nScrivi 2-3 frasi coinvolgenti in italiano. Non usare hashtag. Non inventare dettagli non presenti. Non includere link.`
    : `Scrivi una breve descrizione coinvolgente per questo evento, in italiano. Tono amichevole e invitante.\n\nEvento: "${titolo}"\nCategoria: ${categoria || "Evento"}\nLuogo: ${luogo || "Milano"}\nData: ${dataFormatted}\n\nScrivi 2-3 frasi coinvolgenti. Non usare hashtag. Non inventare dettagli specifici come orari o prezzi. Non includere link.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Sei un copywriter per eventi culturali a Milano. Scrivi descrizioni brevi, coinvolgenti e in italiano. Massimo 300 caratteri." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error(`AI error: ${response.status}`, await response.text());
    return null;
  }

  const result = await response.json();
  const text = result.choices?.[0]?.message?.content?.trim() || "";
  if (text.length < 20) return null;

  // Re-append original link if present
  if (originalLink) {
    return text + `\n\n🔗 ${originalLink}`;
  }
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let limit = 10;
    let offset = 0;
    try {
      const body = await req.json();
      if (body.limit) limit = body.limit;
      if (body.offset) offset = body.offset;
    } catch { /* no body, use defaults */ }

    const { data: events, error } = await supabase
      .from("eventi")
      .select("id, titolo, categoria, luogo, data, descrizione")
      .not("fonte_esterna", "is", null)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const allEvents = events || [];
    console.log(`Processing ${allEvents.length} events (offset: ${offset}, limit: ${limit})`);

    let enhanced = 0;
    let failed = 0;

    for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
      const batch = allEvents.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (ev: any) => {
          const newDesc = await enhanceDescription(ev.titolo, ev.categoria, ev.luogo, ev.data, ev.descrizione);
          if (newDesc) {
            const { error: updateError } = await supabase
              .from("eventi")
              .update({ descrizione: newDesc })
              .eq("id", ev.id);
            if (updateError) throw updateError;
            return true;
          }
          return false;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled" && r.value) enhanced++;
        else if (r.status === "rejected") { failed++; console.error("Batch error:", r.reason); }
      }

      if (i + BATCH_SIZE < allEvents.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const summary = { total: allEvents.length, enhanced, failed };
    console.log("Enhancement complete:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-existing-events error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
