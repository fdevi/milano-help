import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, newPassword } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verifica token
    const { data: resetData, error: tokenError } = await supabase
      .from('password_resets')
      .select('email')
      .eq('token', token)
      .single()

    if (tokenError || !resetData) {
      return new Response(JSON.stringify({ error: 'Token non valido o scaduto' }), { status: 400, headers: corsHeaders })
    }

    // 2. Trova l'utente tramite email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    const user = users?.users.find(u => u.email === resetData.email)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Utente non trovato' }), { status: 404, headers: corsHeaders })
    }

    // 3. Aggiorna password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    })

    if (updateError) throw updateError

    // 4. Elimina il token usato
    await supabase.from('password_resets').delete().eq('token', token)

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (error: any) {
    console.error('Errore in reset-password:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
