import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useTipoAccount = () => {
  const { user } = useAuth();

  const { data: tipoAccount } = useQuery({
    queryKey: ['tipo-account', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('tipo_account')
        .eq('user_id', user.id)
        .single();
      return data?.tipo_account || 'privato';
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    tipoAccount: tipoAccount || null,
    isProfessionista: tipoAccount === 'professionista',
    isNegoziante: tipoAccount === 'negoziante',
  };
};
