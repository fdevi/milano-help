import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY_PREFIX = "milanohelp_admin_mode_v2";
const storageKeyForUser = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

interface AdminModeContextType {
  adminMode: boolean;
  toggleAdminMode: (next?: boolean) => void;
  isAdmin: boolean;
  loading: boolean;
}

const AdminModeContext = createContext<AdminModeContextType>({
  adminMode: false,
  toggleAdminMode: () => {},
  isAdmin: false,
  loading: true,
});

export const AdminModeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoleCheck();
  const [adminModeRaw, setAdminModeRaw] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAdmin || !user?.id) {
      setAdminModeRaw(false);
      return;
    }

    let storedMode = false;
    try {
      storedMode = localStorage.getItem(storageKeyForUser(user.id)) === "true";
    } catch {}

    setAdminModeRaw(storedMode);
  }, [user?.id, isAdmin, loading]);

  const toggleAdminMode = useCallback(
    (next?: boolean) => {
      if (!isAdmin || !user?.id) return;

      setAdminModeRaw((prev) => {
        const nextValue = typeof next === "boolean" ? next : !prev;
        try {
          localStorage.setItem(storageKeyForUser(user.id), String(nextValue));
        } catch {}
        return nextValue;
      });
    },
    [isAdmin, user?.id]
  );

  const effectiveMode = isAdmin && adminModeRaw;

  const contextValue = useMemo(
    () => ({
      adminMode: effectiveMode,
      toggleAdminMode,
      isAdmin,
      loading,
    }),
    [effectiveMode, toggleAdminMode, isAdmin, loading]
  );

  return <AdminModeContext.Provider value={contextValue}>{children}</AdminModeContext.Provider>;
};

export const useAdminMode = () => useContext(AdminModeContext);
