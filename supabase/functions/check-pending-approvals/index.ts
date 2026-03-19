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

    // Count pending items
    const { count: annunciPending } = await supabase
      .from("annunci")
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_moderazione");

    const { count: eventiPending } = await supabase
      .from("eventi")
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_moderazione");

    const totalPending = (annunciPending || 0) + (eventiPending || 0);

    if (totalPending === 0) {
      // No pending items: reset the cycle flag if it was set
      if (config.attesa_in_corso) {
        await supabase
          .from("notifiche_approvazione")
          .update({ attesa_in_corso: false, updated_at: new Date().toISOString() })
          .eq("id", 1);
        console.log("Pending count back to 0, reset attesa_in_corso");
      }
      return new Response(JSON.stringify({ skipped: true, reason: "no_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // There are pending items
    if (config.attesa_in_corso) {
      // Already sent an email for this cycle, don't send again
      console.log("attesa_in_corso=true, skipping (already notified for this cycle)");
      return new Response(JSON.stringify({ skipped: true, reason: "already_notified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transition from 0 -> >0: send email
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" style="width: 100%; max-width: 300px; margin-bottom: 20px;">
        <h1 style="color: #5e17eb;">📋 Elementi in attesa di approvazione</h1>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0; font-size: 16px;">📢 <strong>Annunci in attesa:</strong> ${annunciPending || 0}</p>
          <p style="margin: 8px 0; font-size: 16px;">📅 <strong>Eventi in attesa:</strong> ${eventiPending || 0}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;">
          <p style="margin: 8px 0; font-size: 18px; font-weight: bold;">Totale: ${totalPending}</p>
        </div>
        <a href="https://milanohelp.lovable.app/admin/moderazione" style="display: inline-block; background: #5e17eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accedi alla dashboard</a>
        <hr style="margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">Milano Help – Notifica automatica approvazioni</p>
      </div>
    `;

    const today = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Milano Help <noreply@milanohelp.it>",
        to: ["info@milanohelp.it"],
        subject: `📋 Milano Help – Elementi in attesa di approvazione (${today})`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailRes.json();
    console.log("Email sent:", JSON.stringify(emailResult));

    // Mark cycle as active and update ultimo_invio
    await supabase
      .from("notifiche_approvazione")
      .update({
        attesa_in_corso: true,
        ultimo_invio: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return new Response(JSON.stringify({ sent: true, annunci: annunciPending, eventi: eventiPending }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
