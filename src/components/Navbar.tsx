import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Heart, MessageCircle, Lock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  console.log("🔄 Navbar - file caricato, versione con protezione");
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  
  // Proteggiamo l'accesso al contesto
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.log("⚠️ Navbar - AuthContext non ancora disponibile, attendo...");
    // Renderizza una navbar minimale senza funzionalità
    return (
      <nav className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            Milano Help
          </Link>
          <div className="text-sm text-muted-foreground">Caricamento...</div>
        </div>
      </nav>
    );
  }
  
  const { user } = authContext;
  
  let adminCheck = { isAdmin: false, loading: true };
  try {
    adminCheck = useAdminCheck();
  } catch (error) {
    console.log("⚠️ Navbar - useAdminCheck non ancora disponibile");
  }
  
  const { isAdmin, loading } = adminCheck;

  console.log("🔄 Navbar - user:", user?.email);
  console.log("🔄 Navbar - isAdmin:", isAdmin, "loading:", loading);

  // Se ancora in caricamento, mostra una navbar minimale
  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            Milano Help
          </Link>
          <div className="text-sm text-muted-foreground">Caricamento...</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          Milano Help
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Link admin - visibile solo a admin */}
          {!loading && isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
          
          {/* Icone social/chat sempre visibili */}
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="h-5 w-5" />
          </Button>

          {/* Stato utente */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm hidden md:inline text-muted-foreground">
                Ciao, {user.email?.split('@')[0] || 'utente'}
              </span>
              <Button variant="outline" size="sm">Esci</Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Accedi</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Registrati</Button>
              </Link>
            </>
          )}

          {/* Menu mobile */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 right-0 bg-card border-b md:hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {!loading && isAdmin && (
                <Link to="/admin" className="py-2 px-4 hover:bg-muted rounded-md" onClick={() => setIsOpen(false)}>
                  Pannello Admin
                </Link>
              )}
              <Link to="/" className="py-2 px-4 hover:bg-muted rounded-md" onClick={() => setIsOpen(false)}>Home</Link>
              <Link to="/about" className="py-2 px-4 hover:bg-muted rounded-md" onClick={() => setIsOpen(false)}>Chi siamo</Link>
              {!user && (
                <>
                  <Link to="/login" className="py-2 px-4 hover:bg-muted rounded-md" onClick={() => setIsOpen(false)}>Accedi</Link>
                  <Link to="/register" className="py-2 px-4 hover:bg-muted rounded-md" onClick={() => setIsOpen(false)}>Registrati</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;