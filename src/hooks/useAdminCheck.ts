import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      console.log("🔍 useAdminCheck - checkAdmin avviato");
      
      if (!user) {
        console.log("❌ useAdminCheck - nessun utente");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log("✅ useAdminCheck - utente ID:", user.id);

      // Query diretta alla tabella user_roles (più affidabile della RPC)
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log("📊 useAdminCheck - risultato query:", { data, error });

      if (error) {
        console.error("❌ useAdminCheck - errore:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.role === 'admin');
      }
      
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  console.log("🏁 useAdminCheck - return:", { isAdmin, loading });
  return { isAdmin, loading };
};