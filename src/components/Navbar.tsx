import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Heart, MessageCircle, Lock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-blur-lg border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-heading font-extrabold text-xl text-foreground">
            MILANO <span className="text-gradient-primary">HELP</span>
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {isHome && (
            <>
              <a href="#categorie" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Categorie
              </a>
              <a href="#come-funziona" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Come Funziona
              </a>
            </>
          )}
          <Link to="/chat" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </Link>
          {user && isAdmin && !adminLoading && (
            <Link to="/admin" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors" title="Admin Panel">
              <Lock className="w-5 h-5" />
            </Link>
          )}
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="hero" size="sm">Dashboard</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>Esci</Button>
            </>
          ) : (
            <>
              <Link to="/registrati">
                <Button variant="hero" size="sm">Registrati</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm">Accedi</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-foreground"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-card border-b overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {isHome && (
                <>
                  <a href="#categorie" onClick={() => setIsOpen(false)} className="text-sm font-medium text-muted-foreground">Categorie</a>
                  <a href="#come-funziona" onClick={() => setIsOpen(false)} className="text-sm font-medium text-muted-foreground">Come Funziona</a>
                </>
              )}
              <Link to="/chat" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <MessageCircle className="w-4 h-4" /> Chat
                </Button>
              </Link>
              {user && isAdmin && !adminLoading && (
                <Link to="/admin" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Lock className="w-4 h-4" /> Admin Panel
                  </Button>
                </Link>
              )}
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="hero" className="w-full">Dashboard</Button>
                  </Link>
                  <Button variant="outline" className="w-full" onClick={() => { signOut(); setIsOpen(false); }}>Esci</Button>
                </>
              ) : (
                <>
                  <Link to="/registrati" onClick={() => setIsOpen(false)}>
                    <Button variant="hero" className="w-full">Registrati</Button>
                  </Link>
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">Accedi</Button>
                  </Link>
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
