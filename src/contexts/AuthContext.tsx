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
      const { data: { user } } = await supabase.auth.getUser();
      const provider = user?.app_metadata?.provider;
      const isOAuth = provider && provider !== "email";
      console.log("[AuthContext] email_verificata check:", { email_verificata: data?.email_verificata, provider, isOAuth });
      if (isOAuth) {
        // OAuth users have verified email — update DB and continue
        await supabase.from("profiles").update({ email_verificata: true }).eq("user_id", userId);
      } else {
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
        try {
          const w = window as any;
          if (w.OneSignal) {
            w.OneSignal.login(initialSession.user.id);
            console.log("[OneSignal] login called with:", initialSession.user.id);
          } else {
            // SDK not ready yet, defer login
            const orig = w.OneSignalDeferred || [];
            orig.push(async function(OS: any) {
              await OS.login(initialSession.user.id);
              console.log("[OneSignal] deferred login called with:", initialSession.user.id);
            });
          }
        } catch (e) { console.error("[OneSignal] login error:", e); }
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
          // OneSignal login - with deferred fallback
          try {
            const w = window as any;
            if (w.OneSignal) {
              w.OneSignal.login(newSession.user.id);
              console.log("[OneSignal] login called with:", newSession.user.id);
            } else {
              const orig = w.OneSignalDeferred || [];
              orig.push(async function(OS: any) {
                await OS.login(newSession.user.id);
                console.log("[OneSignal] deferred login called with:", newSession.user.id);
              });
            }
          } catch (e) { console.error("[OneSignal] login error:", e); }
        } else {
          setProfileComplete(null);
          setLoading(false);
          // OneSignal logout
          try { (window as any).OneSignal?.logout(); } catch (e) { /* ignore */ }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try { (window as any).OneSignal?.logout(); } catch (e) { /* ignore */ }
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
