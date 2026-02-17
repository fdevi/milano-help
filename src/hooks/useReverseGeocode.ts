import { useState, useCallback } from "react";

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
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { "Accept-Language": "it" } }
      );
      const data = await response.json();
      const addr = data.address || {};

      const result: ReverseGeocodeResult = {};

      if (addr.quarter || addr.neighbourhood || addr.suburb) {
        result.quartiere = addr.quarter || addr.neighbourhood || addr.suburb;
      }
      if (addr.city || addr.town || addr.village) {
        result.citta = addr.city || addr.town || addr.village;
      }
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