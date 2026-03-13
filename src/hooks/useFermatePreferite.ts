import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const QUERY_KEY = "fermate-preferite";

export function useFermatePreferite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferiti = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fermate_preferite" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; user_id: string; stop_id: string; stop_name: string | null; created_at: string }[];
    },
    enabled: !!user,
  });

  const preferitiStopIds = new Set(preferiti.map((p) => p.stop_id));

  const isFavorite = (stopIds: string[]): boolean => {
    return stopIds.some((sid) => preferitiStopIds.has(sid));
  };

  const toggle = useMutation({
    mutationFn: async ({ stopIds, stopName }: { stopIds: string[]; stopName: string }) => {
      if (!user) throw new Error("Non autenticato");
      // Use first stop_id as representative
      const stopId = stopIds[0];
      const alreadyFav = preferitiStopIds.has(stopId);
      if (alreadyFav) {
        const { error } = await supabase
          .from("fermate_preferite" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("stop_id", stopId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("fermate_preferite" as any)
          .insert({ user_id: user.id, stop_id: stopId, stop_name: stopName } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return { preferiti, isLoading, isFavorite, toggle };
}
