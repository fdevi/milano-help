import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read config
    const { data: config, error: configErr } = await supabase
      .from("notifiche_approvazione")
      .select("*")
      .eq("id", 1)
      .single();

    if (configErr || !config) {
      console.log("No config found or error:", configErr?.message);
      return new Response(JSON.stringify({ skipped: true, reason: "no_config" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.attivo) {
      console.log("Notifiche approvazione disabled");
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pending items
    const { data: annunci } = await supabase
      .from("annunci").select("id, titolo").eq("stato", "in_moderazione");
    const { data: eventi } = await supabase
      .from("eventi").select("id, titolo").eq("stato", "in_moderazione");

    const pending = [
      ...(annunci || []).map((a: any) => ({ ...a, tipo: "annuncio" })),
      ...(eventi || []).map((e: any) => ({ ...e, tipo: "evento" })),
    ];

    if (pending.length === 0) {
      console.log("No pending items, nothing to notify");
      return new Response(JSON.stringify({ skipped: true, reason: "no_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find items already notified
    const { data: giaInviate } = await supabase
      .from("notifiche_approvazione_inviate")
      .select("elemento_id, tipo")
      .in("elemento_id", pending.map((p) => p.id));
    const sentSet = new Set((giaInviate || []).map((r: any) => `${r.tipo}:${r.elemento_id}`));
    const nuovi = pending.filter((p) => !sentSet.has(`${p.tipo}:${p.id}`));

    if (nuovi.length === 0) {
      console.log(`Pending=${pending.length}, all already notified. Skipping.`);
      return new Response(JSON.stringify({ skipped: true, reason: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim items first (unique constraint prevents duplicates from concurrent runs)
    const { data: claimed, error: claimErr } = await supabase
      .from("notifiche_approvazione_inviate")
      .upsert(nuovi.map((n) => ({ elemento_id: n.id, tipo: n.tipo })), {
        onConflict: "elemento_id,tipo", ignoreDuplicates: true,
      })
      .select("elemento_id, tipo");
    if (claimErr) throw claimErr;
    const claimedSet = new Set((claimed || []).map((r: any) => `${r.tipo}:${r.elemento_id}`));
    const daNotificare = nuovi.filter((n) => claimedSet.has(`${n.tipo}:${n.id}`));
    if (daNotificare.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "claimed_elsewhere" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending notification for ${daNotificare.length} new pending item(s)`);
    const esc = (s: string) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
    const lista = daNotificare
      .map((n) => `<li style="margin:6px 0;">${n.tipo === "annuncio" ? "📢 Annuncio" : "📅 Evento"}: <strong>${esc(n.titolo)}</strong></li>`)
      .join("");

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" style="width: 100%; max-width: 300px; margin-bottom: 20px;">
        <h1 style="color: #5e17eb;">📋 Nuovi elementi in attesa di approvazione</h1>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <ul style="padding-left:18px;">${lista}</ul>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;">
          <p style="margin: 8px 0;">Totale in attesa: <strong>${pending.length}</strong></p>
        </div>
        <a href="https://www.milanohelp.it/admin/moderazione" style="display: inline-block; background: #5e17eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accedi alla dashboard</a>
        <hr style="margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">Milano Help – Notifica automatica approvazioni</p>
      </div>
    `;

    const titoloOggetto = daNotificare.length === 1 ? `"${daNotificare[0].titolo}"` : `${daNotificare.length} nuovi elementi`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from: "Milano Help <noreply@milanohelp.it>",
        to: ["info@milanohelp.it"],
        subject: `📋 In attesa di approvazione: ${titoloOggetto}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("Email sent:", JSON.stringify(emailResult));

    await supabase
      .from("notifiche_approvazione")
      .update({ ultimo_invio: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", 1);

    const annunciPending = daNotificare.filter((n) => n.tipo === "annuncio").length;
    const eventiPending = daNotificare.filter((n) => n.tipo === "evento").length;

    return new Response(JSON.stringify({ sent: true, annunci: annunciPending, eventi: eventiPending }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
