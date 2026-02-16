import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Heart, MessageCircle, Lock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  console.log("Navbar montata");
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user } = useAuth();
  const { isAdmin, loading } = useAdminCheck();

  // Log per debug
  console.log("Utente:", user);
  console.log("isAdmin:", isAdmin, "loading:", loading);

  return (
    <nav className="fixed top-0 left-0 right-0 z-20 bg-card/80 backdrop-filter">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          Milano Help
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Link admin - visibile solo a admin */}
          {!loading && isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Lock className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
          
          {/* Stato utente */}
          {user ? (
            <>
              <span className="text-sm hidden md:inline">
                Ciao, {user.email}
              </span>
              <Button variant="outline" size="sm">
                Esci
              </Button>
            </>
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;