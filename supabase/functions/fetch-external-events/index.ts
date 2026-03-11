import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ADMIN_USER_ID = '51aeacbc-1497-440c-8edb-23845ce077d3'
const NOTIFY_EMAIL = 'info@milanohelp.it'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TicketmasterEvent {
  id: string
  name: string
  dates?: {
    start?: {
      dateTime?: string
      localDate?: string
    }
    end?: {
      dateTime?: string
    }
  }
  _embedded?: {
    venues?: Array<{
      name?: string
      location?: {
        latitude?: string
        longitude?: string
      }
      city?: { name?: string }
    }>
  }
  images?: Array<{ url?: string; width?: number }>
  priceRanges?: Array<{ min?: number; max?: number }>
  classifications?: Array<{
    segment?: { name?: string }
    genre?: { name?: string }
  }>
  info?: string
  pleaseNote?: string
  url?: string
}

function mapTicketmasterEvent(ev: TicketmasterEvent) {
  const venue = ev._embedded?.venues?.[0]
  const startDate = ev.dates?.start?.dateTime || ev.dates?.start?.localDate
  const endDate = ev.dates?.end?.dateTime || null

  if (!startDate) return null

  const bestImage = ev.images
    ?.sort((a, b) => (b.width || 0) - (a.width || 0))?.[0]?.url || null

  const priceMin = ev.priceRanges?.[0]?.min
  const isGratuito = !priceMin || priceMin === 0

  const classification = ev.classifications?.[0]
  const categoria = classification?.genre?.name || classification?.segment?.name || 'Altro'

  let descrizione = ''
  if (ev.info) descrizione += ev.info
  if (ev.pleaseNote) descrizione += (descrizione ? '\n\n' : '') + ev.pleaseNote
  if (ev.url) descrizione += (descrizione ? '\n\n' : '') + `🔗 Biglietti: ${ev.url}`

  return {
    external_id: `ticketmaster_${ev.id}`,
    fonte_esterna: 'ticketmaster',
    titolo: ev.name,
    descrizione: descrizione || null,
    data: startDate,
    fine: endDate,
    luogo: venue?.name || 'Milano',
    lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    lon: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    immagine: bestImage,
    prezzo: priceMin || null,
    gratuito: isGratuito,
    categoria,
    stato: 'attivo',
    organizzatore_id: ADMIN_USER_ID,
  }
}

async function fetchTicketmasterEvents(): Promise<TicketmasterEvent[]> {
  const now = new Date()
  const startDateTime = now.toISOString().split('.')[0] + 'Z'
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const endDateTime = endDate.toISOString().split('.')[0] + 'Z'

  const allEvents: TicketmasterEvent[] = []
  let page = 0
  const maxPages = 5

  while (page < maxPages) {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?` +
      `apikey=${TICKETMASTER_API_KEY}` +
      `&city=Milano&countryCode=IT` +
      `&startDateTime=${startDateTime}` +
      `&endDateTime=${endDateTime}` +
      `&size=50&page=${page}` +
      `&sort=date,asc`

    console.log(`📡 Fetching Ticketmaster page ${page}...`)

    const res = await fetch(url)
    if (!res.ok) {
      const errText = await res.text()
      console.error(`❌ Ticketmaster API error: ${res.status}`, errText)
      break
    }

    const data = await res.json()
    const events = data?._embedded?.events || []
    allEvents.push(...events)

    const totalPages = data?.page?.totalPages || 1
    page++
    if (page >= totalPages) break
  }

  console.log(`✅ Ticketmaster: trovati ${allEvents.length} eventi`)
  return allEvents
}

async function sendSummaryEmail(ticketmasterCount: number) {
  if (ticketmasterCount === 0) {
    console.log('📭 Nessun nuovo evento, email non inviata')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>📅 Riepilogo importazione eventi</h2>
      <p>Ecco il riepilogo dell'importazione automatica di oggi:</p>
      <ul>
        <li><strong>Ticketmaster:</strong> ${ticketmasterCount} nuovi eventi</li>
      </ul>
      <p>Tutti gli eventi sono stati pubblicati come <strong>attivi</strong> sulla piattaforma.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">Milano Help - Importazione automatica eventi</p>
    </body>
    </html>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Milano Help <noreply@milanohelp.it>',
        to: [NOTIFY_EMAIL],
        subject: `📅 Importazione eventi: ${ticketmasterCount} nuovi eventi`,
        html,
      }),
    })
    const resData = await res.json()
    console.log('📧 Email riepilogo:', res.ok ? 'inviata' : 'errore', resData)
  } catch (err) {
    console.error('❌ Errore invio email riepilogo:', err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch existing external IDs to avoid duplicates
    const { data: existingEvents } = await supabase
      .from('eventi')
      .select('external_id')
      .not('external_id', 'is', null)

    const existingIds = new Set((existingEvents || []).map(e => e.external_id))
    console.log(`📋 ${existingIds.size} eventi esterni già presenti nel DB`)

    // 2. Fetch from Ticketmaster
    const tmEvents = await fetchTicketmasterEvents()

    // 3. Map and filter new events
    const newEvents = tmEvents
      .map(mapTicketmasterEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && !existingIds.has(e.external_id))

    console.log(`🆕 ${newEvents.length} nuovi eventi da inserire`)

    // 4. Insert in batches
    let insertedCount = 0
    const batchSize = 20
    for (let i = 0; i < newEvents.length; i += batchSize) {
      const batch = newEvents.slice(i, i + batchSize)
      const { error } = await supabase.from('eventi').insert(batch)
      if (error) {
        console.error(`❌ Errore inserimento batch ${i}:`, error)
      } else {
        insertedCount += batch.length
      }
    }

    console.log(`✅ Inseriti ${insertedCount} nuovi eventi`)

    // 5. Send summary email
    await sendSummaryEmail(insertedCount)

    return new Response(
      JSON.stringify({ success: true, inserted: insertedCount, total_fetched: tmEvents.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Errore generale:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
