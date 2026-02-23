import { Link } from "react-router-dom";
import { Bell, Search, Heart, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PannelloNotifiche from "@/components/PannelloNotifiche";

const TopNavbar = () => {
  const { user } = useAuth();
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nome, cognome, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const n = (data.nome || "U")[0];
          const c = (data.cognome || "")[0];
          setInitials(`${n}${c}`.toUpperCase());
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="h-full flex items-center justify-between px-4 max-w-[1600px] mx-auto">
        {/* Left: Logo - MODIFICATO: ora punta a / invece di /home */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-extrabold text-lg text-foreground hidden sm:inline">
            MILANO <span className="text-gradient-primary">HELP</span>
          </span>
        </Link>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca a Milano..."
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Notifications */}
          <Link to="/notifiche" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Link>

          {/* Chat / Notifiche */}
          <PannelloNotifiche />

          {/* Avatar */}
          <Link to="/profilo" className="ml-1">
            <Avatar className="w-8 h-8 border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-muted transition-colors ml-1"
            title="Esci"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;