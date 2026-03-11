import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!
const EVENTBRITE_TOKEN = Deno.env.get('EVENTBRITE_TOKEN')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ADMIN_USER_ID = '51aeacbc-1497-440c-8edb-23845ce077d3'
const NOTIFY_EMAIL = 'info@milanohelp.it'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Ticketmaster ───

interface TicketmasterEvent {
  id: string
  name: string
  dates?: {
    start?: { dateTime?: string; localDate?: string }
    end?: { dateTime?: string }
  }
  _embedded?: {
    venues?: Array<{
      name?: string
      location?: { latitude?: string; longitude?: string }
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

  const bestImage = ev.images?.sort((a, b) => (b.width || 0) - (a.width || 0))?.[0]?.url || null
  const priceMin = ev.priceRanges?.[0]?.min
  const isGratuito = !priceMin || priceMin === 0
  const classification = ev.classifications?.[0]
  const categoria = classification?.genre?.name || classification?.segment?.name || 'Altro'

  let descrizione = ''
  if (ev.info) descrizione += ev.info
  if (ev.pleaseNote) descrizione += (descrizione ? '\n\n' : '') + ev.pleaseNote
  if (!descrizione.trim()) descrizione = 'Info e biglietti disponibili sul sito ufficiale.'
  if (ev.url) descrizione += `\n\n🔗 ${ev.url}`

  return {
    external_id: `ticketmaster_${ev.id}`,
    fonte_esterna: 'ticketmaster',
    titolo: ev.name,
    descrizione,
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
      console.error(`❌ Ticketmaster API error: ${res.status}`, await res.text())
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

// ─── Eventbrite ───

interface EventbriteEvent {
  id: string
  name?: { text?: string }
  description?: { text?: string }
  start?: { utc?: string; local?: string }
  end?: { utc?: string; local?: string }
  venue?: {
    name?: string
    address?: { localized_address_display?: string }
    latitude?: string
    longitude?: string
  }
  logo?: { original?: { url?: string }; url?: string }
  is_free?: boolean
  ticket_availability?: { minimum_ticket_price?: { major_value?: string } }
  category_id?: string
  url?: string
}

const EVENTBRITE_CATEGORY_MAP: Record<string, string> = {
  '103': 'Musica',
  '101': 'Business',
  '110': 'Food & Drink',
  '105': 'Arte',
  '104': 'Film & Media',
  '108': 'Sport & Fitness',
  '107': 'Salute',
  '102': 'Scienza & Tecnologia',
  '109': 'Viaggi',
  '106': 'Moda',
  '111': 'Charity',
  '112': 'Comunità',
  '113': 'Spiritualità',
  '114': 'Famiglia',
  '115': 'Stagionale',
  '199': 'Altro',
}

function mapEventbriteEvent(ev: EventbriteEvent) {
  const titolo = ev.name?.text
  const startDate = ev.start?.utc
  if (!titolo || !startDate) return null

  const endDate = ev.end?.utc || null
  const venue = ev.venue

  let descrizione = ev.description?.text?.trim() || ''
  if (!descrizione || descrizione.length < 20) {
    descrizione = 'Info e biglietti disponibili sul sito ufficiale.'
  }
  if (ev.url) descrizione += `\n\n🔗 ${ev.url}`

  const imageUrl = ev.logo?.original?.url || ev.logo?.url || null
  const isFree = ev.is_free === true
  const priceStr = ev.ticket_availability?.minimum_ticket_price?.major_value
  const prezzo = priceStr ? parseFloat(priceStr) : null
  const categoria = EVENTBRITE_CATEGORY_MAP[ev.category_id || ''] || 'Altro'

  return {
    external_id: `eventbrite_${ev.id}`,
    fonte_esterna: 'eventbrite',
    titolo,
    descrizione,
    data: startDate,
    fine: endDate,
    luogo: venue?.name || venue?.address?.localized_address_display || 'Milano',
    lat: venue?.latitude ? parseFloat(venue.latitude) : null,
    lon: venue?.longitude ? parseFloat(venue.longitude) : null,
    immagine: imageUrl,
    prezzo: isFree ? null : prezzo,
    gratuito: isFree,
    categoria,
    stato: 'attivo',
    organizzatore_id: ADMIN_USER_ID,
  }
}

async function fetchEventbriteEvents(): Promise<EventbriteEvent[]> {
  const now = new Date()
  const rangeStart = now.toISOString().split('.')[0]
  const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('.')[0]

  const allEvents: EventbriteEvent[] = []
  let page = 1
  const maxPages = 5

  while (page <= maxPages) {
    const params = new URLSearchParams({
      'location.address': 'Milano',
      'location.within': '20km',
      'start_date.range_start': rangeStart,
      'start_date.range_end': rangeEnd,
      'expand': 'venue,ticket_availability',
      'page': String(page),
    })

    const url = `https://www.eventbriteapi.com/v3/events/search/?${params}`
    console.log(`📡 Fetching Eventbrite page ${page}...`)

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${EVENTBRITE_TOKEN}` },
      })

      if (!res.ok) {
        console.error(`❌ Eventbrite API error: ${res.status}`, await res.text())
        break
      }

      const data = await res.json()
      const events: EventbriteEvent[] = data?.events || []
      allEvents.push(...events)

      const hasMore = data?.pagination?.has_more_items === true
      page++
      if (!hasMore) break
    } catch (err) {
      console.error('❌ Eventbrite fetch error:', err)
      break
    }
  }

  console.log(`✅ Eventbrite: trovati ${allEvents.length} eventi`)
  return allEvents
}

// ─── Email riepilogo ───

async function sendSummaryEmail(tmCount: number, ebCount: number) {
  const total = tmCount + ebCount
  if (total === 0) {
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
        <li><strong>Ticketmaster:</strong> ${tmCount} nuovi eventi</li>
        <li><strong>Eventbrite:</strong> ${ebCount} nuovi eventi</li>
        <li><strong>Totale:</strong> ${total} nuovi eventi</li>
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
        subject: `📅 Importazione eventi: ${total} nuovi (TM: ${tmCount}, EB: ${ebCount})`,
        html,
      }),
    })
    const resData = await res.json()
    console.log('📧 Email riepilogo:', res.ok ? 'inviata' : 'errore', resData)
  } catch (err) {
    console.error('❌ Errore invio email riepilogo:', err)
  }
}

// ─── Handler ───

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch existing external IDs
    const { data: existingEvents } = await supabase
      .from('eventi')
      .select('external_id')
      .not('external_id', 'is', null)

    const existingIds = new Set((existingEvents || []).map(e => e.external_id))
    console.log(`📋 ${existingIds.size} eventi esterni già presenti nel DB`)

    // 2. Fetch from both sources in parallel
    const [tmEvents, ebEvents] = await Promise.all([
      fetchTicketmasterEvents(),
      fetchEventbriteEvents(),
    ])

    // 3. Map and filter
    const newTmEvents = tmEvents
      .map(mapTicketmasterEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && !existingIds.has(e.external_id))

    const newEbEvents = ebEvents
      .map(mapEventbriteEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && !existingIds.has(e.external_id))

    const allNewEvents = [...newTmEvents, ...newEbEvents]
    console.log(`🆕 ${allNewEvents.length} nuovi eventi (TM: ${newTmEvents.length}, EB: ${newEbEvents.length})`)

    // 4. Insert in batches
    let insertedCount = 0
    const batchSize = 20
    for (let i = 0; i < allNewEvents.length; i += batchSize) {
      const batch = allNewEvents.slice(i, i + batchSize)
      const { error } = await supabase.from('eventi').insert(batch)
      if (error) {
        console.error(`❌ Errore inserimento batch ${i}:`, error)
      } else {
        insertedCount += batch.length
      }
    }

    const tmInserted = Math.min(newTmEvents.length, insertedCount)
    const ebInserted = Math.max(0, insertedCount - tmInserted)

    console.log(`✅ Inseriti ${insertedCount} nuovi eventi`)

    // 5. Send summary email
    await sendSummaryEmail(newTmEvents.length, newEbEvents.length)

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        ticketmaster: { fetched: tmEvents.length, new: newTmEvents.length },
        eventbrite: { fetched: ebEvents.length, new: newEbEvents.length },
      }),
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
