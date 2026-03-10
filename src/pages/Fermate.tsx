// src/pages/Fermate.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronDown, ArrowLeft, MapPin, LocateFixed, Heart, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYmx1ZXgiLCJhIjoiY21tZGpxM2d4MDNsYjJxczc1enhiODRwZiJ9.Trj9Jg8cpsKLKNZun7Z23Q";

const MapNative = globalThis.Map;

type Vista = 'fermate' | 'linea' | 'corsa';

export interface Fermata {
  id: string;
  nome: string;
  tipo: string;
  lat: number;
  lng: number;
  distanza: number;
  linee: LineaPassaggio[];
  route_type?: number;
  stopIds: string[];
}

export interface LineaPassaggio {
  numero: string;
  direzione: string;
  orario: string;
  percorsoId: string;
  route_type?: number;
}

export interface Percorso {
  id: string;
  nome: string;
  colore: string;
  fermate: { nome: string; lat: number; lng: number; arrivo?: string; partenza?: string }[];
}

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

function calcolaDistanza(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function deduciTipoMezzo(nome: string | null): string {
  if (!nome) return 'Bus';
  const upper = nome.toUpperCase();
  if (/M[1-5]/.test(upper)) return 'Metropolitana';
  if (upper.includes('TRAM')) return 'Tram';
  if (upper.includes('BUS')) return 'Bus';
  if (upper.includes('TRENO') || upper.includes('STAZIONE') || upper.includes('FS')) return 'Treno';
  return 'Bus';
}

function colorePerRouteType(routeType: number | null | undefined): string {
  if (routeType === 0) return '#00a651';
  if (routeType === 1) return '#f9b718';
  if (routeType === 2) return '#0066ad';
  if (routeType === 3) return '#e85b21';
  return '#6b7280';
}

/** Normalizza orario GTFS (es. 25:30 → 01:30). Restituisce { display, minuti, isDomani } */
function parseOrarioGtfs(t: string | null): { display: string; minuti: number; isDomani: boolean } | null {
  if (!t) return null;
  const parts = t.trim().split(':');
  let h = parseInt(parts[0], 10);
  const m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
  if (isNaN(h) || isNaN(m)) return null;
  const isDomani = h >= 24;
  const minuti = h * 60 + m; // keep raw for sorting
  if (h >= 24) h -= 24;
  return { display: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`, minuti, isDomani };
}

function normalizzaOrario(t: string | null): string {
  const p = parseOrarioGtfs(t);
  return p?.display ?? '';
}

function displayNomeLinea(nome: string, routeType: number | null | undefined): string {
  let n = nome.trim();
  n = n.replace(/^N/i, '').trim() || n;
  if (routeType === 1 && /^\d+$/.test(n)) {
    n = `M${n}`;
  }
  return n;
}

function getBadgeStyle(displayName: string, routeType: number | null | undefined): { base: string; color: string } {
  const n = displayName.trim().toUpperCase();
  const square = 'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold';
  const rect = 'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold min-h-[2rem]';
  const circle = 'inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold';
  if (n === 'M1') return { base: square, color: 'bg-red-600 text-white' };
  if (n === 'M2') return { base: square, color: 'bg-green-600 text-white' };
  if (n === 'M3') return { base: square, color: 'bg-yellow-400 text-black' };
  if (n === 'M4') return { base: square, color: 'bg-blue-600 text-white' };
  if (n === 'M5') return { base: square, color: 'bg-purple-600 text-white' };
  if (routeType === 0) return { base: circle, color: 'bg-green-600 text-black' };
  if (routeType === 3 || /^[\d\/\-\.]+$/.test(n)) return { base: rect, color: 'bg-orange-500 text-black' };
  return { base: circle, color: 'bg-gray-500 text-white' };
}

/** Colore esadecimale per badge metro (per vista 3) */
function getLineColor(displayName: string, routeType: number | null | undefined): string {
  const n = displayName.trim().toUpperCase();
  if (n === 'M1') return '#dc2626';
  if (n === 'M2') return '#16a34a';
  if (n === 'M3') return '#facc15';
  if (n === 'M4') return '#2563eb';
  if (n === 'M5') return '#9333ea';
  if (routeType === 0) return '#16a34a';
  if (routeType === 3) return '#f97316';
  return '#6b7280';
}

type MarkerStyleType = 'metro' | 'bus' | 'tram' | 'treno' | 'other';

const METRO_PRIORITY: Record<string, { bgClass: string; textClass: string }> = {
  M1: { bgClass: 'bg-red-600', textClass: 'text-white' },
  M2: { bgClass: 'bg-green-600', textClass: 'text-white' },
  M3: { bgClass: 'bg-yellow-400', textClass: 'text-black' },
  M4: { bgClass: 'bg-blue-600', textClass: 'text-white' },
  M5: { bgClass: 'bg-purple-600', textClass: 'text-white' },
};

function getMarkerStyle(
  fermata: { id: string; nome: string; tipo: string },
  lineePerFermata: Record<string, { nome: string; tipo: number }[]>
): { markerType: MarkerStyleType; bgClass: string; textClass: string; label: string; metroLines?: string[] } {
  const linee = lineePerFermata[fermata.id] ?? [];
  const metroLinee = linee.filter((l) => l.tipo === 1);
  if (metroLinee.length > 0) {
    const sorted = metroLinee
      .map((ml) => displayNomeLinea(ml.nome, 1).toUpperCase())
      .filter((dn) => dn in METRO_PRIORITY)
      .sort();
    const unique = [...new Set(sorted)];
    const best = unique[0];
    if (best && METRO_PRIORITY[best]) {
      return { markerType: 'metro', ...METRO_PRIORITY[best], label: 'M', metroLines: unique };
    }
    return { markerType: 'metro', bgClass: 'bg-amber-500', textClass: 'text-black', label: 'M', metroLines: unique };
  }
  if (linee.some((l) => l.tipo === 3))
    return { markerType: 'bus', bgClass: 'bg-orange-500', textClass: 'text-black', label: 'BUS' };
  if (linee.some((l) => l.tipo === 0))
    return { markerType: 'tram', bgClass: 'bg-green-100', textClass: '', label: '🚊' };
  if (linee.some((l) => l.tipo === 2))
    return { markerType: 'treno', bgClass: 'bg-blue-600', textClass: 'text-white', label: 'T' };
  return { markerType: 'other', bgClass: 'bg-gray-100', textClass: '', label: '🚌' };
}

/** Estrae il nome base di una fermata rimuovendo suffissi metro (es. "zara m3 m5" → "zara") */
function estraiNomeBase(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+m[1-5](\s+m[1-5])*/gi, '').trim();
}

function aggiungiMinuti(orario: string, deltaMinuti: number): string {
  const [h, m] = orario.split(':').map(Number);
  let total = h * 60 + m + deltaMinuti;
  if (total < 0) total += 24 * 60;
  total = total % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
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
    route_type?: number;
  } | null>(null);
  const [fermataSelezionata, setFermataSelezionata] = useState<Fermata | null>(null);
  const [corsaSelezionata, setCorsaSelezionata] = useState<{
    linea: string;
    direzione: string;
    orario: string;
    route_type?: number;
  } | null>(null);

  const [selectedPercorso, setSelectedPercorso] = useState<Percorso | null>(null);
  const [selectedFermataNome, setSelectedFermataNome] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const [searchCenter, setSearchCenter] = useState({ lat: 45.4642, lng: 9.19 });
  const [fermate, setFermate] = useState<Fermata[]>([]);
  const [loadingFermate, setLoadingFermate] = useState(false);
  const [popupFermata, setPopupFermata] = useState<Fermata | null>(null);
  const [lineeCache, setLineeCache] = useState<Record<string, LineePerFermata>>({});
  const [loadingLinee, setLoadingLinee] = useState(false);
  const [lineePerFermataSelezionata, setLineePerFermataSelezionata] = useState<LineePerFermata | null>(null);
  const [lineePerFermata, setLineePerFermata] = useState<Record<string, { nome: string; tipo: number }[]>>({});

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { latitude, longitude, requestPosition, loading: geoLoading } = useGeolocation();

  // Geocoder search via Mapbox
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&country=it&proximity=9.19,45.46&limit=5&language=it`
        );
        const data = await res.json();
        if (data.features) {
          setSearchResults(data.features.map((f: any) => ({ place_name: f.place_name, center: f.center })));
          setShowSearchResults(true);
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }, 300);
  }, []);

  const handleSearchSelect = (result: { place_name: string; center: [number, number] }) => {
    const [lng, lat] = result.center;
    setSearchCenter({ lat, lng });
    setSearchQuery(result.place_name.split(',')[0]);
    setShowSearchResults(false);
    caricaFermateVicine(lat, lng);
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    map?.flyTo?.({ center: [lng, lat], zoom: 16, duration: 800 });
  };

  const caricaFermateVicine = async (lat: number, lng: number, raggioM: number = 2000) => {
    setLoadingFermate(true);
    const delta = raggioM / 111320;
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

      // Fetch lines for all stop_ids
      const allStopIds = conDistanza.map((f) => f.stop_id);
      const byStopId = new MapNative<string, { nome: string; tipo: number }[]>();
      if (allStopIds.length > 0) {
        const { data: lineeData, error: errLinee } = await supabase
          .from('fermate_linee_lookup')
          .select('stop_id, route_short_name, route_type')
          .in('stop_id', allStopIds);
        if (!errLinee && lineeData?.length) {
          for (const row of lineeData) {
            const nome = row.route_short_name?.trim();
            if (!nome) continue;
            const tipo = row.route_type ?? 3;
            if (!byStopId.has(row.stop_id)) byStopId.set(row.stop_id, []);
            const arr = byStopId.get(row.stop_id)!;
            if (!arr.some((l) => l.nome === nome)) arr.push({ nome, tipo });
          }
        }
      }

      // Group stops by base name → one unified Fermata per group
      const gruppi = new MapNative<string, {
        stops: typeof conDistanza;
        linee: { nome: string; tipo: number }[];
      }>();
      for (const f of conDistanza) {
        const baseKey = estraiNomeBase(f.stop_name!);
        if (!gruppi.has(baseKey)) gruppi.set(baseKey, { stops: [], linee: [] });
        const g = gruppi.get(baseKey)!;
        g.stops.push(f);
        const stopLinee = byStopId.get(f.stop_id) ?? [];
        for (const l of stopLinee) {
          if (!g.linee.some(m => m.nome === l.nome)) g.linee.push(l);
        }
      }

      // Build unified fermate array
      const fermateUnificate: Fermata[] = [];
      const lineePerFermataNew: Record<string, { nome: string; tipo: number }[]> = {};
      gruppi.forEach((g) => {
        // Pick representative stop: the one with the most lines, or closest
        const rep = g.stops.reduce((best, s) => {
          const bestLines = (byStopId.get(best.stop_id) ?? []).length;
          const sLines = (byStopId.get(s.stop_id) ?? []).length;
          return sLines > bestLines ? s : best;
        }, g.stops[0]);
        const stopIds = g.stops.map(s => s.stop_id);
        const id = stopIds.join('|');
        const fermata: Fermata = {
          id,
          nome: rep.stop_name!,
          lat: rep.stop_lat!,
          lng: rep.stop_lon!,
          tipo: deduciTipoMezzo(rep.stop_name),
          distanza: rep.distanza,
          linee: [],
          stopIds,
        };
        fermateUnificate.push(fermata);
        lineePerFermataNew[id] = g.linee;
      });

      // Sort by distance
      fermateUnificate.sort((a, b) => a.distanza - b.distanza);
      setFermate(fermateUnificate);
      setLineePerFermata(lineePerFermataNew);
    } else {
      setLineePerFermata({});
    }
    setLoadingFermate(false);
  };

  /** Carica linee e prossimi orari per una fermata usando RPC ottimizzata.
   *  Cerca TUTTI gli stop_id con lo stesso stop_name per aggregare metro+bus. */
  const caricaLineePerFermata = async (fermata: Fermata): Promise<LineePerFermata> => {
    const empty: LineePerFermata = { linee: [] };
    const now = new Date();
    const nowMinuti = now.getHours() * 60 + now.getMinutes();

    const siblingIds = fermata.stopIds;

    console.log('[Fermate] Chiamata RPC prossimi_arrivi_multi per stops', siblingIds);
    const { data, error } = await (supabase as any).rpc('prossimi_arrivi_multi', {
      _stop_ids: siblingIds,
      _ora_corrente: '00:00',
    });

    if (error) {
      console.error('[Fermate] RPC prossimi_arrivi errore:', error);
      return empty;
    }
    if (!data?.length) {
      console.log('[Fermate] RPC prossimi_arrivi: nessun dato');
      return empty;
    }

    console.log('[Fermate] RPC prossimi_arrivi: righe ricevute:', data.length);

    // Group by route+direction
    type Acc = { routeType: number; items: { orario: string; trip_id: string; minuti: number; isDomani: boolean }[] };
    const byKey = new MapNative<string, Acc>();

    for (const row of data) {
      const nome = row.route_short_name?.trim() ?? '';
      const headsign = row.trip_headsign?.trim() ?? '';
      const key = `${nome}|${headsign}`;
      const parsed = parseOrarioGtfs(row.arrival_time);
      if (!parsed) continue;

      if (!byKey.has(key)) {
        byKey.set(key, { routeType: row.route_type ?? 3, items: [] });
      }
      const acc = byKey.get(key)!;
      // Deduplicate same display time
      if (!acc.items.some(i => i.orario === parsed.display)) {
        acc.items.push({ orario: parsed.display, trip_id: row.trip_id, minuti: parsed.minuti, isDomani: parsed.isDomani });
      }
    }

    // For each direction, filter to show future times first, then tomorrow's
    const filterFutureOrari = (items: Acc['items']): OrarioConTrip[] => {
      // Sort all items by raw minuti first
      const sorted = [...items].sort((a, b) => a.minuti - b.minuti);
      // Split into "today future" and "tomorrow/past"
      const future = sorted.filter(i => !i.isDomani && i.minuti >= nowMinuti);
      // Tomorrow = isDomani items (24:xx+) sorted by minuti, then past-today items
      const domani = sorted.filter(i => i.isDomani).sort((a, b) => a.minuti - b.minuti);
      const passati = sorted.filter(i => !i.isDomani && i.minuti < nowMinuti);
      const tomorrow = [...domani, ...passati];
      // Take first 5 future, or if none, first 5 tomorrow
      const selected = future.length > 0 ? future.slice(0, 5) : tomorrow.slice(0, 5);
      return selected.map(i => ({ orario: i.orario, trip_id: i.trip_id }));
    };

    // Group directions under same route
    const byRoute = new MapNative<string, LineaConDirezioni>();
    byKey.forEach((acc, key) => {
      const [nome, headsign] = key.split('|');
      const routeKey = nome;
      const colore = colorePerRouteType(acc.routeType);
      if (!byRoute.has(routeKey)) {
        byRoute.set(routeKey, {
          nome,
          colore,
          route_type: acc.routeType,
          direzioni: [],
        });
      }
      const linea = byRoute.get(routeKey)!;
      const orari = filterFutureOrari(acc.items);
      linea.direzioni.push({
        nome: headsign ? `per ${headsign}` : '',
        orari,
      });
    });

    const result = { linee: Array.from(byRoute.values()) };
    console.log('[Fermate] Linee caricate:', result.linee.length, 'linee,', result.linee.map(l => `${l.nome}(${l.direzioni.length} dir)`).join(', '));
    return result;
  };

  /** Carica percorso completo di una corsa (vista 3) */
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
    const dn = displayNomeLinea(nomeRoute, route?.route_type);
    const headsign = trip.trip_headsign ?? '';
    return {
      id: tripId,
      nome: `${dn} per ${headsign}`,
      colore: getLineColor(dn, route?.route_type),
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

  const handleOrarioClick = async (tripId: string, orario: string, lineaNome: string, direzione: string, routeType?: number) => {
    setLineaSelezionata({ nome: lineaNome, direzione, percorsoId: tripId, route_type: routeType });
    setCorsaSelezionata({ linea: lineaNome, direzione, orario, route_type: routeType });
    setSelectedFermataNome(selectedFermata?.nome ?? fermataSelezionata?.nome ?? null);
    setVista('corsa');
    const percorso = await caricaPercorsoCorsa(tripId);
    if (percorso) setSelectedPercorso(percorso);
  };

  const handleMarkerClick = (f: Fermata) => {
    setSelectedFermata(f);
    setFermataSelezionata(f);
    setLineaSelezionata(null);
    setVista('linea');
    if (lineeCache[f.id]) {
      setLineePerFermataSelezionata(lineeCache[f.id]);
    } else {
      setLoadingLinee(true);
      setLineePerFermataSelezionata(null);
      caricaLineePerFermata(f).then((data) => {
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
    setSearchCenter({ lat: center.lat, lng: center.lng });
    caricaFermateVicine(center.lat, center.lng);
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

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top bar: logo + search */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 z-20 relative">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Heart className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-gray-900 hidden sm:inline">
            MILANO <span className="text-red-500">HELP</span>
          </span>
        </Link>
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            placeholder="Cerca via o indirizzo..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400"
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  onClick={() => handleSearchSelect(r)}
                >
                  <MapPin className="w-3.5 h-3.5 text-gray-400 inline mr-1.5" />
                  {r.place_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0"
          aria-label="Vai alla mia posizione"
        >
          <LocateFixed className="h-4.5 w-4.5 text-gray-600" />
        </button>
      </div>

      {/* Close search results on outside click */}
      {showSearchResults && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSearchResults(false)} />
      )}

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
          <Marker
            longitude={searchCenter.lng}
            latitude={searchCenter.lat}
            anchor="center"
            draggable
            onDragEnd={(e) => {
              const { lat, lng } = e.lngLat;
              setSearchCenter({ lat, lng });
              caricaFermateVicine(lat, lng);
            }}
          >
            <div
              className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing"
              title="Trascina per cambiare zona"
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
                {style.markerType === 'metro' && style.metroLines && style.metroLines.length > 1 ? (
                  <div
                    className="flex gap-0.5 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleMarkerClick(f); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMarkerClick(f); } }}
                    aria-label={`Fermata ${f.nome}`}
                  >
                    {style.metroLines.map(ml => {
                      const mp = METRO_PRIORITY[ml];
                      return (
                        <div key={ml} className={`w-5 h-5 rounded-sm text-[9px] font-bold flex items-center justify-center shadow-md border border-gray-300 ${mp?.bgClass ?? 'bg-amber-500'} ${mp?.textClass ?? 'text-black'}`}>
                          {ml}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`${baseClasses} ${markerClasses}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleMarkerClick(f); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMarkerClick(f); } }}
                    aria-label={`Fermata ${f.nome}`}
                  >
                    {style.label}
                  </div>
                )}
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
                    selectedPercorso?.colore ?? '#3b82f6',
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* Bottom sheet */}
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
          <div className="overflow-y-auto flex-1 min-h-0 px-3 sm:px-4 pb-6 bg-white">
            {/* Vista 1 – Lista fermate */}
            {vista === 'fermate' && (
              <>
                <div className="mb-3 text-sm text-gray-500">Fermate vicine</div>
                {loadingFermate ? (
                  <div className="py-8 text-center text-gray-500">Caricamento fermate...</div>
                ) : (
                <>
                {fermate.map((fermata) => (
                  <div
                    key={fermata.id}
                    className="mb-2 pb-2 border-b border-gray-100 last:border-0"
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-1 px-1 py-1.5 rounded active:bg-gray-100"
                      onClick={() => handleMarkerClick(fermata)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleMarkerClick(fermata);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="font-semibold text-sm sm:text-base text-gray-900 flex-1 min-w-0">
                        {fermata.nome}
                      </span>
                      {fermata.distanza > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-teal-500 text-white flex-shrink-0">
                          {fermata.distanza}mt
                        </span>
                      )}
                    </div>
                    {(lineePerFermata[fermata.id]?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5 mb-0.5">
                        {lineePerFermata[fermata.id].map((linea) => {
                          const dn = displayNomeLinea(linea.nome, linea.tipo);
                          const { base, color } = getBadgeStyle(dn, linea.tipo);
                          return (
                            <span key={linea.nome} className={`${base} ${color} !w-7 !h-7 !text-[10px] sm:!w-8 sm:!h-8 sm:!text-xs`}>
                              {dn}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-cyan-600 py-1">Vedi linee e orari</p>
                  </div>
                ))}
                </>
                )}
              </>
            )}

            {/* Vista 2 – Dettaglio fermata con orari per linea e direzione */}
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
                      Fermata
                    </span>
                    {fermata.distanza > 0 && (
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white">
                        {fermata.distanza}mt
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-lg text-gray-900">
                      {fermata.nome}
                    </span>
                  </div>
                  {/* Badge linee */}
                  {(lineePerFermata[fermata.id]?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {lineePerFermata[fermata.id].map((linea) => {
                        const dn = displayNomeLinea(linea.nome, linea.tipo);
                        const { base, color } = getBadgeStyle(dn, linea.tipo);
                        return (
                          <span key={linea.nome} className={`${base} ${color}`}>
                            {dn}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-cyan-600 text-sm font-medium mb-3">Prossimi orari</div>

                  {loadingLinee ? (
                    <div className="py-6 text-center text-gray-500">Caricamento orari...</div>
                  ) : linee.length === 0 ? (
                    <p className="py-4 text-sm text-gray-500">Nessun orario disponibile per questa fermata.</p>
                  ) : (
                    <div className="space-y-4">
                      {linee.map((linea) => {
                        const dn = displayNomeLinea(linea.nome, linea.route_type ?? null);
                        const { base, color } = getBadgeStyle(dn, linea.route_type ?? null);
                        return (
                        <div key={linea.nome} className="border-b border-gray-100 pb-3">
                          {linea.direzioni.map((dir, dirIdx) => (
                            <div key={`${linea.nome}-${dirIdx}`} className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`flex-shrink-0 ${base} ${color}`}>
                                  {dn}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {dir.nome || dn}
                                </span>
                              </div>
                              {dir.orari.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                  {dir.orari.map((o, i) => (
                                    <button
                                      key={`${o.trip_id}-${i}`}
                                      type="button"
                                      className="px-3 py-2 min-w-[3.5rem] min-h-[2.5rem] border border-gray-300 rounded-full text-sm font-medium hover:bg-cyan-50 hover:border-cyan-400 active:bg-cyan-100 transition-colors"
                                      onClick={() => handleOrarioClick(o.trip_id, o.orario, linea.nome, dir.nome, linea.route_type)}
                                    >
                                      {o.orario}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400">Nessun orario disponibile</p>
                              )}
                            </div>
                          ))}
                        </div>
                        );
                      })}
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
              selectedFermataNome && (() => {
                const dn = displayNomeLinea(corsaSelezionata.linea, corsaSelezionata.route_type);
                const { base, color } = getBadgeStyle(dn, corsaSelezionata.route_type);
                const lineColor = selectedPercorso.colore;
                return (
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
                    <span className={`${base} ${color}`}>
                      {dn}
                    </span>
                    <span className="text-sm text-gray-900">
                      {corsaSelezionata.direzione.replace(/^per\s+/i, 'per ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-4 text-sm">
                    <span className="font-bold text-lg text-gray-900">
                      {selectedPercorso.fermate[0]?.arrivo ?? corsaSelezionata.orario}
                    </span>
                    <span className="text-gray-700">
                      {selectedPercorso.fermate[0]?.nome ?? ''}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold text-lg text-gray-900">
                      {selectedPercorso.fermate[selectedPercorso.fermate.length - 1]?.arrivo ?? ''}
                    </span>
                    <span className="text-gray-700">
                      {selectedPercorso.fermate[selectedPercorso.fermate.length - 1]?.nome ?? ''}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {selectedPercorso.fermate.length} fermate
                  </div>
                  <div
                    className="relative pl-6 border-l-4 space-y-3"
                    style={{ borderColor: lineColor }}
                  >
                    {selectedPercorso.fermate.map((f, idx) => {
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
                              isSelected ? '' : 'bg-white'
                            }`}
                            style={{ borderColor: lineColor, backgroundColor: isSelected ? lineColor : undefined }}
                          />
                          <div className="flex-1 min-w-0">
                            {isSelected && (
                              <div className="mb-1 px-2 py-0.5 rounded text-white text-xs font-medium inline-block" style={{ backgroundColor: lineColor }}>
                                LA TUA FERMATA
                              </div>
                            )}
                            <div className={`font-semibold text-gray-900 ${isSelected ? 'text-base' : 'text-sm'}`}>{f.nome}</div>
                            {(f.arrivo || f.partenza) && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {f.arrivo && <span>Arr. {f.arrivo}</span>}
                                {f.arrivo && f.partenza && f.arrivo !== f.partenza && <span> — Part. {f.partenza}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
                );
              })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Fermate;
