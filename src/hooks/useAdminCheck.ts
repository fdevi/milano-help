import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔍 useAdminCheck - eseguito con authLoading:", authLoading, "user:", user);
    
    if (authLoading) {
      console.log("⏳ useAdminCheck - authLoading in corso...");
      return;
    }
    
    if (!user) {
      console.log("❌ useAdminCheck - nessun utente loggato");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    console.log("✅ useAdminCheck - utente loggato, ID:", user.id);

    const check = async () => {
      console.log("🔄 useAdminCheck - chiamo RPC has_role per user:", user.id);
      
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        
        console.log("📊 useAdminCheck - Risultato RPC:", { data, error });
        
        setIsAdmin(!!data && !error);
      } catch (err) {
        console.error("💥 useAdminCheck - Errore nella chiamata RPC:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    check();
  }, [user, authLoading]);

  console.log("🏁 useAdminCheck - return con isAdmin:", isAdmin, "loading:", loading);

  return { isAdmin, loading: loading || authLoading };
};