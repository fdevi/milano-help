import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Fetch all due reminders (not yet notified, orario_promemoria <= now)
    const { data: promemoria, error: fetchErr } = await supabase
      .from("eventi_promemoria")
      .select("*, eventi!inner(titolo, data, luogo, id)")
      .eq("notificato", false)
      .lte("orario_promemoria", now.toISOString());

    if (fetchErr) throw fetchErr;

    if (!promemoria || promemoria.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user+event to deduplicate: pick the earliest reminder per user+event
    const grouped = new Map<string, typeof promemoria[0]>();
    for (const p of promemoria) {
      const key = `${p.user_id}_${p.evento_id}`;
      const existing = grouped.get(key);
      if (!existing || new Date(p.orario_promemoria) < new Date(existing.orario_promemoria)) {
        grouped.set(key, p);
      }
    }

    // All promemoria IDs to mark as notified (including duplicates)
    const allIds = promemoria.map((p: any) => p.id);

    let sentCount = 0;
    const onesignalAppId = Deno.env.get("VITE_ONESIGNAL_APP_ID");
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    for (const [, p] of grouped) {
      const evento = (p as any).eventi;
      const tipoLabel = p.tipo === "ricordamelo" ? "Promemoria" : "Evento di tuo interesse";
      const title = `${tipoLabel}: ${evento.titolo}`;
      const message = `L'evento "${evento.titolo}" a ${evento.luogo} sta per iniziare! Non perdertelo!`;
      const link = `/evento/${evento.id}`;

      // Fetch user profile for email + name
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, nome, notifiche_push, notifiche_email")
        .eq("user_id", p.user_id)
        .single();

      // Send push notification via OneSignal
      if (onesignalAppId && onesignalApiKey && profile?.notifiche_push !== false) {
        try {
          await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${onesignalApiKey}`,
            },
            body: JSON.stringify({
              app_id: onesignalAppId,
              contents: { en: message },
              headings: { en: title },
              include_aliases: { external_id: [p.user_id] },
              target_channel: "push",
              url: link,
            }),
          });
        } catch (e) {
          console.warn("[reminder] Push failed:", e);
        }
      }

      // Send email via Resend
      if (resendApiKey && profile?.email && profile?.notifiche_email !== false) {
        try {
          const nome = profile.nome || "utente";
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Milano Help <noreply@milanohelp.it>",
              to: [profile.email],
              subject: title,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align:center; margin-bottom:24px;">
                    <img src="https://milanohelp.lovable.app/logo/logo-email-header.png" alt="Milano Help" width="300" height="auto" style="display:block; margin:0 auto; width:300px; height:auto;">
                  </div>
                  <h2 style="color: #333;">Ciao ${nome}! 👋</h2>
                  <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    ${p.tipo === "ricordamelo"
                      ? `Ti avevi chiesto di ricordarti dell'evento "<strong>${evento.titolo}</strong>" — sta per iniziare!`
                      : `Avevi mostrato interesse per l'evento "<strong>${evento.titolo}</strong>" — inizia tra poco!`}
                  </p>
                  <p style="font-size: 14px; color: #777;">
                    📍 ${evento.luogo}<br/>
                    📅 ${new Date(evento.data).toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" })}
                  </p>
                  <a href="https://milanohelp.lovable.app${link}" 
                     style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Vedi evento
                  </a>
                  <p style="margin-top: 24px; font-size: 12px; color: #999;">Milano Help — La community di Milano</p>
                </div>
              `,
            }),
          });
        } catch (e) {
          console.warn("[reminder] Email failed:", e);
        }
      }

      // Also create in-app notification
      await supabase.from("notifiche").insert({
        user_id: p.user_id,
        tipo: "promemoria_evento",
        titolo: title,
        messaggio: message,
        link,
        riferimento_id: evento.id,
      });

      sentCount++;
    }

    // Mark ALL due reminders as notified (including deduped ones)
    await supabase
      .from("eventi_promemoria")
      .update({ notificato: true })
      .in("id", allIds);

    console.log(`[reminders] Sent ${sentCount} reminders, marked ${allIds.length} as notified`);

    return new Response(JSON.stringify({ sent: sentCount, marked: allIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[reminders] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
