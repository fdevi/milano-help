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
    const { nome, email, oggetto, messaggio, tipo_richiesta } = body;

    if (!nome || !email || !oggetto || !messaggio) {
      return new Response(JSON.stringify({ error: 'Campi mancanti' }), {
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

    const isInvito = tipo_richiesta === 'invito';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Milano Help <noreply@milanohelp.it>',
        to: isInvito ? [email] : ['info@milanohelp.it'],
        subject: isInvito ? oggetto : `[Milano Help] ${oggetto}`,
        html: isInvito
          ? `
          <div style="text-align:center; margin-bottom:24px;">
            <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" width="300" height="auto" style="display:block; margin:0 auto; width:300px; height:auto;">
          </div>
          <h2>Invito su Milano Help</h2>
          <p>${messaggio.replace(/\n/g, '<br/>')}</p>
          <p><small>Questo invito ti è stato inviato da ${nome} tramite Milano Help.</small></p>
        `
          : `
          <div style="text-align:center; margin-bottom:24px;">
            <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" width="300" height="auto" style="display:block; margin:0 auto; width:300px; height:auto;">
          </div>
          <h2>Nuovo messaggio dal form "Contattaci"</h2>
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Oggetto:</strong> ${oggetto}</p>
          <hr/>
          <p>${messaggio.replace(/\n/g, '<br/>')}</p>
        `,
        reply_to: isInvito ? undefined : email,
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
