import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      console.log("🔍 useAdminCheck - INIZIO, user:", user?.id);
      
      if (!user) {
        console.log("❌ useAdminCheck - user nullo");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log("✅ useAdminCheck - user ID:", user.id);
      
      try {
        console.log("🔄 useAdminCheck - chiamo RPC has_role");
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        console.log("📊 useAdminCheck - RPC response:", { data, error });
        
        if (error) {
          console.error("❌ useAdminCheck - errore RPC:", error);
          setIsAdmin(false);
        } else {
          console.log("✅ useAdminCheck - isAdmin:", data === true);
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error("❌ useAdminCheck - eccezione:", err);
        setIsAdmin(false);
      }
      
      setLoading(false);
      console.log("🏁 useAdminCheck - completato");
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
