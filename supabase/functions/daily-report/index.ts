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

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();
    const nowISO = now.toISOString();

    const dateLabel = now.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    console.log(`[daily-report] Generating report for ${dateLabel} (${todayStartISO} to ${nowISO})`);

    // 1. New users today
    const { count: newUsersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    // 2. Total users
    const { count: totalUsersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // 3. Annunci published today
    const { count: annunciOggi } = await supabase
      .from("annunci")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    // 4. Annunci pending approval
    const { count: annunciInAttesa } = await supabase
      .from("annunci")
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_moderazione");

    // 5. Eventi published today
    const { count: eventiOggi } = await supabase
      .from("eventi")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    // 6. Eventi pending approval
    const { count: eventiInAttesa } = await supabase
      .from("eventi")
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_moderazione");

    // 7. New groups today
    const { count: gruppiOggi } = await supabase
      .from("gruppi")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    // 8. Approvals today (annunci approved today)
    const { count: annunciApprovati } = await supabase
      .from("annunci")
      .select("*", { count: "exact", head: true })
      .eq("stato", "attivo")
      .gte("moderato_il", todayStartISO)
      .lt("moderato_il", nowISO);

    // 9. Approvals today (eventi - use activity_logs)
    const { count: eventiApprovati } = await supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("azione", "evento_approvato")
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    const approvazioniOggi = (annunciApprovati || 0) + (eventiApprovati || 0);
    const totaleInAttesa = (annunciInAttesa || 0) + (eventiInAttesa || 0);

    // 10. Comments today (annunci + eventi + groups)
    const { count: commentiAnnunci } = await supabase
      .from("annunci_commenti")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    const { count: commentiEventi } = await supabase
      .from("eventi_commenti")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    const { count: commentiGruppi } = await supabase
      .from("gruppi_post_commenti")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    const commentiTotali = (commentiAnnunci || 0) + (commentiEventi || 0) + (commentiGruppi || 0);

    // 11. Private messages today
    const { count: messaggiPrivati } = await supabase
      .from("messaggi_privati")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", nowISO);

    console.log(`[daily-report] Stats: newUsers=${newUsersCount}, annunci=${annunciOggi}, eventi=${eventiOggi}, gruppi=${gruppiOggi}, approvazioni=${approvazioniOggi}, commenti=${commentiTotali}, messaggi=${messaggiPrivati}`);

    const stat = (val: number | null) => val ?? 0;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f4f4f8; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <div style="background: #5e17eb; padding: 24px 32px; text-align: center;">
      <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" style="width: 100%; max-width: 260px; margin-bottom: 8px;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 8px 0 0;">📊 Report Giornaliero</h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 4px 0 0;">${dateLabel}</p>
    </div>

    <div style="padding: 24px 32px;">

      <!-- Utenti -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">👥 Utenti</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Nuovi iscritti oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${stat(newUsersCount)}</td></tr>
          <tr><td style="padding: 6px 0; color: #444;">Utenti totali</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #333;">${stat(totalUsersCount)}</td></tr>
        </table>
      </div>

      <!-- Annunci -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">📋 Annunci</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Pubblicati oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${stat(annunciOggi)}</td></tr>
          <tr><td style="padding: 6px 0; color: #444;">In attesa di approvazione</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #e67e22;">${stat(annunciInAttesa)}</td></tr>
        </table>
      </div>

      <!-- Eventi -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">🎉 Eventi</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Pubblicati oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${stat(eventiOggi)}</td></tr>
          <tr><td style="padding: 6px 0; color: #444;">In attesa di approvazione</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #e67e22;">${stat(eventiInAttesa)}</td></tr>
        </table>
      </div>

      <!-- Gruppi -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">👥 Gruppi</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Nuovi gruppi oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${stat(gruppiOggi)}</td></tr>
        </table>
      </div>

      <!-- Approvazioni -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">✅ Approvazioni</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Approvazioni effettuate oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #27ae60;">${approvazioniOggi}</td></tr>
          <tr><td style="padding: 6px 0; color: #444;">Totale in attesa</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #e67e22;">${totaleInAttesa}</td></tr>
        </table>
      </div>

      <!-- Attività -->
      <div style="margin-bottom: 20px;">
        <h2 style="color: #5e17eb; font-size: 16px; margin: 0 0 8px; border-bottom: 2px solid #5e17eb; padding-bottom: 4px;">💬 Attività</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #444;">Commenti pubblicati oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${commentiTotali}</td></tr>
          <tr><td style="padding: 6px 0; color: #444;">Messaggi privati oggi</td><td style="padding: 6px 0; text-align: right; font-weight: bold; color: #5e17eb;">${stat(messaggiPrivati)}</td></tr>
        </table>
      </div>

    </div>

    <div style="background: #f4f4f8; padding: 16px 32px; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">Milano Help – Report automatico generato alle ${now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Milano Help <noreply@milanohelp.it>",
        to: ["info@milanohelp.it"],
        subject: `📊 Report giornaliero Milano Help – ${dateLabel}`,
        html: htmlBody,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("[daily-report] Resend error:", JSON.stringify(emailData));
      return new Response(JSON.stringify({ error: "Email send failed", details: emailData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[daily-report] Email sent successfully, id: ${emailData.id}`);

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[daily-report] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
