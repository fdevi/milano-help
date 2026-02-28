import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Quartiere {
  nome: string;
  area: string;
  comune_id?: string;
  comune_nome?: string;
}

// Hook che carica i quartieri dal database
export const useQuartieri = () => {
  const [quartieri, setQuartieri] = useState<Quartiere[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuartieri = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("quartieri")
          .select("nome, area, comune_id, comuni!inner(nome)")
          .eq("attivo", true)
          .order("nome");

        if (error) {
          console.error("Errore caricamento quartieri:", error);
          return;
        }

        const mapped: Quartiere[] = (data || []).map((q: any) => ({
          nome: q.nome,
          area: q.area || "",
          comune_id: q.comune_id,
          comune_nome: q.comuni?.nome || "",
        }));

        setQuartieri(mapped);
      } catch (err) {
        console.error("Errore caricamento quartieri:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuartieri();
  }, []);

  const aree = useMemo(
    () => [...new Set(quartieri.map((q) => q.area).filter(Boolean))],
    [quartieri]
  );

  return { quartieri, aree, loading };
};

// Funzione per cercare il comune più vicino alle coordinate date
export const findComuneByCoords = async (
  lat: number,
  lon: number
): Promise<{ id: string; nome: string } | null> => {
  try {
    // Cerca il comune attivo più vicino (distanza euclidea approssimata)
    const { data, error } = await (supabase as any)
      .from("comuni")
      .select("id, nome, lat, lon")
      .eq("attivo", true);

    if (error || !data || data.length === 0) return null;

    let closest: { id: string; nome: string } | null = null;
    let minDist = Infinity;

    for (const c of data) {
      if (c.lat == null || c.lon == null) continue;
      const dist = Math.sqrt(
        Math.pow((c.lat - lat) * 111, 2) +
          Math.pow((c.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180), 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = { id: c.id, nome: c.nome };
      }
    }

    // Solo se entro ~5km
    if (closest && minDist < 5) return closest;
    return null;
  } catch {
    return null;
  }
};

// Funzione per ottenere i quartieri di un comune specifico
export const getQuartieriByComune = async (
  comuneId: string
): Promise<Quartiere[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from("quartieri")
      .select("nome, area, comune_id")
      .eq("comune_id", comuneId)
      .eq("attivo", true);

    if (error || !data) return [];

    return data.map((q) => ({
      nome: q.nome,
      area: q.area || "",
      comune_id: q.comune_id || undefined,
    }));
  } catch {
    return [];
  }
};

// Funzione per cercare un comune per nome
export const findComuneByName = async (
  name: string
): Promise<{ id: string; nome: string } | null> => {
  if (!name || !name.trim()) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("comuni")
      .select("id, nome")
      .eq("attivo", true)
      .ilike("nome", name.trim());

    if (error || !data || data.length === 0) return null;
    return { id: data[0].id, nome: data[0].nome };
  } catch {
    return null;
  }
};

// Backward compatibility exports
export const QUARTIERI: Quartiere[] = [];
export const AREE: string[] = [];
