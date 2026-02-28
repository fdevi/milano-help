import { useState, useCallback } from "react";
import { matchQuartiere } from "./useMatchQuartiere";

interface ReverseGeocodeResult {
  quartiere?: string;
  citta?: string;
  indirizzo?: string;
  civico?: string;
  cap?: string;
}

export const useReverseGeocode = (onResult: (data: ReverseGeocodeResult) => void) => {
  const [loading, setLoading] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "it" } }
      );
      const data = await response.json();
      const addr = data.address || {};

      const result: ReverseGeocodeResult = {};

      // Raccogli tutti i candidati possibili per il quartiere
      const rawQuartiere = addr.quarter || addr.neighbourhood || addr.suburb || "";
      const rawRoad = addr.road || "";
      const rawCity = addr.city || addr.town || addr.village || "";

      // Prova a matchare con la lista ufficiale dei micro-quartieri
      // Tenta prima il quartiere, poi la strada, poi combinazioni
      const matched =
        matchQuartiere(rawQuartiere) ||
        matchQuartiere(rawRoad) ||
        matchQuartiere(`${rawQuartiere} ${rawRoad}`) ||
        matchQuartiere(rawCity);

      if (matched) {
        result.quartiere = matched;
      } else if (rawQuartiere) {
        // Fallback: usa il valore grezzo dal geocoding
        result.quartiere = rawQuartiere;
      }

      if (rawCity) result.citta = rawCity;
      if (addr.road) result.indirizzo = addr.road;
      if (addr.house_number) result.civico = addr.house_number;
      if (addr.postcode) result.cap = addr.postcode;

      onResult(result);
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    } finally {
      setLoading(false);
    }
  }, [onResult]);

  return { reverseGeocode, loading };
};
