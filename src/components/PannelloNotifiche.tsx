import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificaItem {
  id: string;
  titolo: string;
  messaggio?: string;
  timestamp?: string;
  notificaTipo?: string;
  link?: string;
}

const PannelloNotifiche = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [totale, setTotale] = useState(0);
  const [notifiche, setNotifiche] = useState<NotificaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const caricaNotifiche = async () => {
    if (!user) return;
    setLoading(true);

    const { data, count } = await supabase
      .from("notifiche")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("letta", false)
      .order("created_at", { ascending: false })
      .limit(30);

    setTotale(count || 0);
    setNotifiche(
      (data || []).map((n: any) => ({
        id: n.id,
        titolo: n.titolo || "Notifica",
        messaggio: n.messaggio,
        timestamp: n.created_at,
        notificaTipo: n.tipo,
        link: n.link,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    caricaNotifiche();

    const channel = supabase
      .channel("notifiche-pannello-" + user.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifiche",
        filter: `user_id=eq.${user.id}`,
      }, () => caricaNotifiche())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifiche",
        filter: `user_id=eq.${user.id}`,
      }, () => caricaNotifiche())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const formatTime = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  };

  const handleClick = async (n: NotificaItem) => {
    setOpen(false);
    await supabase.from("notifiche").update({ letta: true } as any).eq("id", n.id);
    caricaNotifiche();
    if (n.link) navigate(n.link);
  };

  const getIcon = (tipo?: string) => {
    switch (tipo) {
      case "like_annuncio": return <Heart className="w-4 h-4 text-rose-500" />;
      case "commento_annuncio": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "approvato": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "rifiutato": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getLabel = (tipo?: string) => {
    switch (tipo) {
      case "like_annuncio": return "Mi piace";
      case "commento_annuncio": return "Commento";
      case "approvato": return "Approvato";
      case "rifiutato": return "Rifiutato";
      default: return "Avviso";
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) caricaNotifiche(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {totale > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 px-1 py-0 text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center"
          >
            {totale > 99 ? "99+" : totale}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-[60] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-foreground">Notifiche</h3>
            {totale > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totale} non {totale === 1 ? "letta" : "lette"}
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Caricamento...</div>
            ) : notifiche.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nessuna notifica
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifiche.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getIcon(n.notificaTipo)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{n.titolo}</span>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded shrink-0">
                            {getLabel(n.notificaTipo)}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.timestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.messaggio}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default PannelloNotifiche;
