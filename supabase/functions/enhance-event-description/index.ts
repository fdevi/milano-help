import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { titolo, categoria, luogo, data, descrizione_originale } = await req.json();

    if (!titolo) {
      return new Response(JSON.stringify({ error: "Titolo richiesto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    // Format date nicely
    let dataFormatted = data || "";
    try {
      if (data) {
        dataFormatted = new Date(data).toLocaleDateString("it-IT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch { /* keep original */ }

    const hasOriginal = descrizione_originale && descrizione_originale.trim().length > 10;

    const prompt = hasOriginal
      ? `Riscrivi e arricchisci questa descrizione di un evento per renderla più coinvolgente e informativa. Mantieni un tono amichevole e invitante.

Evento: "${titolo}"
Categoria: ${categoria || "Evento"}
Luogo: ${luogo || "Milano"}
Data: ${dataFormatted}
Descrizione originale: "${descrizione_originale}"

Scrivi 2-3 frasi coinvolgenti in italiano. Non usare hashtag. Non inventare dettagli non presenti. Non includere link.`
      : `Scrivi una breve descrizione coinvolgente per questo evento, in italiano. Tono amichevole e invitante.

Evento: "${titolo}"
Categoria: ${categoria || "Evento"}
Luogo: ${luogo || "Milano"}
Data: ${dataFormatted}

Scrivi 2-3 frasi coinvolgenti. Non usare hashtag. Non inventare dettagli specifici come orari o prezzi. Non includere link.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "Sei un copywriter per eventi culturali a Milano. Scrivi descrizioni brevi, coinvolgenti e in italiano. Massimo 300 caratteri.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error(`AI error: ${status}`, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, riprova tra poco" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Errore generazione descrizione" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const generatedText = result.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedText || generatedText.length < 20) {
      return new Response(JSON.stringify({ error: "Descrizione generata troppo corta", descrizione: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ descrizione: generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enhance-event-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
