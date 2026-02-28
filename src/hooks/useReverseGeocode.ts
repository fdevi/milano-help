import { useState, useCallback } from "react";
import { matchQuartiere } from "./useMatchQuartiere";
import {
  findComuneByName,
  findComuneByCoords,
  getQuartieriByComune,
} from "./useQuartieri";

interface ReverseGeocodeResult {
  quartiere?: string;
  citta?: string;
  indirizzo?: string;
  civico?: string;
  cap?: string;
}

export const useReverseGeocode = (
  onResult: (data: ReverseGeocodeResult) => void
) => {
  const [loading, setLoading] = useState(false);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "it" } }
        );
        const data = await response.json();
        const addr = data.address || {};

        const result: ReverseGeocodeResult = {};

        const rawQuartiere =
          addr.quarter || addr.neighbourhood || addr.suburb || "";
        const rawRoad = addr.road || "";
        const rawCity =
          addr.city || addr.town || addr.village || addr.municipality || "";

        // Imposta città
        if (rawCity) result.citta = rawCity;
        if (addr.road) result.indirizzo = addr.road;
        if (addr.house_number) result.civico = addr.house_number;
        if (addr.postcode) result.cap = addr.postcode;

        // Strategia: trova il comune nel DB, poi cerca quartieri specifici
        let comuneFound = await findComuneByName(rawCity);

        // Fallback: cerca il comune più vicino alle coordinate
        if (!comuneFound) {
          comuneFound = await findComuneByCoords(lat, lng);
        }

        if (comuneFound) {
          // Comune trovato nel DB → cerca quartieri specifici
          const quartieriComune = await getQuartieriByComune(comuneFound.id);

          if (quartieriComune.length > 0) {
            // Il comune ha micro-quartieri → fuzzy match
            const matched =
              matchQuartiere(rawQuartiere, quartieriComune) ||
              matchQuartiere(rawRoad, quartieriComune) ||
              matchQuartiere(
                `${rawQuartiere} ${rawRoad}`,
                quartieriComune
              );

            if (matched) {
              result.quartiere = matched;
            } else {
              // Nessun match fuzzy → usa il primo quartiere "Centro" del comune
              const centro = quartieriComune.find((q) =>
                q.nome.includes("/Centro")
              );
              result.quartiere = centro
                ? centro.nome
                : quartieriComune[0].nome;
            }
          } else {
            // Comune attivo ma senza quartieri → usa "NomeComune/Centro"
            result.quartiere = `${comuneFound.nome}/Centro`;
          }

          // Aggiorna la città con il nome ufficiale del comune
          if (!result.citta) result.citta = comuneFound.nome;
        } else {
          // Comune NON trovato nel DB (fuori area di copertura)
          // Usa il quartiere grezzo da Nominatim oppure il nome della città
          if (rawQuartiere) {
            result.quartiere = rawQuartiere;
          } else if (rawCity) {
            result.quartiere = rawCity;
          }
        }

        onResult(result);
      } catch (error) {
        console.error("Reverse geocoding error:", error);
      } finally {
        setLoading(false);
      }
    },
    [onResult]
  );

  return { reverseGeocode, loading };
};
