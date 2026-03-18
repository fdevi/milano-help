import { useState, useEffect, useCallback } from "react";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { ADMIN_USER_ID } from "@/lib/adminProfile";

const STORAGE_KEY = "milanohelp_admin_mode";

export const useAdminMode = () => {
  const { isAdmin, loading } = useRoleCheck();
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // If not admin, force false
  useEffect(() => {
    if (!loading && !isAdmin) {
      setAdminMode(false);
    }
  }, [isAdmin, loading]);

  const toggleAdminMode = useCallback(() => {
    setAdminMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const effectiveMode = isAdmin && adminMode;
  const effectiveUserId = (userId: string) =>
    effectiveMode ? ADMIN_USER_ID : userId;

  return {
    adminMode: effectiveMode,
    toggleAdminMode,
    isAdmin,
    loading,
    effectiveUserId,
  };
};
