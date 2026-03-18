import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { ADMIN_USER_ID } from "@/lib/adminProfile";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY_PREFIX = "milanohelp_admin_mode_v2";
const storageKeyForUser = (userId: string) => `${STORAGE_KEY_PREFIX}:${userId}`;

interface AdminModeContextType {
  adminMode: boolean;
  toggleAdminMode: (next?: boolean) => void;
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
  const { user } = useAuth();
  const { isAdmin, loading } = useRoleCheck();
  const [adminModeRaw, setAdminModeRaw] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAdmin || !user?.id) {
      setAdminModeRaw(false);
      console.log("[AdminMode] reset non-admin/no-user", {
        isAdmin,
        userId: user?.id ?? null,
      });
      return;
    }

    let storedMode = false;
    try {
      storedMode = localStorage.getItem(storageKeyForUser(user.id)) === "true";
    } catch {}

    setAdminModeRaw(storedMode);
    console.log("[AdminMode] init from localStorage", {
      userId: user.id,
      isAdmin,
      storedMode,
    });
  }, [user?.id, isAdmin, loading]);

  const toggleAdminMode = useCallback(
    (next?: boolean) => {
      if (!isAdmin || !user?.id) {
        console.log("[AdminMode] toggle ignored (not admin or no user)", {
          isAdmin,
          userId: user?.id ?? null,
        });
        return;
      }

      setAdminModeRaw((prev) => {
        const nextValue = typeof next === "boolean" ? next : !prev;
        try {
          localStorage.setItem(storageKeyForUser(user.id), String(nextValue));
        } catch {}

        console.log("[AdminMode] toggle", {
          userId: user.id,
          prev,
          next: nextValue,
          storedValue: String(nextValue),
        });

        return nextValue;
      });
    },
    [isAdmin, user?.id]
  );

  const effectiveMode = isAdmin && adminModeRaw;

  const effectiveUserId = useCallback(
    (userId: string) => {
      const resolvedUserId = effectiveMode ? ADMIN_USER_ID : userId;
      console.log("[AdminMode] effectiveUserId", {
        userId,
        resolvedUserId,
        isAdmin,
        adminModeRaw,
        effectiveMode,
        contextUserId: user?.id ?? null,
      });
      return resolvedUserId;
    },
    [effectiveMode, isAdmin, adminModeRaw, user?.id]
  );

  const contextValue = useMemo(
    () => ({
      adminMode: effectiveMode,
      toggleAdminMode,
      isAdmin,
      loading,
      effectiveUserId,
    }),
    [effectiveMode, toggleAdminMode, isAdmin, loading, effectiveUserId]
  );

  return <AdminModeContext.Provider value={contextValue}>{children}</AdminModeContext.Provider>;
};

export const useAdminMode = () => useContext(AdminModeContext);
