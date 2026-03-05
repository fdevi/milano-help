import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, nome, titolo, annuncioId, stato, motivo } = await req.json();

    if (!email || !titolo || !stato) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isApproved = stato === "attivo";
    const subject = isApproved
      ? `Il tuo annuncio "${titolo}" è stato approvato`
      : `Il tuo annuncio "${titolo}" è stato rifiutato`;

    const linkUrl = isApproved
      ? `https://milanohelp.lovable.app/annuncio/${annuncioId}`
      : "https://milanohelp.lovable.app/miei-annunci";

    const bodyHtml = isApproved
      ? `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <h2 style="color: #0d9668;">Buongiorno ${nome}!</h2>
          <p>Il tuo annuncio <strong>"${titolo}"</strong> è stato approvato ed è ora visibile su Milano Help.</p>
          <p>Puoi vederlo cliccando il pulsante qui sotto:</p>
          <a href="${linkUrl}" 
             style="display: inline-block; background: #0d9668; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin-top: 16px;">
            Vedi il tuo annuncio
          </a>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">Grazie per far parte della community di Milano Help!</p>
        </div>
      `
      : `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <h2 style="color: #dc2626;">Ciao ${nome},</h2>
          <p>Purtroppo il tuo annuncio <strong>"${titolo}"</strong> non è stato approvato.</p>
          ${motivo ? `<p><strong>Motivo:</strong> ${motivo}</p>` : ""}
          <p>Puoi modificare l'annuncio e riprovare dalla sezione "I miei annunci".</p>
          <a href="${linkUrl}" 
             style="display: inline-block; background: #0d9668; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; margin-top: 16px;">
            Vai ai miei annunci
          </a>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">Se hai domande, contattaci tramite la pagina Contatti.</p>
        </div>
      `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Milano Help <noreply@milanohelp.it>",
        to: [email],
        subject,
        html: bodyHtml,
      }),
    });

    const result = await res.json();
    console.log("Email sent:", result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
