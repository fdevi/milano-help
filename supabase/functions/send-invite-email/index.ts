const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { inviterName, inviterEmail, friendEmail, referralLink } = body;

    if (!inviterName || !friendEmail || !referralLink) {
      return new Response(JSON.stringify({ error: 'Campi mancanti: inviterName, friendEmail, referralLink' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Configurazione mancante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #10b981;">Unisciti a Milano Help</h2>
  <p>Ciao! <strong>${inviterName}</strong> ti invita a far parte di Milano Help, la community del tuo quartiere.</p>
  <p>Su Milano Help puoi:</p>
  <ul>
    <li>Pubblicare annunci e offerte</li>
    <li>Partecipare a gruppi di discussione</li>
    <li>Scoprire eventi nella tua zona</li>
    <li>Connettersi con i tuoi vicini</li>
  </ul>
  <p>Connetti, aiuta e cresci insieme ai tuoi vicini.</p>
  <p style="margin: 30px 0;">
    <a href="${referralLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Registrati ora</a>
  </p>
  <p>Ti aspettiamo!</p>
  <p>Il team di Milano Help</p>
</div>
`.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Milano Help <noreply@milanohelp.it>',
        to: [friendEmail],
        subject: 'Sei stato invitato a Milano Help!',
        html,
        reply_to: inviterEmail || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend error:', data);
      return new Response(JSON.stringify({ error: "Errore nell'invio" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Errore generico:', err);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
