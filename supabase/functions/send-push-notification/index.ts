import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, message, link, data } = await req.json()

    const onesignalAppId = Deno.env.get('VITE_ONESIGNAL_APP_ID')
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY')

    if (!onesignalAppId || !onesignalApiKey) {
      console.error('[push] OneSignal credentials not configured')
      return new Response(JSON.stringify({ error: 'OneSignal credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('[push] Sending to userId:', userId, 'title:', title)

    // Use the modern OneSignal REST API with include_aliases
    const payload = {
      app_id: onesignalAppId,
      contents: { en: message },
      headings: { en: title },
      include_aliases: { external_id: [userId] },
      target_channel: "push",
      url: link,
      data: data || {},
    }

    console.log('[push] Payload:', JSON.stringify(payload))

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${onesignalApiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    console.log('[push] OneSignal response:', JSON.stringify(result))

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    console.error('[push] Error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
