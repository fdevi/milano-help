import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useRoleCheck = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<"admin" | "moderator" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      setLoading(true);

      if (!user) {
        if (isMounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("useRoleCheck error:", error);
          if (isMounted) setRole(null);
        } else {
          const roles = (data ?? []).map((row) => row.role);

          if (isMounted) {
            if (roles.includes("admin")) {
              setRole("admin");
            } else if (roles.includes("moderator")) {
              setRole("moderator");
            } else if (roles.includes("user")) {
              setRole("user");
            } else {
              setRole(null);
            }
          }
        }
      } catch (err) {
        console.error("useRoleCheck exception:", err);
        if (isMounted) setRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const isAdminOrModerator = isAdmin || isModerator;

  return { role, isAdmin, isModerator, isAdminOrModerator, loading };
};
