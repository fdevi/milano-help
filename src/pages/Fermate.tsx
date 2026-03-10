// src/pages/Fermate.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronDown, Bus, ArrowLeft, MapPin, LocateFixed } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYmx1ZXgiLCJhIjoiY21tZGpxM2d4MDNsYjJxczc1enhiODRwZiJ9.Trj9Jg8cpsKLKNZun7Z23Q";

/** Costruttore Map nativo (evita conflitto con Map di react-map-gl) */
const MapNative = globalThis.Map;

type Vista = 'fermate' | 'linea' | 'corsa';

/** Tipi compatibili con la UI esistente */
export interface Fermata {
  id: string;
  nome: string;
  tipo: string;
  lat: number;
  lng: number;
  distanza: number;
  linee: LineaPassaggio[];
  route_type?: number; // GTFS: 0=tram, 1=metro, 2=treno, 3=bus
}

export interface LineaPassaggio {
  numero: string;
  direzione: string;
  orario: string;
  percorsoId: string; // trip_id per caricare il percorso
  route_type?: number;
}

export interface Percorso {
  id: string;
  nome: string;
  colore: string;
  fermate: { nome: string; lat: number; lng: number; arrivo?: string; partenza?: string }[];
}

/** Formato MooneyGo per vista 2: linee con direzioni e orari (max 3 per direzione, con trip_id per vista 3) */
export interface OrarioConTrip {
  orario: string;
  trip_id: string;
}
export interface DirezioneConOrari {
  nome: string;
  orari: OrarioConTrip[];
}
export interface LineaConDirezioni {
  nome: string;
  colore: string;
  route_type?: number;
  direzioni: DirezioneConOrari[];
}
export interface LineePerFermata {
  linee: LineaConDirezioni[];
}

/** Distanza in metri (formula di Haversine) */
function calcolaDistanza(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // raggio Terra in metri
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Emoji in base a route_type GTFS (0=tram, 1=metro, 2=treno, 3=bus) o tipo testuale */
function emojiForTipo(tipo: string | number): string {
  if (typeof tipo === 'number') {
    if (tipo === 0) return '🚊';
    if (tipo === 1) return '🚇';
    if (tipo === 2) return '🚆';
    if (tipo === 3) return '🚌';
    return '🚏';
  }
  if (tipo.includes('Metropolitana')) return '🚇';
  if (tipo.toLowerCase().includes('tram')) return '🚊';
  if (tipo.toLowerCase().includes('treno')) return '🚆';
  if (tipo.toLowerCase().includes('bus')) return '🚌';
  return '🚌';
}

/** Deduce il tipo di mezzo dal nome della fermata (fallback quando manca route_type) */
function deduciTipoMezzo(nome: string | null): string {
  if (!nome) return 'Bus';
  const upper = nome.toUpperCase();
  if (/M[1-5]/.test(upper)) return 'Metropolitana';
  if (upper.includes('TRAM')) return 'Tram';
  if (upper.includes('BUS')) return 'Bus';
  if (upper.includes('TRENO') || upper.includes('STAZIONE') || upper.includes('FS')) return 'Treno';
  return 'Bus';
}

/** Colore linea in base a route_type */
function colorePerRouteType(routeType: number | null | undefined): string {
  if (routeType === 0) return '#00a651';
  if (routeType === 1) return '#f9b718';
  if (routeType === 2) return '#0066ad';
  if (routeType === 3) return '#e85b21';
  return '#6b7280';
}

/** Normalizza arrival_time GTFS (es. "04:37:00", "25:30:00" per giorno dopo) in "HH:MM" */
function normalizzaOrario(t: string | null): string {
  if (!t) return '';
  const parts = t.trim().split(':');
  let h = parseInt(parts[0], 10);
  const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (h >= 24) h -= 24;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Converte orario GTFS in minuti (0..1440+). Ore 25:xx = giorno dopo; 00:xx-03:xx considerate giorno dopo per confronto con sera. */
function orarioToMinuti(t: string | null): number {
  if (!t) return 0;
  const parts = t.trim().split(':');
  let h = parseInt(parts[0], 10);
  const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (h >= 24) return (h - 24) * 60 + m + 24 * 60;
  if (h < 4) return h * 60 + m + 24 * 60;
  return h * 60 + m;
}

function isMetro(tipo: string): boolean {
  return tipo.includes('Metropolitana');
}

function isMetroLine(numero: string): boolean {
  return /^M\d*$/.test(numero.trim());
}

/** Normalizza il nome visualizzato della linea: per metro (route_type=1) aggiunge prefisso "M" se manca; rimuove prefisso "N" (NM→M). */
function displayNomeLinea(nome: string, routeType: number | null | undefined): string {
  let n = nome.trim();
  // Rimuovi prefisso "N" (es. NM1 → M1, NM3 → M3)
  n = n.replace(/^N/i, '').trim() || n;
  // Se route_type=1 (metro) e il nome è solo un numero, aggiungi "M"
  if (routeType === 1 && /^\d+$/.test(n)) {
    n = `M${n}`;
  }
  return n;
}

/** Stile badge per lista fermate (vista 1): usa il nome display (già normalizzato con M per metro). */
function getBadgeStyle(displayName: string, routeType: number | null | undefined): { base: string; color: string } {
  const n = displayName.trim().toUpperCase();
  const square = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold';
  const rect = 'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold min-h-[2rem]';
  const circle = 'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold';
  // Metro: M1-M5 (quadrato arrotondato)
  if (n === 'M1') return { base: square, color: 'bg-red-600 text-white' };
  if (n === 'M2') return { base: square, color: 'bg-green-600 text-white' };
  if (n === 'M3') return { base: square, color: 'bg-yellow-400 text-black' };
  if (n === 'M4') return { base: square, color: 'bg-blue-600 text-white' };
  if (n === 'M5') return { base: square, color: 'bg-purple-600 text-white' };
  // Tram (route_type 0): cerchio verde
  if (routeType === 0) return { base: circle, color: 'bg-green-600 text-black' };
  // Bus (route_type 3 o numerico): rettangolo arancione
  if (routeType === 3 || /^[\d\/\-\.]+$/.test(n)) return { base: rect, color: 'bg-orange-500 text-black' };
  // Altro
  return { base: circle, color: 'bg-gray-500 text-white' };
}

/** Normalizza il nome della linea: rimuove prefisso "N" (es. NM3 → M3, NM4 → M4, NM5 → M5). Usato in lineePerFermata e badge. */
function normalizzaNomeLinea(nome: string): string {
  if (!nome) return '';
  const senzaN = nome.replace(/^N/i, '').trim();
  return senzaN || nome;
}

/** Testo da mostrare nel badge: usa displayNomeLinea. */
function badgeLabel(nome: string, routeType: number | null | undefined): string {
  return displayNomeLinea(nome, routeType);
}

type MarkerStyleType = 'metro' | 'bus' | 'tram' | 'treno' | 'other';

/** Stile marker mappa: priorità metro > bus > tram > treno > altro. Usa displayNomeLinea per match esatto. */
function getMarkerStyle(
  fermata: { id: string; nome: string; tipo: string },
  lineePerFermata: Record<string, { nome: string; tipo: number }[]>
): { markerType: MarkerStyleType; bgClass: string; textClass: string; label: string } {
  const linee = lineePerFermata[fermata.id] ?? [];

  // Metro: cerca linee con route_type=1
  const metroLinee = linee.filter((l) => l.tipo === 1);
  if (metroLinee.length > 0) {
    // Trova la prima metro M1-M5 per il colore del marker
    for (const ml of metroLinee) {
      const dn = displayNomeLinea(ml.nome, 1).toUpperCase();
      if (dn === 'M1') return { markerType: 'metro', bgClass: 'bg-red-600', textClass: 'text-white', label: 'M' };
      if (dn === 'M2') return { markerType: 'metro', bgClass: 'bg-green-600', textClass: 'text-white', label: 'M' };
      if (dn === 'M3') return { markerType: 'metro', bgClass: 'bg-yellow-400', textClass: 'text-black', label: 'M' };
      if (dn === 'M4') return { markerType: 'metro', bgClass: 'bg-blue-600', textClass: 'text-white', label: 'M' };
      if (dn === 'M5') return { markerType: 'metro', bgClass: 'bg-purple-600', textClass: 'text-white', label: 'M' };
    }
    return { markerType: 'metro', bgClass: 'bg-amber-500', textClass: 'text-black', label: 'M' };
  }
  // Bus (route_type === 3)
  if (linee.some((l) => l.tipo === 3))
    return { markerType: 'bus', bgClass: 'bg-orange-500', textClass: 'text-black', label: 'BUS' };
  // Tram (route_type === 0)
  if (linee.some((l) => l.tipo === 0))
    return { markerType: 'tram', bgClass: 'bg-green-100', textClass: '', label: '🚊' };
  // Treno (route_type === 2)
  if (linee.some((l) => l.tipo === 2))
    return { markerType: 'treno', bgClass: 'bg-blue-600', textClass: 'text-white', label: 'T' };
  // Fallback
  return { markerType: 'other', bgClass: 'bg-gray-100', textClass: '', label: '🚌' };
}

/** Genera orari finti a partire da ora (arrotondata a 5 min), 8 corse */
function generaOrari(): { orario: string }[] {
  const now = new Date();
  let hour = now.getHours();
  let min = Math.ceil(now.getMinutes() / 5) * 5;
  if (min >= 60) {
    min = 0;
    hour += 1;
  }
  const orari: { orario: string }[] = [];
  for (let i = 0; i < 8; i++) {
    let m = min + i * 5;
    let h = hour + Math.floor(m / 60);
    m = m % 60;
    if (h >= 24) h -= 24;
    orari.push({
      orario: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
    });
  }
  return orari;
}

/** Genera N orari a intervalli di 5 min (es. base "19:59" -> ["19:59", "20:04", "20:09", "20:14"]). Se baseOrario è "0:MM" usa ora attuale :MM. */
function generaOrariPerDirezione(baseOrario: string, count: number = 4): string[] {
  const now = new Date();
  let hour = now.getHours();
  let min = Math.ceil(now.getMinutes() / 5) * 5;
  if (min >= 60) {
    min = 0;
    hour += 1;
  }
  let base = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  if (baseOrario && /^\d{1,2}:\d{2}$/.test(baseOrario)) {
    const [h, m] = baseOrario.split(':').map(Number);
    if (m < 60) {
      if (h > 0 && h < 24) {
        base = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } else {
        base = `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(aggiungiMinuti(base, i * 5));
  return out;
}

/** Converte "HH:MM" in minuti totali; aggiunge delta minuti e ritorna "HH:MM" */
function aggiungiMinuti(orario: string, deltaMinuti: number): string {
  const [h, m] = orario.split(':').map(Number);
  let total = h * 60 + m + deltaMinuti;
  if (total < 0) total += 24 * 60;
  total = total % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
}

/** Trova l'indice della fermata nel percorso (match sul nome) */
function indiceFermataNelPercorso(percorso: Percorso, nomeFermata: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/milano,?\s*/gi, '')
      .trim();
  const n = norm(nomeFermata);
  const idx = percorso.fermate.findIndex(
    (f) => norm(f.nome).includes(n) || n.includes(norm(f.nome))
  );
  return idx >= 0 ? idx : 0;
}

/** Calcola arrivo/partenza per ogni fermata del percorso (2 min tra fermate) */
function orariPerFermate(
  percorso: Percorso,
  orarioPartenzaSelezionata: string,
  indiceFermataSelezionata: number
): { arrivo: string; partenza: string }[] {
  const MINUTI_TRA_FERMATE = 2;
  const n = percorso.fermate.length;
  const result: { arrivo: string; partenza: string }[] = Array(n)
    .fill(null)
    .map(() => ({ arrivo: '', partenza: '' }));

  result[indiceFermataSelezionata].arrivo = orarioPartenzaSelezionata;
  result[indiceFermataSelezionata].partenza = orarioPartenzaSelezionata;

  for (let i = indiceFermataSelezionata - 1; i >= 0; i--) {
    const nextPart = result[i + 1].partenza;
    result[i].partenza = aggiungiMinuti(nextPart, -MINUTI_TRA_FERMATE);
    result[i].arrivo = result[i].partenza;
  }
  for (let i = indiceFermataSelezionata + 1; i < n; i++) {
    const prevPart = result[i - 1].partenza;
    result[i].arrivo = aggiungiMinuti(prevPart, MINUTI_TRA_FERMATE);
    result[i].partenza = result[i].arrivo;
  }
  return result;
}

const MIN_SHEET_HEIGHT = 4;
const MAX_SHEET_HEIGHT = 100;

const Fermate: React.FC = () => {
  const [sheetHeight, setSheetHeight] = useState(50);
  const dragRef = useRef({ startY: 0, startHeight: 0 });

  const [vista, setVista] = useState<Vista>('fermate');
  const [selectedFermata, setSelectedFermata] = useState<Fermata | null>(null);
  const [lineaSelezionata, setLineaSelezionata] = useState<{
    nome: string;
    direzione: string;
    percorsoId: string;
  } | null>(null);
  const [fermataSelezionata, setFermataSelezionata] = useState<Fermata | null>(null);
  const [corsaSelezionata, setCorsaSelezionata] = useState<{
    linea: string;
    direzione: string;
    orario: string;
  } | null>(null);

  const [selectedPercorso, setSelectedPercorso] = useState<Percorso | null>(null);
  const [selectedFermataNome, setSelectedFermataNome] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const [searchCenter, setSearchCenter] = useState({ lat: 45.4642, lng: 9.19 }); // Milano centro
  const [fermate, setFermate] = useState<Fermata[]>([]);
  const [loadingFermate, setLoadingFermate] = useState(false);
  const [popupFermata, setPopupFermata] = useState<Fermata | null>(null);
  const [lineeCache, setLineeCache] = useState<Record<string, LineePerFermata>>({});
  const [loadingLinee, setLoadingLinee] = useState(false);
  const [lineePerFermataSelezionata, setLineePerFermataSelezionata] = useState<LineePerFermata | null>(null);
  /** Linee per stop_id (vista 1): nome + route_type per badge colorati, da RPC fermate_con_linee */
  const [lineePerFermata, setLineePerFermata] = useState<Record<string, { nome: string; tipo: number }[]>>({});

  const { latitude, longitude, requestPosition, loading: geoLoading } = useGeolocation();

  /** Carica fermate in un rettangolo approssimato (lat/lon ± delta), poi filtra per distanza Haversine */
  const caricaFermateVicine = async (lat: number, lng: number, raggioM: number = 2000) => {
    setLoadingFermate(true);
    const delta = raggioM / 111320; // ~111.32 km per grado di latitudine
    const { data, error } = await supabase
      .from('fermate_atm')
      .select('stop_id, stop_name, stop_lat, stop_lon')
      .gte('stop_lat', lat - delta)
      .lte('stop_lat', lat + delta)
      .gte('stop_lon', lng - delta)
      .lte('stop_lon', lng + delta)
      .limit(500);

    if (error) {
      console.error('Errore caricamento fermate:', error);
      setFermate([]);
      setLineePerFermata({});
    } else if (data) {
      const conDistanza = data
        .filter((f) => f.stop_lat != null && f.stop_lon != null && f.stop_name != null)
        .map((f) => ({
          ...f,
          distanza: calcolaDistanza(lat, lng, f.stop_lat!, f.stop_lon!),
        }))
        .filter((f) => f.distanza <= raggioM)
        .sort((a, b) => a.distanza - b.distanza)
        .slice(0, 300);
      const fermateMappate: Fermata[] = conDistanza.map((f) => ({
        id: f.stop_id,
        nome: f.stop_name!,
        lat: f.stop_lat!,
        lng: f.stop_lon!,
        tipo: deduciTipoMezzo(f.stop_name),
        distanza: f.distanza,
        linee: [],
      }));
      setFermate(fermateMappate);

      const stopIds = fermateMappate.map((f) => f.id).slice(0, 300);
      console.log('[Fermate] Carico linee per', stopIds.length, 'fermate dalla lookup table');
      if (stopIds.length > 0) {
        const { data: lineeData, error: errLinee } = await supabase
          .from('fermate_linee_lookup')
          .select('stop_id, route_short_name, route_type')
          .in('stop_id', stopIds);
        console.log('[Fermate] Lookup risposta:', { righe: lineeData?.length ?? 0, errore: errLinee });
        if (!errLinee && lineeData?.length) {
          const grouped = new MapNative<string, { nome: string; tipo: number }[]>();
          for (const row of lineeData) {
            const nome = row.route_short_name?.trim();
            if (!nome) continue;
            const tipo = row.route_type ?? 3;
            if (!grouped.has(row.stop_id)) grouped.set(row.stop_id, []);
            const arr = grouped.get(row.stop_id)!;
            if (!arr.some((l) => l.nome === nome)) arr.push({ nome, tipo });
          }
          const result = Object.fromEntries(grouped);
          console.log('[Fermate] lineePerFermata salvate:', Object.keys(result).length, 'fermate con linee');
          setLineePerFermata(result);
        } else {
          console.warn('[Fermate] Lookup: nessun dato o errore', errLinee);
          setLineePerFermata({});
        }
      } else {
        setLineePerFermata({});
      }
    } else {
      setLineePerFermata({});
    }
    setLoadingFermate(false);
  };

  /** Carica linee e prossimi orari per una fermata (vista 2). Formato MooneyGo: linee[].direzioni[].orari (max 3 per direzione, con trip_id). */
  const caricaLineePerFermata = async (stopId: string): Promise<LineePerFermata> => {
    const empty: LineePerFermata = { linee: [] };
    const { data: stopTimes, error: errSt } = await supabase
      .from('stop_times_atm')
      .select('trip_id, arrival_time')
      .eq('stop_id', stopId)
      .order('arrival_time', { ascending: true })
      .limit(1000);
    if (errSt) {
      console.error('caricaLineePerFermata stop_times:', errSt);
      return empty;
    }
    if (!stopTimes?.length) return empty;

    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

    const tripIds = [...new Set(stopTimes.map((st) => st.trip_id))];
    const { data: trips, error: errTr } = await supabase
      .from('trips_atm')
      .select('trip_id, route_id, trip_headsign')
      .in('trip_id', tripIds.slice(0, 500));
    if (errTr || !trips?.length) return empty;

    const routeIds = [...new Set(trips.map((t) => t.route_id).filter(Boolean))] as string[];
    const { data: routes, error: errR } = await supabase
      .from('routes_atm')
      .select('route_id, route_short_name, route_type')
      .in('route_id', routeIds);
    if (errR) return empty;

    const routeMap = new MapNative<string, { nome: string; route_type: number | null }>();
    routes?.forEach((r) => {
      routeMap.set(r.route_id, { nome: r.route_short_name ?? r.route_id, route_type: r.route_type ?? null });
    });
    const tripMap = new MapNative(trips.map((t) => [t.trip_id, t]));

    type Acc = { routeId: string; headsign: string; routeType: number | null; items: OrarioConTrip[] };
    const byKey = new MapNative<string, Acc>();
    for (const st of stopTimes) {
      const t = tripMap.get(st.trip_id);
      if (!t?.route_id) continue;
      const r = routeMap.get(t.route_id);
      const headsign = t.trip_headsign ?? '';
      const key = `${t.route_id}|${headsign}`;
      const orario = normalizzaOrario(st.arrival_time);
      if (!orario) continue;
      const min = orarioToMinuti(st.arrival_time);
      if (min < nowMin - 60) continue;
      if (!byKey.has(key)) {
        byKey.set(key, { routeId: t.route_id, headsign, routeType: r?.route_type ?? null, items: [] });
      }
      const acc = byKey.get(key)!;
      if (acc.items.length < 3) acc.items.push({ orario, trip_id: st.trip_id });
    }

    const byRoute = new MapNative<string, LineaConDirezioni>();
    byKey.forEach((acc) => {
      const nome = routeMap.get(acc.routeId)?.nome ?? acc.routeId;
      const colore = colorePerRouteType(acc.routeType);
      if (!byRoute.has(acc.routeId)) {
        byRoute.set(acc.routeId, {
          nome,
          colore,
          route_type: acc.routeType ?? undefined,
          direzioni: [],
        });
      }
      const linea = byRoute.get(acc.routeId)!;
      linea.direzioni.push({
        nome: acc.headsign ? `per ${acc.headsign}` : '',
        orari: acc.items,
      });
    });
    return { linee: Array.from(byRoute.values()) };
  };

  /** Carica percorso completo di una corsa (vista 3 + polyline mappa) */
  const caricaPercorsoCorsa = async (tripId: string): Promise<Percorso | null> => {
    const { data: stopTimes, error: errSt } = await supabase
      .from('stop_times_atm')
      .select('stop_id, stop_sequence, arrival_time, departure_time')
      .eq('trip_id', tripId)
      .order('stop_sequence');
    if (errSt || !stopTimes?.length) return null;

    const { data: trip } = await supabase.from('trips_atm').select('route_id, trip_headsign').eq('trip_id', tripId).single();
    if (!trip?.route_id) return null;

    const { data: route } = await supabase.from('routes_atm').select('route_short_name, route_type').eq('route_id', trip.route_id).single();
    const stopIds = stopTimes.map((st) => st.stop_id);
    const { data: stops } = await supabase.from('fermate_atm').select('stop_id, stop_name, stop_lat, stop_lon').in('stop_id', stopIds);
    const stopMap = new MapNative(stops?.map((s) => [s.stop_id, s]) ?? []);

    const fermate: { nome: string; lat: number; lng: number; arrivo?: string; partenza?: string }[] = [];
    for (const st of stopTimes) {
      const s = stopMap.get(st.stop_id);
      if (!s?.stop_lat || !s.stop_lon) continue;
      fermate.push({
        nome: s.stop_name ?? st.stop_id,
        lat: s.stop_lat,
        lng: s.stop_lon,
        arrivo: normalizzaOrario(st.arrival_time),
        partenza: normalizzaOrario(st.departure_time),
      });
    }
    const nomeRoute = route?.route_short_name ?? trip.route_id;
    const headsign = trip.trip_headsign ?? '';
    return {
      id: tripId,
      nome: `${nomeRoute} per ${headsign}`,
      colore: colorePerRouteType(route?.route_type ?? null),
      fermate,
    };
  };

  useEffect(() => {
    caricaFermateVicine(searchCenter.lat, searchCenter.lng);
  }, []);

  const handleGeolocate = () => {
    requestPosition();
  };

  useEffect(() => {
    if (latitude != null && longitude != null && mapRef.current) {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      map?.flyTo?.({ center: [longitude, latitude], zoom: 16 });
      setSearchCenter({ lat: latitude, lng: longitude });
      caricaFermateVicine(latitude, longitude);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (map) {
      map.flyTo?.({ center: [searchCenter.lng, searchCenter.lat], zoom: 14 });
    }
  }, []);

  useEffect(() => {
    if (!selectedPercorso || selectedPercorso.fermate.length === 0) return;
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;
    const bounds = new mapboxgl.LngLatBounds();
    selectedPercorso.fermate.forEach((f) => bounds.extend([f.lng, f.lat]));
    map.fitBounds?.(bounds, { padding: 50, duration: 1000 });
  }, [selectedPercorso]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragRef.current = { startY: touch.clientY, startHeight: sheetHeight };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragRef.current.startY;
    const newHeight = dragRef.current.startHeight - (deltaY / window.innerHeight) * 100;
    setSheetHeight(Math.max(MIN_SHEET_HEIGHT, Math.min(MAX_SHEET_HEIGHT, newHeight)));
  };

  const handleTouchEnd = () => {};

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: sheetHeight };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    const deltaY = e.clientY - dragRef.current.startY;
    const newHeight = dragRef.current.startHeight - (deltaY / window.innerHeight) * 100;
    setSheetHeight(Math.max(MIN_SHEET_HEIGHT, Math.min(MAX_SHEET_HEIGHT, newHeight)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  /** Click su un orario in vista 2: apre vista 3 con il percorso del trip */
  const handleOrarioClick = async (tripId: string, orario: string, lineaNome: string, direzione: string) => {
    setLineaSelezionata({ nome: lineaNome, direzione, percorsoId: tripId });
    setCorsaSelezionata({ linea: lineaNome, direzione, orario });
    setSelectedFermataNome(selectedFermata?.nome ?? fermataSelezionata?.nome ?? null);
    setVista('corsa');
    const percorso = await caricaPercorsoCorsa(tripId);
    if (percorso) setSelectedPercorso(percorso);
  };

  const handleMarkerClick = (f: Fermata) => {
    const linee = lineePerFermata[f.id] ?? [];
    if (linee.length > 0) {
      console.log('[Fermate] Click fermata:', f.nome, '| linee restituite:', linee.map((l) => `${l.nome}(tipo=${l.tipo})`));
    }
    setSelectedFermata(f);
    setFermataSelezionata(f);
    setLineaSelezionata(null);
    setVista('linea');
    if (lineeCache[f.id]) {
      setLineePerFermataSelezionata(lineeCache[f.id]);
    } else {
      setLoadingLinee(true);
      setLineePerFermataSelezionata(null);
      caricaLineePerFermata(f.id).then((data) => {
        setLineeCache((prev) => ({ ...prev, [f.id]: data }));
        setLineePerFermataSelezionata(data);
        setLoadingLinee(false);
      });
    }
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (map?.flyTo) {
      map.flyTo({ center: [f.lng, f.lat], zoom: 16, duration: 500 });
    }
  };

  const handleMapMoveEnd = () => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const lat = center.lat;
    const lng = center.lng;
    setSearchCenter({ lat, lng });
    caricaFermateVicine(lat, lng);
  };

  const handleSearchMarkerDragEnd = (e: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = e.lngLat;
    setSearchCenter({ lat, lng });
    caricaFermateVicine(lat, lng);
  };

  const handleBack = () => {
    if (vista === 'linea') {
      setVista('fermate');
      setSelectedFermata(null);
      setLineaSelezionata(null);
      setFermataSelezionata(null);
    } else if (vista === 'corsa') {
      setVista('linea');
      setCorsaSelezionata(null);
      setSelectedPercorso(null);
      setSelectedFermataNome(null);
    }
  };

  const percorsoGeoJson = selectedPercorso
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: selectedPercorso.fermate.map((f) => [f.lng, f.lat]),
            },
            properties: {},
          },
        ],
      }
    : null;

  const puntiGeoJson =
    selectedPercorso && selectedFermataNome
      ? {
          type: 'FeatureCollection' as const,
          features: selectedPercorso.fermate.map((f) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [f.lng, f.lat] as [number, number],
            },
            properties: {
              isCurrent:
                selectedFermataNome.toLowerCase().includes(f.nome.toLowerCase()) ||
                f.nome.toLowerCase().includes(
                  selectedFermataNome.replace(/milano,?\s*/gi, '').trim().toLowerCase()
                ),
            },
          })),
        }
      : null;

  /** Orari calcolati per vista 3 (usati solo se GTFS non fornisce arrivo/partenza) */
  const dettaglioCorsaOrari =
    vista === 'corsa' &&
    corsaSelezionata &&
    lineaSelezionata &&
    selectedPercorso &&
    selectedFermataNome
      ? orariPerFermate(
          selectedPercorso,
          corsaSelezionata.orario,
          indiceFermataNelPercorso(selectedPercorso, selectedFermataNome)
        )
      : [];

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="flex-1 relative">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            longitude: searchCenter.lng,
            latitude: searchCenter.lat,
            zoom: 14,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onMoveEnd={handleMapMoveEnd}
        >
          <NavigationControl position="top-right" />
          {/* Marker rosso trascinabile: centro di ricerca */}
          <Marker
            longitude={searchCenter.lng}
            latitude={searchCenter.lat}
            anchor="center"
            draggable
            onDragEnd={handleSearchMarkerDragEnd}
          >
            <div
              className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              title="Trascina per cambiare zona di ricerca"
            />
          </Marker>
          {fermate.map((f) => {
            const style = getMarkerStyle(f, lineePerFermata);
            const baseClasses = 'flex items-center justify-center shadow-md border border-gray-300 cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-shadow';
            const markerClasses =
              style.markerType === 'metro'
                ? `w-6 h-6 rounded-md text-xs font-bold ${style.bgClass} ${style.textClass}`
                : style.markerType === 'bus'
                  ? `w-8 h-6 rounded-md text-xs font-bold ${style.bgClass} ${style.textClass}`
                  : style.markerType === 'tram'
                    ? `w-8 h-8 rounded-full text-lg leading-none ${style.bgClass}`
                    : style.markerType === 'treno'
                      ? `w-6 h-6 rounded-full text-xs font-bold ${style.bgClass} ${style.textClass}`
                      : `w-8 h-8 rounded-full text-lg leading-none ${style.bgClass}`;
            return (
              <Marker key={f.id} longitude={f.lng} latitude={f.lat} anchor="center">
                <div
                  className={`${baseClasses} ${markerClasses}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkerClick(f);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleMarkerClick(f);
                    }
                  }}
                  aria-label={`Fermata ${f.nome}`}
                >
                  {style.label}
                </div>
              </Marker>
            );
          })}
          {latitude != null && longitude != null && (
            <Marker longitude={longitude} latitude={latitude} anchor="center">
              <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
            </Marker>
          )}
          {percorsoGeoJson && (
            <Source id="percorso-line" type="geojson" data={percorsoGeoJson}>
              <Layer
                id="linea-percorso"
                type="line"
                paint={{
                  'line-color': selectedPercorso?.colore ?? '#3b82f6',
                  'line-width': 4,
                }}
              />
            </Source>
          )}
          {puntiGeoJson && (
            <Source id="percorso-punti" type="geojson" data={puntiGeoJson}>
              <Layer
                id="punti-percorso"
                type="circle"
                paint={{
                  'circle-radius': ['case', ['==', ['get', 'isCurrent'], true], 10, 6],
                  'circle-color': [
                    'case',
                    ['==', ['get', 'isCurrent'], true],
                    '#fbbf24',
                    '#3b82f6',
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}
        </Map>
        {/* Pulsante di geolocalizzazione - allineato ai controlli zoom Mapbox */}
        <div className="absolute" style={{ top: '120px', right: '12px', zIndex: 20 }}>
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="bg-white p-1.5 rounded-md shadow-md hover:bg-gray-100 transition-colors disabled:opacity-50 border border-gray-200"
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Vai alla mia posizione"
          >
            <LocateFixed className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg flex flex-col overflow-hidden"
        style={{ zIndex: 10, height: `${sheetHeight}%` }}
      >
        <div
          className="flex flex-shrink-0 justify-center items-center py-2 relative min-h-[40px] cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => sheetHeight < MIN_SHEET_HEIGHT + 1 && setSheetHeight(50)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (sheetHeight < MIN_SHEET_HEIGHT + 1) setSheetHeight(50);
            }
          }}
          aria-label="Trascina per espandere o ridurre la lista"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          {sheetHeight > 90 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSheetHeight(50);
              }}
              className="absolute right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Riduci a metà schermo"
            >
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {sheetHeight > MIN_SHEET_HEIGHT && (
          <div className="overflow-y-auto flex-1 min-h-0 px-4 pb-6 bg-white">
            {/* Vista 1 – Lista fermate */}
            {vista === 'fermate' && (
              <>
                <div className="mb-3 text-sm text-gray-500">Cerca in questa zona</div>
                {loadingFermate ? (
                  <div className="py-8 text-center text-gray-500">Caricamento fermate...</div>
                ) : (
                <>
                {fermate.map((fermata) => (
                  <div
                    key={fermata.id}
                    className="mb-4 pb-3 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                      onClick={() => {
                        setSelectedFermata(fermata);
                        setFermataSelezionata(fermata);
                        setLineaSelezionata(null);
                        setVista('linea');
                        if (lineeCache[fermata.id]) {
                          setLineePerFermataSelezionata(lineeCache[fermata.id]);
                        } else {
                          setLoadingLinee(true);
                          setLineePerFermataSelezionata(null);
                          caricaLineePerFermata(fermata.id).then((data) => {
                            setLineeCache((prev) => ({ ...prev, [fermata.id]: data }));
                            setLineePerFermataSelezionata(data);
                            setLoadingLinee(false);
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedFermata(fermata);
                          setFermataSelezionata(fermata);
                          setLineaSelezionata(null);
                          setVista('linea');
                          if (lineeCache[fermata.id]) setLineePerFermataSelezionata(lineeCache[fermata.id]);
                          else {
                            setLoadingLinee(true);
                            setLineePerFermataSelezionata(null);
                            caricaLineePerFermata(fermata.id).then((data) => {
                              setLineeCache((prev) => ({ ...prev, [fermata.id]: data }));
                              setLineePerFermataSelezionata(data);
                              setLoadingLinee(false);
                            });
                          }
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="flex-shrink-0 text-xl leading-none" aria-hidden>
                        {emojiForTipo(fermata.tipo)}
                      </span>
                      <span className="font-semibold text-base text-gray-900 flex-1 min-w-0">
                        {fermata.nome}
                      </span>
                      {fermata.distanza > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white flex-shrink-0">
                          {fermata.distanza}mt
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
                      <span className="text-sm text-gray-500">{fermata.tipo}</span>
                    </div>
                    {(lineePerFermata[fermata.id]?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1 mb-1">
                        {lineePerFermata[fermata.id].map((linea) => {
                          const { base, color } = getBadgeStyle(linea.nome, linea.tipo);
                          return (
                            <span key={linea.nome} className={`${base} ${color}`}>
                              {badgeLabel(linea.nome)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-sm text-cyan-600 py-1.5">Vedi linee e orari</p>
                  </div>
                ))}
                </>
                )}
              </>
            )}

            {/* Vista 2 – Dettaglio linea (MooneyGo: linee → direzioni → orari, max 3 per direzione) */}
            {vista === 'linea' && (selectedFermata ?? fermataSelezionata) && (() => {
              const fermata = selectedFermata ?? fermataSelezionata!;
              const data = lineePerFermataSelezionata;
              const linee = data?.linee ?? [];
              return (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-cyan-600"
                      aria-label="Indietro"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-base font-medium text-cyan-600">
                      {isMetro(fermata.tipo) ? 'Fermata metro' : 'Fermata bus'}
                    </span>
                    {fermata.distanza > 0 && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white">
                        {fermata.distanza}mt
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {isMetro(fermata.tipo) ? (
                      <span className="flex-shrink-0 w-8 h-8 rounded bg-amber-400 text-amber-950 font-bold text-sm flex items-center justify-center">
                        M
                      </span>
                    ) : (
                      <span className="flex-shrink-0 w-8 h-8 rounded bg-orange-500 text-white flex items-center justify-center">
                        <Bus className="w-4 h-4" />
                      </span>
                    )}
                    <span className="font-semibold text-base text-gray-900">
                      {fermata.nome}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">{fermata.tipo}</div>
                  <div className="text-cyan-600 text-sm font-medium mb-3">Adesso</div>

                  {loadingLinee ? (
                    <div className="py-6 text-center text-gray-500">Caricamento linee...</div>
                  ) : linee.length === 0 ? (
                    <p className="py-4 text-sm text-gray-500">Nessuna linea disponibile per questa fermata.</p>
                  ) : (
                    <div className="space-y-4">
                      {linee.map((linea) => (
                        <div key={linea.nome} className="border-b border-gray-100 pb-3">
                          {linea.direzioni.map((dir, dirIdx) => (
                            <div key={`${linea.nome}-${dirIdx}`} className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="flex-shrink-0 w-8 h-8 rounded font-semibold text-sm flex items-center justify-center text-white"
                                  style={{ backgroundColor: linea.colore }}
                                >
                                  {linea.nome}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {linea.nome} {dir.nome}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {dir.orari.slice(0, 3).map((o, i) => (
                                  <button
                                    key={`${o.trip_id}-${i}`}
                                    type="button"
                                    className="px-3 py-1.5 border border-gray-300 rounded-full text-sm hover:bg-gray-100 transition-colors"
                                    onClick={() => handleOrarioClick(o.trip_id, o.orario, linea.nome, dir.nome)}
                                  >
                                    {o.orario}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${fermata.lat},${fermata.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block w-full py-3 bg-blue-500 text-white text-center rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Portami qui
                      </a>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Vista 3 – Dettaglio corsa */}
            {vista === 'corsa' &&
              corsaSelezionata &&
              lineaSelezionata &&
              selectedPercorso &&
              selectedFermataNome && (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="p-1.5 -ml-1 rounded-full hover:bg-gray-100 text-gray-600"
                      aria-label="Indietro"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="text-base text-gray-500">Dettaglio corsa</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="px-2 py-1 border border-orange-400 bg-orange-50 text-orange-800 text-xs font-medium rounded">
                      ATM
                    </span>
                    <span className="px-2 py-1 rounded bg-amber-400 text-amber-950 text-xs font-semibold border border-amber-600">
                      M {lineaSelezionata.nome}
                    </span>
                    <span className="text-sm text-gray-900">
                      per {lineaSelezionata.direzione.replace(/^per\s+/i, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-4 text-sm">
                    <span className="font-bold text-lg text-gray-900">
                      {corsaSelezionata.orario}
                    </span>
                    <span className="text-gray-700">
                      {selectedPercorso.fermate[0]?.nome ?? ''}
                    </span>
                    <span className="text-gray-400">—</span>
                    <span className="text-gray-500">30min</span>
                    <span className="text-gray-400">—</span>
                    <span className="font-bold text-lg text-gray-900">
                      {dettaglioCorsaOrari.length > 0
                        ? dettaglioCorsaOrari[dettaglioCorsaOrari.length - 1].arrivo
                        : corsaSelezionata.orario}
                    </span>
                    <span className="text-gray-700">
                      {selectedPercorso.fermate[selectedPercorso.fermate.length - 1]
                        ?.nome ?? ''}
                    </span>
                  </div>
                  <div
                    className="relative pl-6 border-l-4 space-y-4"
                    style={{ borderColor: selectedPercorso.colore }}
                  >
                    {selectedPercorso.fermate.map((f, idx) => {
                      const orariGtfs = f.arrivo != null && f.partenza != null;
                      const orari = orariGtfs
                        ? { arrivo: f.arrivo!, partenza: f.partenza! }
                        : dettaglioCorsaOrari[idx];
                      const isSelected =
                        selectedFermataNome
                          .toLowerCase()
                          .includes(f.nome.toLowerCase()) ||
                        f.nome
                          .toLowerCase()
                          .includes(
                            selectedFermataNome.replace(/milano,?\s*/gi, '').trim().toLowerCase()
                          );
                      return (
                        <div key={idx} className="flex gap-3">
                          <div
                            className={`flex-shrink-0 w-3 h-3 rounded-full border-2 -ml-[1.125rem] mt-1.5 ${
                              isSelected ? 'bg-opacity-100' : 'bg-white'
                            }`}
                            style={{ borderColor: selectedPercorso.colore, backgroundColor: isSelected ? selectedPercorso.colore : undefined }}
                          />
                          <div className="flex-1 min-w-0">
                            {isSelected && (
                              <div className="mb-1 px-2 py-0.5 rounded bg-cyan-500 text-white text-xs font-medium inline-block">
                                FERMATA SELEZIONATA
                              </div>
                            )}
                            <div className="font-semibold text-gray-900">{f.nome}</div>
                            {orari && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                Arrivo: {orari.arrivo} — Partenza: {orari.partenza}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
          </div>
        )}
      </div>

      {/* Popup dettaglio fermata */}
      {popupFermata && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setPopupFermata(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="popup-fermata-nome"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="popup-fermata-nome" className="font-semibold text-gray-900 text-lg">
              {popupFermata.nome}
            </p>
            <p className="text-gray-500 mt-2">Dettagli in arrivo.</p>
            <button
              type="button"
              onClick={() => setPopupFermata(null)}
              className="mt-4 w-full py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fermate;