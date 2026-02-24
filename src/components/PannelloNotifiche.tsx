import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageCircle, Users, User, ChevronRight, Heart, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotificaItem {
  id: string;
  nome: string;
  count: number;
  ultimoMessaggio?: string;
  ultimoMittente?: string;
  ultimoTimestamp?: string;
  tipo: "gruppo" | "privata" | "notifica";
  notificaTipo?: string;
  link?: string;
}

const PannelloNotifiche = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [totaleNonLetti, setTotaleNonLetti] = useState(0);
  const [notifiche, setNotifiche] = useState<NotificaItem[]>([]);
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

    const risultati: NotificaItem[] = [];
    let totale = 0;

    // === GRUPPI ===
    const { data: membri } = await supabase
      .from("gruppi_membri")
      .select("gruppo_id")
      .eq("user_id", user.id)
      .eq("stato", "approvato");

    const gruppiIds = membri?.map(m => m.gruppo_id) || [];

    if (gruppiIds.length > 0) {
      const { data: gruppi } = await supabase
        .from("gruppi")
        .select("id, nome")
        .in("id", gruppiIds);
      const gruppiMap = new Map(gruppi?.map(g => [g.id, g.nome]) || []);

      const { data: letti } = await supabase
        .from("messaggi_letti")
        .select("gruppo_id, ultimo_letto")
        .eq("user_id", user.id);
      const mapLetti = new Map(letti?.map(l => [l.gruppo_id, l.ultimo_letto]) || []);

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
            id: gruppoId,
            nome: gruppiMap.get(gruppoId) || "Gruppo",
            count: nonLetti,
            ultimoMessaggio: ultimo?.testo,
            ultimoMittente: mittente,
            ultimoTimestamp: ultimo?.created_at,
            tipo: "gruppo",
          });
        }
      }));
    }

    // === CHAT PRIVATE ===
    const { data: convPrivate } = await supabase
      .from("conversazioni_private")
      .select("id, acquirente_id, venditore_id, ultimo_messaggio, ultimo_aggiornamento, ultimo_mittente_id, annuncio_id")
      .or(`acquirente_id.eq.${user.id},venditore_id.eq.${user.id}`);

    console.log("📞 Conversazioni private trovate:", convPrivate?.length || 0);

    if (convPrivate && convPrivate.length > 0) {
      // Get read status for private conversations
      const { data: lettiPrivati } = await supabase
        .from("messaggi_privati_letti")
        .select("conversazione_id, ultimo_letto")
        .eq("user_id", user.id);
      console.log("📞 Stato lettura privati:", lettiPrivati);
      const mapLettiPrivati = new Map(lettiPrivati?.map(l => [l.conversazione_id, l.ultimo_letto]) || []);

      // Get other user profiles
      const otherUserIds = convPrivate.map(c =>
        c.acquirente_id === user.id ? c.venditore_id : c.acquirente_id
      ).filter(Boolean) as string[];

      const { data: profili } = otherUserIds.length > 0
        ? await supabase.from("profiles").select("user_id, nome, cognome").in("user_id", otherUserIds)
        : { data: [] as { user_id: string; nome: string | null; cognome: string | null }[] };
      const profMap = new Map((profili || []).map(p => [p.user_id, p] as const));

      await Promise.all(convPrivate.map(async (conv) => {
        const ultimoLetto = mapLettiPrivati.get(conv.id) || new Date(0).toISOString();

        const { count } = await supabase
          .from("messaggi_privati")
          .select("*", { count: "exact", head: true })
          .eq("conversazione_id", conv.id)
          .neq("mittente_id", user.id)
          .gt("created_at", ultimoLetto);

        const nonLetti = count || 0;
        console.log(`💬 Conversazione ID: ${conv.id} non letti = ${nonLetti} (ultimoLetto: ${ultimoLetto})`);
        totale += nonLetti;

        if (nonLetti > 0) {
          const otherId = conv.acquirente_id === user.id ? conv.venditore_id : conv.acquirente_id;
          const prof = profMap.get(otherId || "");
          const nomeAltro = prof
            ? `${prof.nome || ""}${prof.cognome ? ` ${prof.cognome[0]}.` : ""}`.trim() || "Utente"
            : "Utente";

          // Get latest message
          const { data: ultimo } = await supabase
            .from("messaggi_privati")
            .select("testo, mittente_id, created_at")
            .eq("conversazione_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          risultati.push({
            id: conv.id,
            nome: nomeAltro,
            count: nonLetti,
            ultimoMessaggio: ultimo?.testo || conv.ultimo_messaggio || "",
            ultimoMittente: nomeAltro,
            ultimoTimestamp: ultimo?.created_at || conv.ultimo_aggiornamento || "",
            tipo: "privata",
          });
        }
      }));
    }

    // === NOTIFICHE GENERALI (like, commenti, moderazione) ===
    const { data: notificheDb } = await supabase
      .from("notifiche")
      .select("*")
      .eq("user_id", user.id)
      .eq("letta", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (notificheDb && notificheDb.length > 0) {
      totale += notificheDb.length;
      notificheDb.forEach((n: any) => {
        risultati.push({
          id: n.id,
          nome: n.titolo || "Notifica",
          count: 1,
          ultimoMessaggio: n.messaggio,
          ultimoTimestamp: n.created_at,
          tipo: "notifica",
          notificaTipo: n.tipo,
          link: n.link,
        });
      });
    }

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
      .channel("pannello-notifiche-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gruppi_messaggi" }, () => {
        caricaNotifiche();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_letti", filter: `user_id=eq.${user.id}` }, () => {
        caricaNotifiche();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messaggi_privati" }, () => {
        caricaNotifiche();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_privati_letti", filter: `user_id=eq.${user.id}` }, () => {
        caricaNotifiche();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifiche", filter: `user_id=eq.${user.id}` }, () => {
        caricaNotifiche();
      })
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
    if (n.tipo === "notifica") {
      // Mark as read
      await supabase.from("notifiche").update({ letta: true } as any).eq("id", n.id);
      caricaNotifiche();
      if (n.link) navigate(n.link);
    } else if (n.tipo === "gruppo") {
      navigate(`/gruppo/${n.id}`);
    } else {
      navigate(`/chat/${n.id}`);
    }
  };

  const getNotificaIcon = (tipo?: string) => {
    switch (tipo) {
      case "like_annuncio": return <Heart className="w-4 h-4 text-rose-500" />;
      case "commento_annuncio": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "approvato": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "rifiutato": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) caricaNotifiche(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
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
                    key={`${n.tipo}-${n.id}`}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {n.tipo === "notifica" ? getNotificaIcon(n.notificaTipo) : n.tipo === "gruppo" ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{n.nome}</span>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded shrink-0">
                            {n.tipo === "gruppo" ? "Gruppo" : n.tipo === "privata" ? "Chat" : "Avviso"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.ultimoTimestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {n.tipo === "gruppo" && <><span className="font-medium">{n.ultimoMittente}:</span> </>}
                        {n.ultimoMessaggio}
                      </p>
                    </div>
                    {n.tipo !== "notifica" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 h-5 shrink-0 mt-1">
                        {n.count}
                      </Badge>
                    )}
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
