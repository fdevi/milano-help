import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Locate, Loader2 } from "lucide-react";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYmx1ZXgiLCJhIjoiY21tZGpxM2d4MDNsYjJxczc1enhiODRwZiJ9.Trj9Jg8cpsKLKNZun7Z23Q";

interface MapboxLocationPickerProps {
  initialLuogo?: string;
  initialLat?: number | null;
  initialLon?: number | null;
  onLocationChange: (data: { luogo: string; lat: number; lon: number }) => void;
}

interface SearchResult {
  place_name: string;
  center: [number, number];
}

const MapboxLocationPicker = ({
  initialLuogo = "",
  initialLat,
  initialLon,
  onLocationChange,
}: MapboxLocationPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [query, setQuery] = useState(initialLuogo);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialLuogo);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const defaultCenter: [number, number] = [
    initialLon ?? 9.19,
    initialLat ?? 45.464,
  ];

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: defaultCenter,
      zoom: initialLat ? 15 : 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Create draggable marker
    marker.current = new mapboxgl.Marker({
      color: "#0d9488",
      draggable: true,
    })
      .setLngLat(defaultCenter)
      .addTo(map.current);

    // On marker drag end, reverse geocode
    marker.current.on("dragend", () => {
      const lngLat = marker.current!.getLngLat();
      reverseGeocode(lngLat.lng, lngLat.lat);
    });

    // On map click, move marker
    map.current.on("click", (e) => {
      marker.current?.setLngLat(e.lngLat);
      reverseGeocode(e.lngLat.lng, e.lngLat.lat);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=it&types=address,poi`
      );
      const data = await res.json();
      const placeName = data.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setSelectedAddress(placeName);
      setQuery(placeName);
      onLocationChange({ luogo: placeName, lat, lon: lng });
    } catch {
      onLocationChange({ luogo: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lon: lng });
    }
  };

  // Search with debounce
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&language=it&country=it&limit=5`
        );
        const data = await res.json();
        setResults(data.features || []);
        setShowResults(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }, []);

  const selectResult = (result: SearchResult) => {
    const [lng, lat] = result.center;
    setQuery(result.place_name);
    setSelectedAddress(result.place_name);
    setShowResults(false);
    setResults([]);

    marker.current?.setLngLat([lng, lat]);
    map.current?.flyTo({ center: [lng, lat], zoom: 16 });
    onLocationChange({ luogo: result.place_name, lat, lon: lng });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        marker.current?.setLngLat([longitude, latitude]);
        map.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        reverseGeocode(longitude, latitude);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="Cerca indirizzo..."
          className="pl-9 pr-10"
        />
        <button
          type="button"
          onClick={handleGeolocate}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
          title="Usa la mia posizione"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Locate className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Autocomplete results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-start gap-2"
                onMouseDown={() => selectResult(r)}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                <span>{r.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="w-full rounded-lg border overflow-hidden"
        style={{ height: 300 }}
      />

      {/* Selected address */}
      {selectedAddress && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          {selectedAddress}
        </p>
      )}
    </div>
  );
};

export default MapboxLocationPicker;
