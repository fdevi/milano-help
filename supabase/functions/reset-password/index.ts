import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { token, newPassword } = await req.json().catch(() => ({}))
    if (typeof token !== 'string' || !token) return json({ error: 'Link non valido.' }, 400)
    if (typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 72) {
      return json({ error: 'La password deve avere tra 6 e 72 caratteri.' }, 400)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: resetData } = await supabase
      .from('password_resets').select('email, expires_at').eq('token', token).maybeSingle()
    if (!resetData) return json({ error: 'Link non valido o già usato. Richiedi un nuovo reset.' }, 400)
    if (new Date(resetData.expires_at) < new Date()) {
      return json({ error: 'Link scaduto. Richiedi un nuovo reset.' }, 400)
    }

    const email = String(resetData.email).trim().toLowerCase()
    let userId: string | null = null
    for (let page = 1; page <= 50 && !userId; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
      if (data.users.length < 1000) break
    }
    if (!userId) return json({ error: 'Nessun account trovato per questa email.' }, 404)

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
    if (updateError) {
      console.error('updateUserById error:', updateError)
      const msg = /weak|pwned|leaked/i.test(updateError.message)
        ? 'Password troppo debole o già compromessa: scegline una più sicura.'
        : 'Impossibile aggiornare la password: ' + updateError.message
      return json({ error: msg }, 400)
    }

    await supabase.from('password_resets').delete().eq('email', resetData.email)
    return json({ success: true })
  } catch (error: any) {
    console.error('Errore in reset-password:', error)
    return json({ error: 'Errore imprevisto, riprova più tardi.' }, 500)
  }
})
