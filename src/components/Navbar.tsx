import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useTipoAccount } from "@/hooks/useTipoAccount";
import { supabase } from "@/integrations/supabase/client";
import PannelloNotifiche from "@/components/PannelloNotifiche";
import DropdownChat from "@/components/DropdownChat";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const { isProfessionista, isNegoziante } = useTipoAccount();
  const [isOpen, setIsOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['navbar-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('nome, cognome')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const displayName = profile?.nome
    ? `${profile.nome}${profile.cognome ? ` ${profile.cognome}` : ''}`
    : user?.email?.split('@')[0] || 'Utente';

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background border-b border-border px-4 py-3 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="shrink-0">
          <Logo variant="horizontal" size="md" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/home">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/miei-annunci">
                <Button variant="ghost" size="sm">I miei annunci</Button>
              </Link>
              <Link to="/gruppi">
                <Button variant="ghost" size="sm">Gruppi</Button>
              </Link>
              <DropdownChat />
              <PannelloNotifiche />
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="text-primary border-primary">Admin</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Ciao, {displayName}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">Esci</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Accedi</Button>
              </Link>
              <Link to="/registrati">
                <Button size="sm">Registrati</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile: icons + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          {user ? (
            <>
              <DropdownChat />
              <PannelloNotifiche />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Accedi</Button>
              </Link>
              <Link to="/registrati">
                <Button size="sm">Registrati</Button>
              </Link>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} aria-label="Menu">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg">
          <div className="flex flex-col p-4 gap-1">
            {user ? (
              <>
                <span className="text-sm font-medium text-muted-foreground px-3 py-2">
                  Ciao, {displayName}
                </span>
                <Link to="/home" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Dashboard</Link>
                <Link to="/miei-annunci" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">I miei annunci</Link>
                <Link to="/gruppi" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Gruppi</Link>
                <Link to="/chat" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Chat</Link>
                {isProfessionista && (
                  <Link to="/categoria/Professionisti" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium text-blue-600">Professionisti</Link>
                )}
                {isNegoziante && (
                  <Link to="/categoria/negozi_di_quartiere" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm font-medium text-emerald-600">Negozi di Quartiere</Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm text-primary font-semibold">Admin Panel</Link>
                )}
                <button onClick={() => { setIsOpen(false); handleLogout(); }} className="px-3 py-2 rounded-md hover:bg-muted text-sm text-left text-destructive">Esci</button>
              </>
            ) : (
              <>
                <Link to="/how-it-works" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Come Funziona</Link>
                <Link to="/categoria/evento" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Eventi</Link>
                <Link to="/login" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm">Accedi</Link>
                <Link to="/registrati" onClick={() => setIsOpen(false)} className="px-3 py-2 rounded-md hover:bg-muted text-sm font-semibold text-primary">Registrati</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
