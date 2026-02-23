import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GruppoNotifica {
  gruppoId: string;
  gruppoNome: string;
  count: number;
  ultimoMessaggio?: string;
  ultimoMittente?: string;
  ultimoTimestamp?: string;
}

const PannelloNotifiche = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [totaleNonLetti, setTotaleNonLetti] = useState(0);
  const [notifiche, setNotifiche] = useState<GruppoNotifica[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
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

    const { data: membri } = await supabase
      .from("gruppi_membri")
      .select("gruppo_id")
      .eq("user_id", user.id)
      .eq("stato", "approvato");

    const gruppiIds = membri?.map(m => m.gruppo_id) || [];
    if (gruppiIds.length === 0) {
      setTotaleNonLetti(0);
      setNotifiche([]);
      setLoading(false);
      return;
    }

    // Fetch group names
    const { data: gruppi } = await supabase
      .from("gruppi")
      .select("id, nome")
      .in("id", gruppiIds);
    const gruppiMap = new Map(gruppi?.map(g => [g.id, g.nome]) || []);

    // Fetch read status
    const { data: letti } = await supabase
      .from("messaggi_letti")
      .select("gruppo_id, ultimo_letto")
      .eq("user_id", user.id);
    const mapLetti = new Map(letti?.map(l => [l.gruppo_id, l.ultimo_letto]) || []);

    const risultati: GruppoNotifica[] = [];
    let totale = 0;

    await Promise.all(gruppiIds.map(async (gruppoId) => {
      const ultimoLetto = mapLetti.get(gruppoId) || new Date(0).toISOString();

      const { count } = await supabase
        .from("gruppi_messaggi")
        .select("*", { count: "exact", head: true })
        .eq("gruppo_id", gruppoId)
        .gt("created_at", ultimoLetto);

      const nonLetti = count || 0;
      totale += nonLetti;

      if (nonLetti > 0) {
        // Get latest message
        const { data: ultimo } = await supabase
          .from("gruppi_messaggi")
          .select("testo, mittente_id, created_at")
          .eq("gruppo_id", gruppoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let mittente = "Utente";
        if (ultimo?.mittente_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("nome, cognome")
            .eq("user_id", ultimo.mittente_id)
            .single();
          if (prof) mittente = `${prof.nome || ""}${prof.cognome ? ` ${prof.cognome[0]}.` : ""}`.trim() || "Utente";
        }

        risultati.push({
          gruppoId,
          gruppoNome: gruppiMap.get(gruppoId) || "Gruppo",
          count: nonLetti,
          ultimoMessaggio: ultimo?.testo,
          ultimoMittente: mittente,
          ultimoTimestamp: ultimo?.created_at,
        });
      }
    }));

    risultati.sort((a, b) => {
      const ta = a.ultimoTimestamp || "";
      const tb = b.ultimoTimestamp || "";
      return tb.localeCompare(ta);
    });

    setTotaleNonLetti(totale);
    setNotifiche(risultati);
    setLoading(false);
  };

  // Initial load + realtime
  useEffect(() => {
    if (!user) return;
    caricaNotifiche();

    const channel = supabase
      .channel("pannello-notifiche")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gruppi_messaggi" }, () => caricaNotifiche())
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_letti" }, () => caricaNotifiche())
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) caricaNotifiche(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
        {totaleNonLetti > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 px-1 py-0 text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center"
          >
            {totaleNonLetti > 99 ? "99+" : totaleNonLetti}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-[60] overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-foreground">Notifiche</h3>
            {totaleNonLetti > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totaleNonLetti} non {totaleNonLetti === 1 ? "letto" : "letti"}
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Caricamento...</div>
            ) : notifiche.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nessun messaggio non letto
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifiche.map((n) => (
                  <button
                    key={n.gruppoId}
                    onClick={() => { setOpen(false); navigate(`/gruppi/${n.gruppoId}`); }}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        <Users className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">{n.gruppoNome}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.ultimoTimestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="font-medium">{n.ultimoMittente}:</span> {n.ultimoMessaggio}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[10px] px-1.5 h-5 shrink-0 mt-1">
                      {n.count}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border">
            <button
              onClick={() => { setOpen(false); navigate("/chat"); }}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
            >
              Vedi tutte le chat <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PannelloNotifiche;
