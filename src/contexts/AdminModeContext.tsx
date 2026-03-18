import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { ADMIN_USER_ID } from "@/lib/adminProfile";

const STORAGE_KEY = "milanohelp_admin_mode";

interface AdminModeContextType {
  adminMode: boolean;
  toggleAdminMode: () => void;
  isAdmin: boolean;
  loading: boolean;
  effectiveUserId: (userId: string) => string;
}

const AdminModeContext = createContext<AdminModeContextType>({
  adminMode: false,
  toggleAdminMode: () => {},
  isAdmin: false,
  loading: true,
  effectiveUserId: (id) => id,
});

export const AdminModeProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin, loading } = useRoleCheck();
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

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
  const effectiveUserId = useCallback(
    (userId: string) => (effectiveMode ? ADMIN_USER_ID : userId),
    [effectiveMode]
  );

  return (
    <AdminModeContext.Provider
      value={{
        adminMode: effectiveMode,
        toggleAdminMode,
        isAdmin,
        loading,
        effectiveUserId,
      }}
    >
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => useContext(AdminModeContext);
