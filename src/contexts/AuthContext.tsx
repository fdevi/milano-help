import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const checkBlocked = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("bloccato")
        .eq("user_id", userId)
        .single();
      return data?.bloccato === true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const blocked = await checkBlocked(newSession.user.id);
          if (blocked) {
            await supabase.auth.signOut();
            setSession(null);
            setLoading(false);
            return;
          }
        }
        setSession(newSession);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        const blocked = await checkBlocked(existingSession.user.id);
        if (blocked) {
          await supabase.auth.signOut();
          setSession(null);
          setLoading(false);
          return;
        }
      }
      setSession(existingSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkBlocked]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
