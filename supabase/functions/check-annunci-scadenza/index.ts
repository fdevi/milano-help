import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Mark expired ads (data_scadenza < now() and still attivo)
    const { data: expired, error: expError } = await supabase
      .from("annunci")
      .update({ stato: "chiuso" })
      .eq("stato", "attivo")
      .lt("data_scadenza", new Date().toISOString())
      .select("id, titolo, user_id");

    if (expError) console.error("Error expiring ads:", expError.message);
    console.log(`[check-annunci-scadenza] Expired ${expired?.length || 0} ads`);

    // Create notifications for expired ads
    if (expired && expired.length > 0) {
      const notifications = expired.map((a) => ({
        user_id: a.user_id,
        tipo: "annuncio_scaduto",
        titolo: "Annuncio scaduto",
        messaggio: `Il tuo annuncio "${a.titolo}" è scaduto ed è stato chiuso.`,
        link: "/miei-annunci",
      }));
      await supabase.from("notifiche").insert(notifications);
    }

    // 2. Find ads expiring in ~7 days (between 5 and 8 days from now, wider window)
    const now = new Date();
    const in5days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const in8days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    console.log(`[check-annunci-scadenza] Checking for ads expiring between ${in5days.toISOString()} and ${in8days.toISOString()}`);

    const { data: expiring } = await supabase
      .from("annunci")
      .select("id, titolo, user_id")
      .eq("stato", "attivo")
      .gte("data_scadenza", in5days.toISOString())
      .lt("data_scadenza", in8days.toISOString());

    console.log(`[check-annunci-scadenza] Found ${expiring?.length || 0} ads expiring in ~7 days`);

    // Filter out ads that already received an expiry notification
    let expiringToNotify = expiring || [];
    if (expiringToNotify.length > 0) {
      const adIds = expiringToNotify.map((a) => a.id);
      const { data: alreadyNotified } = await supabase
        .from("notifiche")
        .select("riferimento_id")
        .eq("tipo", "annuncio_in_scadenza")
        .in("riferimento_id", adIds);

      const notifiedIds = new Set((alreadyNotified || []).map((n) => n.riferimento_id));
      expiringToNotify = expiringToNotify.filter((a) => !notifiedIds.has(a.id));
      console.log(`[check-annunci-scadenza] After dedup: ${expiringToNotify.length} ads to notify (${notifiedIds.size} already notified)`);
    }

    if (expiringToNotify.length > 0) {
      // Create in-app notifications with riferimento_id for dedup
      const notifications = expiringToNotify.map((a) => ({
        user_id: a.user_id,
        tipo: "annuncio_in_scadenza",
        titolo: "Annuncio in scadenza",
        messaggio: `Il tuo annuncio "${a.titolo}" scadrà tra circa 7 giorni. Puoi prorogarlo dalla sezione "I miei annunci".`,
        link: "/miei-annunci",
        riferimento_id: a.id,
      }));
      await supabase.from("notifiche").insert(notifications);

      // Send emails if Resend is configured
      if (resendApiKey) {
        const userIds = [...new Set(expiringToNotify.map((a) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, nome")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        for (const a of expiringToNotify) {
          const profile = profileMap.get(a.user_id);
          if (!profile?.email) {
            console.warn(`[check-annunci-scadenza] No email for user ${a.user_id}, skipping ad "${a.titolo}"`);
            continue;
          }
          console.log(`[check-annunci-scadenza] Sending expiry email to ${profile.email} for ad "${a.titolo}"`);

          try {
            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Milano Help <noreply@milanohelp.it>",
                to: [profile.email],
                subject: `Il tuo annuncio "${a.titolo}" sta per scadere`,
                html: `
                  <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
                    <h2 style="color: #0d9668;">Ciao ${profile.nome || "utente"}!</h2>
                    <p>Il tuo annuncio <strong>"${a.titolo}"</strong> scadrà tra <strong>7 giorni</strong>.</p>
                    <p>Se vuoi mantenerlo attivo, puoi prorogarlo di 30 giorni dalla sezione "I miei annunci" su Milano Help.</p>
                    <a href="https://milanohelp.lovable.app/miei-annunci" 
                       style="display: inline-block; background: #0d9668; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin-top: 16px;">
                      Vai ai miei annunci
                    </a>
                    <p style="margin-top: 24px; color: #888; font-size: 12px;">Se non fai nulla, l'annuncio verrà chiuso automaticamente alla scadenza.</p>
                  </div>
                `,
              }),
            });
            const emailData = await emailRes.json();
            if (!emailRes.ok) {
              console.error(`[check-annunci-scadenza] Resend error for ${profile.email}:`, JSON.stringify(emailData));
            } else {
              console.log(`[check-annunci-scadenza] Email sent successfully to ${profile.email}, id: ${emailData.id}`);
            }
          } catch (emailErr) {
            console.error(`[check-annunci-scadenza] Exception sending email to ${profile.email}:`, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        expired: expired?.length || 0,
        expiring_soon: expiring?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
