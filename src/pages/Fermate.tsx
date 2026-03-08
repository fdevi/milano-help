// src/pages/Fermate.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronDown, Bus, ArrowLeft, MapPin, LocateFixed } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fermate, percorsi, Fermata, LineaPassaggio, Percorso } from '@/lib/datiMooneyGo';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYmx1ZXgiLCJhIjoiY21tZGpxM2d4MDNsYjJxczc1enhiODRwZiJ9.Trj9Jg8cpsKLKNZun7Z23Q";

type Vista = 'fermate' | 'linea' | 'corsa';

/** Emoji per tipo fermata */
function emojiForTipo(tipo: string): string {
  if (tipo.includes('Metropolitana')) return '🚇';
  if (tipo.toLowerCase().includes('bus')) return '🚌';
  if (tipo.toLowerCase().includes('tram')) return '🚊';
  return '🚆';
}

function isMetro(tipo: string): boolean {
  return tipo.includes('Metropolitana');
}

function isMetroLine(numero: string): boolean {
  return /^M\d*$/.test(numero.trim());
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

  const { latitude, longitude, requestPosition, loading: geoLoading } = useGeolocation();

  const handleGeolocate = () => {
    requestPosition();
  };

  useEffect(() => {
    if (latitude != null && longitude != null && mapRef.current) {
      const map = mapRef.current?.getMap?.() ?? mapRef.current;
      map?.flyTo?.({ center: [longitude, latitude], zoom: 16 });
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (map) {
      map.flyTo?.({ center: [9.182, 45.506], zoom: 14 });
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

  const handleLineaClick = (linea: LineaPassaggio, fermata: Fermata) => {
    setSelectedFermata(fermata);
    setFermataSelezionata(fermata);
    setLineaSelezionata({
      nome: linea.numero,
      direzione: linea.direzione,
      percorsoId: linea.percorsoId,
    });
    setVista('linea');
  };

  const handleCorsaClick = (orario: string) => {
    if (!lineaSelezionata) return;
    setCorsaSelezionata({
      linea: lineaSelezionata.nome,
      direzione: lineaSelezionata.direzione,
      orario,
    });
    setVista('corsa');
    const percorso = percorsi[lineaSelezionata.percorsoId];
    if (percorso) {
      setSelectedPercorso(percorso);
      setSelectedFermataNome(fermataSelezionata?.nome ?? null);
    }
  };

  /** Click su un orario in vista linea (quando si è arrivati dalla mappa: più linee/direzioni) */
  const handleOrarioClick = (linea: LineaPassaggio, fermata: Fermata, orario: string) => {
    setLineaSelezionata({
      nome: linea.numero,
      direzione: linea.direzione,
      percorsoId: linea.percorsoId,
    });
    setCorsaSelezionata({
      linea: linea.numero,
      direzione: linea.direzione,
      orario,
    });
    setFermataSelezionata(fermata);
    setVista('corsa');
    const percorso = percorsi[linea.percorsoId];
    if (percorso) {
      setSelectedPercorso(percorso);
      setSelectedFermataNome(fermata.nome);
    }
  };

  const handleMarkerClick = (f: Fermata) => {
    setSelectedFermata(f);
    setFermataSelezionata(f);
    setLineaSelezionata(null);
    setVista('linea');
    const map = mapRef.current?.getMap?.() ?? mapRef.current;
    if (map?.flyTo) {
      map.flyTo({ center: [f.lng, f.lat], zoom: 16, duration: 500 });
    }
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

  const orariCorse = useMemo(() => generaOrari(), []);

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
            longitude: 9.182,
            latitude: 45.506,
            zoom: 14,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          <NavigationControl position="top-right" />
          {fermate.map((f) => (
            <Marker key={f.id} longitude={f.lng} latitude={f.lat} anchor="center">
              <div
                className="bg-white rounded-full p-1 shadow-md border border-gray-300 text-lg leading-none cursor-pointer hover:ring-2 hover:ring-cyan-500 transition-shadow"
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
                {emojiForTipo(f.tipo)}
              </div>
            </Marker>
          ))}
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
                {fermate.map((fermata) => (
                  <div
                    key={fermata.id}
                    className="mb-4 pb-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {isMetro(fermata.tipo) ? (
                        <span className="flex-shrink-0 w-8 h-8 rounded bg-amber-400 text-amber-950 font-bold text-sm flex items-center justify-center">
                          {fermata.linee[0]?.numero ?? 'M'}
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
                    <div className="flex items-center gap-2 flex-wrap mt-0.5 mb-1">
                      <span className="text-sm text-gray-500">{fermata.tipo}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white">
                        {fermata.distanza}mt
                      </span>
                    </div>
                    {fermata.linee.map((linea, idx) => (
                      <div
                        key={`${fermata.id}-${linea.percorsoId}-${idx}`}
                        className="flex items-center gap-2 py-1.5 px-1 -mx-1 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleLineaClick(linea, fermata)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleLineaClick(linea, fermata);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {isMetroLine(linea.numero) ? (
                          <span className="flex-shrink-0 w-7 h-7 rounded bg-amber-400 text-amber-950 font-semibold text-xs flex items-center justify-center">
                            {linea.numero}
                          </span>
                        ) : (
                          <span className="flex-shrink-0 w-7 h-7 rounded bg-orange-500 text-white font-semibold text-xs flex items-center justify-center">
                            {linea.numero}
                          </span>
                        )}
                        <span className="flex-1 min-w-0 text-sm text-gray-900">
                          {linea.numero} {linea.direzione}
                        </span>
                        <span className="flex-shrink-0 text-sm text-gray-600">
                          {linea.orario}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {/* Vista 2 – Dettaglio linea (da lista: una linea; da mappa: tutte le linee con orari multipli) */}
            {vista === 'linea' && (selectedFermata ?? fermataSelezionata) && (() => {
              const fermata = selectedFermata ?? fermataSelezionata!;
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
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-500 text-white">
                      {fermata.distanza}mt
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {isMetro(fermata.tipo) ? (
                      <span className="flex-shrink-0 w-8 h-8 rounded bg-red-500 text-white font-bold text-sm flex items-center justify-center">
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

                  {/* Da lista: una sola linea con 8 corse in righe */}
                  {lineaSelezionata && (
                    <>
                      <div className="space-y-0 border-t border-gray-100">
                        {orariCorse.map((corsa, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleCorsaClick(corsa.orario)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCorsaClick(corsa.orario);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <span className="flex-shrink-0 w-8 h-8 rounded bg-amber-400 text-amber-950 font-semibold text-xs flex items-center justify-center">
                              {lineaSelezionata.nome}
                            </span>
                            <span className="flex-1 text-sm text-gray-900">
                              {lineaSelezionata.nome} {lineaSelezionata.direzione}
                            </span>
                            <span className="text-base font-semibold text-gray-900">
                              {corsa.orario}
                            </span>
                          </div>
                        ))}
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${fermata.lat},${fermata.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block w-full py-3 bg-blue-500 text-white text-center rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Portami qui
                      </a>
                    </>
                  )}

                  {/* Da mappa: tutte le linee con orari multipli per direzione */}
                  {!lineaSelezionata && (
                    <div className="space-y-4">
                      {fermata.linee.map((linea, idx) => {
                        const orari = generaOrariPerDirezione(linea.orario, 4);
                        return (
                          <div key={`${linea.percorsoId}-${idx}`} className="border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2 mb-2">
                              {isMetroLine(linea.numero) ? (
                                <span className="flex-shrink-0 w-8 h-8 rounded bg-amber-400 text-amber-950 font-semibold text-xs flex items-center justify-center">
                                  {linea.numero}
                                </span>
                              ) : (
                                <span className="flex-shrink-0 w-8 h-8 rounded bg-orange-500 text-white font-semibold text-xs flex items-center justify-center">
                                  {linea.numero}
                                </span>
                              )}
                              <span className="text-sm font-semibold text-gray-900">
                                {linea.numero} {linea.direzione}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {orari.map((orario, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="px-3 py-1.5 border border-gray-300 rounded-full text-sm hover:bg-gray-100 transition-colors"
                                  onClick={() => handleOrarioClick(linea, fermata, orario)}
                                >
                                  {orario}
                                </button>
                              ))}
                            </div>
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
                  <div className="relative pl-6 border-l-4 border-amber-400 space-y-4">
                    {selectedPercorso.fermate.map((f, idx) => {
                      const orari = dettaglioCorsaOrari[idx];
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
                            className={`flex-shrink-0 w-3 h-3 rounded-full border-2 border-amber-500 -ml-[1.125rem] mt-1.5 ${
                              isSelected ? 'bg-amber-400' : 'bg-white'
                            }`}
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
    </div>
  );
};

export default Fermate;
