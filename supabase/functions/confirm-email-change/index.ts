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
    const { token } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verifica token
    const { data: changeData, error: tokenError } = await supabase
      .from('email_changes')
      .select('*')
      .eq('token', token)
      .single()

    if (tokenError || !changeData) {
      return new Response(JSON.stringify({ error: 'Token non valido o scaduto' }), { status: 400, headers: corsHeaders })
    }

    // Verifica scadenza
    if (new Date(changeData.expires_at) < new Date()) {
      await supabase.from('email_changes').delete().eq('token', token)
      return new Response(JSON.stringify({ error: 'Token scaduto' }), { status: 400, headers: corsHeaders })
    }

    // 2. Aggiorna email in auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(changeData.user_id, {
      email: changeData.new_email,
    })

    if (updateError) throw updateError

    // 3. Aggiorna email nel profilo
    await supabase
      .from('profiles')
      .update({ email: changeData.new_email })
      .eq('user_id', changeData.user_id)

    // 4. Elimina il token usato
    await supabase.from('email_changes').delete().eq('token', token)

    return new Response(JSON.stringify({ success: true, newEmail: changeData.new_email }), { status: 200, headers: corsHeaders })
  } catch (error: any) {
    console.error('Errore in confirm-email-change:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
