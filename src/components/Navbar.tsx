import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

const Navbar = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const unreadCount = useUnreadCount();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '0.75rem 1rem',
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#10b981' }}>
          Milano Help
        </Link>

        <div style={{ display: 'none', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/categories">Categorie</Link>
          <Link to="/how-it-works">Come Funziona</Link>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Link to="/miei-annunci">
                <Button variant="ghost" size="sm">I miei annunci</Button>
              </Link>
              <Link to="/gruppi">
                <Button variant="ghost" size="sm">Gruppi</Button>
              </Link>
              <Link to="/chat" className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="text-primary border-primary">
                    Admin
                  </Button>
                </Link>
              )}
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Ciao, {user.email?.split('@')[0]}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Esci
              </Button>
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

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
          >
            ☰
          </Button>
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/categories">Categorie</Link>
            <Link to="/how-it-works">Come Funziona</Link>
            <Link to="/gruppi">Gruppi</Link>
            {user && (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/miei-annunci">I miei annunci</Link>
                <Link to="/chat">Chat {unreadCount > 0 && `(${unreadCount})`}</Link>
                {isAdmin && <Link to="/admin" style={{ color: '#10b981', fontWeight: 'bold' }}>Admin Panel</Link>}
              </>
            )}
            {!user && (
              <>
                <Link to="/login">Accedi</Link>
                <Link to="/registrati">Registrati</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
