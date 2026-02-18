import { Link } from "react-router-dom";
import { Bell, MessageCircle, Search, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TopNavbar = () => {
  const { user } = useAuth();
  const unreadCount = useUnreadCount();
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="h-full flex items-center justify-between px-4 max-w-[1600px] mx-auto">
        {/* Left: Logo */}
        <Link to="/home" className="flex items-center gap-2 shrink-0">
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

          {/* Chat */}
          <Link to="/chat" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] px-1 py-0 h-4 min-w-[16px] flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Link>

          {/* Avatar */}
          <Link to="/profilo" className="ml-1">
            <Avatar className="w-8 h-8 border-2 border-primary/20 hover:border-primary transition-colors cursor-pointer">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
