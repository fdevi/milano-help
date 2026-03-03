import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profileComplete: boolean | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  profileComplete: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("bloccato, email_verificata, nome, cognome")
      .eq("user_id", userId)
      .single();

    if (!error && data?.bloccato === true) {
      await supabase.auth.signOut();
      setSession(null);
      setProfileComplete(null);
      return;
    }
    if (!error && data?.email_verificata === false) {
      // For OAuth users, email is already verified — check provider
      const { data: { user } } = await supabase.auth.getUser();
      const isOAuth = user?.app_metadata?.provider !== "email";
      if (!isOAuth) {
        await supabase.auth.signOut();
        setSession(null);
        setProfileComplete(null);
        return;
      }
    }

    // Profile is complete if nome and cognome are filled
    const complete = !!(data?.nome?.trim() && data?.cognome?.trim());
    console.log("[AuthContext] checkProfile result:", { nome: data?.nome, cognome: data?.cognome, complete, error });
    setProfileComplete(complete);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession?.user) {
        setSession(initialSession);
        checkProfile(initialSession.user.id).then(() => setLoading(false));
      } else {
        setSession(initialSession);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log("[AuthContext] onAuthStateChange:", _event, "user:", newSession?.user?.id);
        setSession(newSession);
        if (newSession?.user) {
          setTimeout(() => {
            checkProfile(newSession.user.id).then(() => {
              console.log("[AuthContext] checkProfile done, setting loading=false");
              setLoading(false);
            });
          }, 0);
        } else {
          setProfileComplete(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, profileComplete, signOut }}>
      <ProfileRedirectGuard>{children}</ProfileRedirectGuard>
    </AuthContext.Provider>
  );
};

// Global guard: redirects to /completa-profilo from ANY page if profile is incomplete
const EXCLUDED_PATHS = ["/completa-profilo", "/login", "/registrati", "/privacy", "/termini", "/auth/confirm", "/confirm-email-change", "/reset-password", "/forgot-password"];

const ProfileRedirectGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading, profileComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    
    const isExcluded = EXCLUDED_PATHS.some(p => location.pathname.startsWith(p));
    if (isExcluded) return;

    console.log("[ProfileRedirectGuard]", { path: location.pathname, profileComplete, userId: user.id });

    if (profileComplete === false) {
      console.log("[ProfileRedirectGuard] Redirecting to /completa-profilo");
      navigate("/completa-profilo", { replace: true });
    }
  }, [user, loading, profileComplete, location.pathname, navigate]);

  return <>{children}</>;
};
