import { Link } from "react-router-dom";
import { Search, LogOut, Shield } from "lucide-react";
import Logo from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PannelloNotifiche from "@/components/PannelloNotifiche";
import DropdownChat from "@/components/DropdownChat";
import { useAdminMode } from "@/hooks/useAdminMode";
import { Switch } from "@/components/ui/switch";

const TopNavbar = () => {
  const { user } = useAuth();
  const { adminMode, toggleAdminMode, isAdmin } = useAdminMode();
  
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
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo variant="symbol" size="md" />
        </Link>

        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca a Milano..."
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <div className="flex items-center gap-1.5 mr-2 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 hidden sm:inline">Admin</span>
              <Switch
                checked={adminMode}
                onCheckedChange={(checked) => {
                  console.log("[TopNavbar] admin switch click", { checked });
                  toggleAdminMode(checked);
                }}
                className="scale-75"
              />
            </div>
          )}
          <DropdownChat />
          <PannelloNotifiche />

          <Link to="/profilo" className="ml-1">
            <Avatar className="w-8 h-8 border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

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
