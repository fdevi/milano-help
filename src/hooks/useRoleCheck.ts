import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useRoleCheck = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("useRoleCheck error:", error);
          setRole(null);
        } else {
          setRole(data?.role ?? null);
        }
      } catch (err) {
        console.error("useRoleCheck exception:", err);
        setRole(null);
      }

      setLoading(false);
    };

    checkRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const isAdminOrModerator = isAdmin || isModerator;

  return { role, isAdmin, isModerator, isAdminOrModerator, loading };
};
