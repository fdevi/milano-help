import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    // Get initial session first (synchronous pattern)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        // Check blocked and email verification status
        supabase
          .from("profiles")
          .select("bloccato, email_verificata")
          .eq("user_id", initialSession.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.bloccato === true) {
              supabase.auth.signOut();
              setSession(null);
            } else if (!error && data?.email_verificata === false) {
              supabase.auth.signOut();
              setSession(null);
            } else {
              setSession(initialSession);
            }
            setLoading(false);
          });
      } else {
        setSession(initialSession);
        setLoading(false);
      }
    });

    // Listen for auth changes (keep callback synchronous)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession?.user) {
          // Defer blocked check without making callback async
          setTimeout(() => {
            supabase
              .from("profiles")
              .select("bloccato, email_verificata")
              .eq("user_id", newSession.user.id)
              .single()
              .then(({ data, error }) => {
                if (!error && data?.bloccato === true) {
                  supabase.auth.signOut();
                  setSession(null);
                } else if (!error && data?.email_verificata === false) {
                  supabase.auth.signOut();
                  setSession(null);
                } else {
                  setSession(newSession);
                }
              });
          }, 0);
        } else {
          setSession(newSession);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
