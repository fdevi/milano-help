import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY')!
const SEATGEEK_CLIENT_ID = Deno.env.get('SEATGEEK_CLIENT_ID')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ADMIN_USER_ID = '51aeacbc-1497-440c-8edb-23845ce077d3'
const NOTIFY_EMAIL = 'info@milanohelp.it'
const MIN_DESCRIPTION_LENGTH = 50

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Quality filter ───

function hasQuality(ev: { immagine: string | null; descrizione: string | null }): boolean {
  if (!ev.immagine) return false
  if (!ev.descrizione || ev.descrizione.length < MIN_DESCRIPTION_LENGTH) return false
  return true
}

// ─── Ticketmaster ───

interface TicketmasterEvent {
  id: string
  name: string
  dates?: { start?: { dateTime?: string; localDate?: string }; end?: { dateTime?: string } }
  _embedded?: { venues?: Array<{ name?: string; location?: { latitude?: string; longitude?: string }; city?: { name?: string } }> }
  images?: Array<{ url?: string; width?: number }>
  priceRanges?: Array<{ min?: number; max?: number }>
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>
  info?: string
  pleaseNote?: string
  url?: string
}

const TM_ALLOWED_SEGMENTS = ['music', 'arts & theatre', 'arts', 'theatre', 'film']

function isAllowedTmClassification(ev: TicketmasterEvent): boolean {
  if (!ev.classifications?.length) return true
  const segment = ev.classifications[0]?.segment?.name?.toLowerCase() || ''
  return TM_ALLOWED_SEGMENTS.some(s => segment.includes(s))
}

function mapTicketmasterEvent(ev: TicketmasterEvent) {
  if (!isAllowedTmClassification(ev)) return null

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

async function fetchTicketmasterForArea(city: string | null, latlong: string | null, radius: string | null): Promise<TicketmasterEvent[]> {
  const now = new Date()
  const startDateTime = now.toISOString().split('.')[0] + 'Z'
  const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const endDateTime = endDate.toISOString().split('.')[0] + 'Z'

  const allEvents: TicketmasterEvent[] = []
  let page = 0
  const maxPages = 5

  while (page < maxPages) {
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&countryCode=IT&startDateTime=${startDateTime}&endDateTime=${endDateTime}&size=50&page=${page}&sort=date,asc&classificationName=music,arts,theatre`
    if (city) url += `&city=${encodeURIComponent(city)}`
    if (latlong) url += `&latlong=${latlong}`
    if (radius) url += `&radius=${radius}&unit=km`

    console.log(`📡 TM page ${page} (${city || latlong})...`)
    const res = await fetch(url)
    if (!res.ok) { console.error(`❌ TM error: ${res.status}`); break }

    const data = await res.json()
    const events = data?._embedded?.events || []
    allEvents.push(...events)

    const totalPages = data?.page?.totalPages || 1
    page++
    if (page >= totalPages) break
  }

  return allEvents
}

async function fetchAllTicketmasterEvents(): Promise<TicketmasterEvent[]> {
  const [milanoEvents, monzaEvents] = await Promise.all([
    fetchTicketmasterForArea('Milano', null, null),
    fetchTicketmasterForArea(null, '45.583,9.275', '15'),
  ])

  // Deduplicate by id
  const seen = new Set<string>()
  const all: TicketmasterEvent[] = []
  for (const ev of [...milanoEvents, ...monzaEvents]) {
    if (!seen.has(ev.id)) { seen.add(ev.id); all.push(ev) }
  }
  console.log(`✅ TM totali: ${all.length} (Milano: ${milanoEvents.length}, Monza: ${monzaEvents.length})`)
  return all
}

// ─── SeatGeek ───

interface SeatGeekEvent {
  id: number
  title: string
  description?: string
  datetime_local?: string
  venue?: { name?: string; location?: { lat?: number; lon?: number }; city?: string }
  performers?: Array<{ image?: string; name?: string }>
  stats?: { lowest_price?: number }
  url?: string
  type?: string
  taxonomies?: Array<{ name?: string }>
}

const SG_ALLOWED_TYPES = ['concert', 'theater', 'arts', 'comedy', 'music_festival', 'classical', 'dance', 'opera', 'literary']

function isAllowedSgType(ev: SeatGeekEvent): boolean {
  const evType = ev.type?.toLowerCase() || ''
  if (SG_ALLOWED_TYPES.some(t => evType.includes(t))) return true
  if (ev.taxonomies?.some(tax => SG_ALLOWED_TYPES.some(t => (tax.name?.toLowerCase() || '').includes(t)))) return true
  return false
}

function mapSeatGeekEvent(ev: SeatGeekEvent) {
  if (!isAllowedSgType(ev)) return null
  if (!ev.datetime_local) return null

  const image = ev.performers?.[0]?.image || null
  let descrizione = ev.description || ''
  if (!descrizione || descrizione.length < 10) descrizione = 'Evento importato da SeatGeek.'
  if (ev.url) descrizione += `\n\n🔗 ${ev.url}`

  const lowestPrice = ev.stats?.lowest_price
  const isGratuito = !lowestPrice || lowestPrice === 0

  let categoria = 'Altro'
  if (ev.type) {
    const t = ev.type.toLowerCase()
    if (t.includes('concert') || t.includes('music')) categoria = 'Musica'
    else if (t.includes('theater') || t.includes('theatre')) categoria = 'Teatro'
    else if (t.includes('comedy')) categoria = 'Commedia'
    else if (t.includes('arts') || t.includes('classical') || t.includes('opera')) categoria = 'Arte e Cultura'
  }

  return {
    external_id: `seatgeek_${ev.id}`,
    fonte_esterna: 'seatgeek',
    titolo: ev.title,
    descrizione,
    data: ev.datetime_local,
    fine: null,
    luogo: ev.venue?.name || 'Milano',
    lat: ev.venue?.location?.lat || null,
    lon: ev.venue?.location?.lon || null,
    immagine: image,
    prezzo: lowestPrice || null,
    gratuito: isGratuito,
    categoria,
    stato: 'attivo',
    organizzatore_id: ADMIN_USER_ID,
  }
}

async function fetchSeatGeekForCity(city: string, lat?: number, lon?: number, range?: string): Promise<SeatGeekEvent[]> {
  const now = new Date()
  const dateGte = now.toISOString().split('T')[0]
  const endDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const dateLte = endDate.toISOString().split('T')[0]

  const allEvents: SeatGeekEvent[] = []
  let page = 1
  const maxPages = 5

  while (page <= maxPages) {
    let url = `https://api.seatgeek.com/2/events?client_id=${SEATGEEK_CLIENT_ID}&datetime_local.gte=${dateGte}&datetime_local.lte=${dateLte}&per_page=50&page=${page}`
    if (lat && lon && range) {
      url += `&lat=${lat}&lon=${lon}&range=${range}`
    } else {
      url += `&venue.city=${encodeURIComponent(city)}`
    }

    console.log(`📡 SeatGeek page ${page} (${city})...`)
    const res = await fetch(url)
    if (!res.ok) { console.error(`❌ SeatGeek error: ${res.status}`, await res.text()); break }

    const data = await res.json()
    const events: SeatGeekEvent[] = data?.events || []
    allEvents.push(...events)

    if (events.length < 50) break
    page++
  }

  return allEvents
}

async function fetchAllSeatGeekEvents(): Promise<SeatGeekEvent[]> {
  const [milanoEvents, monzaEvents] = await Promise.all([
    fetchSeatGeekForCity('Milano'),
    fetchSeatGeekForCity('Monza', 45.583, 9.275, '15mi'),
  ])

  const seen = new Set<number>()
  const all: SeatGeekEvent[] = []
  for (const ev of [...milanoEvents, ...monzaEvents]) {
    if (!seen.has(ev.id)) { seen.add(ev.id); all.push(ev) }
  }
  console.log(`✅ SeatGeek totali: ${all.length} (Milano: ${milanoEvents.length}, Monza: ${monzaEvents.length})`)
  return all
}

// ─── Email riepilogo ───

async function sendSummaryEmail(tmCount: number, sgCount: number) {
  const total = tmCount + sgCount
  if (total === 0) { console.log('📭 Nessun nuovo evento'); return }

  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;padding:20px;">
      <h2>📅 Riepilogo importazione eventi</h2>
      <ul>
        <li><strong>Ticketmaster:</strong> ${tmCount} nuovi eventi</li>
        <li><strong>SeatGeek:</strong> ${sgCount} nuovi eventi</li>
      </ul>
      <p>Totale: <strong>${total}</strong> nuovi eventi (finestra 60 giorni, Milano + Monza).</p>
      <p>Filtri attivi: solo concerti/spettacoli/cultura, con foto e descrizione ≥${MIN_DESCRIPTION_LENGTH} caratteri.</p>
      <p style="color:#666;font-size:12px;margin-top:30px;">Milano Help - Importazione automatica eventi</p>
    </body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Milano Help <noreply@milanohelp.it>',
        to: [NOTIFY_EMAIL],
        subject: `📅 Importazione: ${tmCount} TM + ${sgCount} SG = ${total} nuovi eventi`,
        html,
      }),
    })
    console.log('📧 Email:', res.ok ? 'inviata' : 'errore')
  } catch (err) { console.error('❌ Email error:', err) }
}

// ─── Handler ───

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Get existing external IDs
    const { data: existingEvents } = await supabase
      .from('eventi').select('external_id').not('external_id', 'is', null)
    const existingIds = new Set((existingEvents || []).map(e => e.external_id))
    console.log(`📋 ${existingIds.size} eventi esterni già presenti`)

    // 2. Fetch from all sources in parallel
    const [tmEvents, sgEvents] = await Promise.all([
      fetchAllTicketmasterEvents(),
      fetchAllSeatGeekEvents(),
    ])

    // 3. Map, filter quality, filter duplicates
    const newTmEvents = tmEvents
      .map(mapTicketmasterEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && hasQuality(e) && !existingIds.has(e.external_id))

    const newSgEvents = sgEvents
      .map(mapSeatGeekEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && hasQuality(e) && !existingIds.has(e.external_id))

    console.log(`🆕 TM: ${newTmEvents.length}, SG: ${newSgEvents.length} nuovi eventi di qualità`)

    // 4. Insert in batches
    const allNew = [...newTmEvents, ...newSgEvents]
    let tmInserted = 0, sgInserted = 0
    const batchSize = 20

    for (let i = 0; i < allNew.length; i += batchSize) {
      const batch = allNew.slice(i, i + batchSize)
      const { error } = await supabase.from('eventi').insert(batch)
      if (error) {
        console.error(`❌ Batch ${i} error:`, error)
      } else {
        for (const ev of batch) {
          if (ev.fonte_esterna === 'ticketmaster') tmInserted++
          else sgInserted++
        }
      }
    }

    console.log(`✅ Inseriti TM: ${tmInserted}, SG: ${sgInserted}`)

    // 5. Email
    await sendSummaryEmail(tmInserted, sgInserted)

    return new Response(JSON.stringify({
      success: true,
      ticketmaster: { fetched: tmEvents.length, inserted: tmInserted },
      seatgeek: { fetched: sgEvents.length, inserted: sgInserted },
      total_inserted: tmInserted + sgInserted,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('❌ Errore generale:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
