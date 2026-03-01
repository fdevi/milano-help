import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'Milano Help <noreply@milanohelp.it>'

serve(async (req) => {
  try {
    const { to, type, data } = await req.json()
    
    console.log(`📧 Richiesta ricevuta: to=${to}, type=${type}`);

    let subject = ''
    let html = ''

    if (type === 'confirmation') {
      subject = 'Conferma la tua registrazione a Milano Help'
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              background-color: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px;
              display: inline-block;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Benvenuto su Milano Help!</h2>
            <p>Ciao, grazie per esserti registrato.</p>
            <p>Per confermare la tua email e attivare l'account, clicca sul pulsante qui sotto:</p>
            <a href="${data.confirmationLink}" class="button">Conferma email</a>
            <p>Se non hai richiesto questa registrazione, ignora questa email.</p>
            <p>Il team di Milano Help</p>
            <div class="footer">
              <p>Milano Help - La community del tuo quartiere</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else if (type === 'reset') {
      subject = 'Reimposta la tua password su Milano Help'
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              background-color: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px;
              display: inline-block;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Richiesta di reset password</h2>
            <p>Hai richiesto di reimpostare la password per il tuo account Milano Help.</p>
            <p>Clicca sul pulsante qui sotto per scegliere una nuova password:</p>
            <a href="${data.resetLink}" class="button">Reimposta password</a>
            <p>Il link è valido per 1 ora.</p>
            <p>Se non hai richiesto il reset, ignora questa email.</p>
            <p>Il team di Milano Help</p>
            <div class="footer">
              <p>Milano Help - La community del tuo quartiere</p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      throw new Error('Tipo di email non supportato')
    }

    console.log(`📤 Invio email a ${to} con oggetto: ${subject}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    const responseData = await res.json()
    console.log('📨 Risposta Resend:', {
      status: res.status,
      statusText: res.statusText,
      data: responseData
    });

    if (!res.ok) {
      console.error('❌ Errore Resend:', responseData);
      
      // Controlla se è un errore di "suppressed" (bloccato)
      if (responseData.error?.message?.includes('suppressed') || 
          responseData.error?.message?.includes('bounce')) {
        console.log('⚠️ Questa email è stata soppressa (bounce/spam)');
        return new Response(JSON.stringify({ 
          error: 'Email soppressa dal provider', 
          details: responseData 
        }), { status: 400 });
      }
      
      return new Response(JSON.stringify({ error: 'Errore nell\'invio dell\'email', details: responseData }), { status: 500 })
    }

    console.log('✅ Email inviata con successo! ID:', responseData.id);
    return new Response(JSON.stringify({ success: true, id: responseData.id }), { status: 200 })
  } catch (error) {
    console.error('❌ Errore generico:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})