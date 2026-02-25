import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ChatPreview {
  id: string;
  tipo: "gruppo" | "privata";
  nome: string;
  mittente: string;
  testo: string;
  timestamp: string;
  targetUrl: string;
  conversazioneId: string;
  unreadCount: number;
}

const DropdownChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [totale, setTotale] = useState(0);
  const [previews, setPreviews] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!user) { setTotale(0); setPreviews([]); return; }
    setLoading(true);

    const allPreviews: ChatPreview[] = [];
    let totalUnread = 0;

    try {
      // === Group messages ===
      const { data: membri } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id")
        .eq("user_id", user.id)
        .eq("stato", "approvato");

      const gruppiIds = (membri || []).map(m => m.gruppo_id);

      if (gruppiIds.length > 0) {
        const [{ data: letti }, { data: gruppi }] = await Promise.all([
          supabase.from("messaggi_letti").select("gruppo_id, ultimo_letto").eq("user_id", user.id),
          supabase.from("gruppi").select("id, nome").in("id", gruppiIds),
        ]);
        const mapLetti = new Map((letti || []).map(l => [l.gruppo_id, l.ultimo_letto]));
        const mapGruppi = new Map((gruppi || []).map(g => [g.id, g.nome]));

        await Promise.all(gruppiIds.map(async (gid) => {
          const ultimoLetto = mapLetti.get(gid) || new Date(0).toISOString();

          const { data: msgs, count } = await supabase
            .from("gruppi_messaggi")
            .select("*", { count: "exact" })
            .eq("gruppo_id", gid)
            .neq("mittente_id", user.id)
            .gt("created_at", ultimoLetto)
            .order("created_at", { ascending: false })
            .limit(1);

          if (count && count > 0 && msgs && msgs.length > 0) {
            const msg = msgs[0];
            const { data: profilo } = await supabase
              .from("profiles")
              .select("nome, cognome")
              .eq("user_id", msg.mittente_id)
              .single();
            const mittNome = profilo ? `${profilo.nome || ""} ${profilo.cognome || ""}`.trim() || "Utente" : "Utente";
            totalUnread += count;
            allPreviews.push({
              id: `g-${gid}`,
              tipo: "gruppo",
              nome: mapGruppi.get(gid) || "Gruppo",
              mittente: mittNome,
              testo: msg.testo?.substring(0, 60) || "",
              timestamp: msg.created_at,
              targetUrl: `/gruppo/${gid}`,
              conversazioneId: gid,
              unreadCount: count,
            });
          }
        }));
      }

      // === Private messages ===
      const { data: convPrivate } = await supabase
        .from("conversazioni_private")
        .select("id, acquirente_id, venditore_id, annuncio_id")
        .or(`acquirente_id.eq.${user.id},venditore_id.eq.${user.id}`);

      if (convPrivate && convPrivate.length > 0) {
        const { data: lettiPrivati } = await supabase
          .from("messaggi_privati_letti")
          .select("conversazione_id, ultimo_letto")
          .eq("user_id", user.id);
        const mapLettiPriv = new Map((lettiPrivati || []).map(l => [l.conversazione_id, l.ultimo_letto]));

        const otherUserIds = convPrivate.map(c =>
          c.acquirente_id === user.id ? c.venditore_id : c.acquirente_id
        ).filter(Boolean) as string[];

        const { data: profiles } = otherUserIds.length > 0
          ? await supabase.from("profiles").select("user_id, nome, cognome").in("user_id", otherUserIds)
          : { data: [] };
        const mapProfiles = new Map((profiles || []).map(p => [p.user_id, p]));

        await Promise.all(convPrivate.map(async (conv) => {
          const ultimoLetto = mapLettiPriv.get(conv.id) || new Date(0).toISOString();

          const { data: msgs, count } = await supabase
            .from("messaggi_privati")
            .select("*", { count: "exact" })
            .eq("conversazione_id", conv.id)
            .neq("mittente_id", user.id)
            .gt("created_at", ultimoLetto)
            .order("created_at", { ascending: false })
            .limit(1);

          if (count && count > 0 && msgs && msgs.length > 0) {
            const msg = msgs[0];
            const otherUserId = conv.acquirente_id === user.id ? conv.venditore_id : conv.acquirente_id;
            const prof = otherUserId ? mapProfiles.get(otherUserId) : null;
            const nomeAltro = prof ? `${prof.nome || ""} ${prof.cognome || ""}`.trim() || "Utente" : "Utente";

            totalUnread += count;
            allPreviews.push({
              id: `p-${conv.id}`,
              tipo: "privata",
              nome: nomeAltro,
              mittente: nomeAltro,
              testo: msg.testo?.substring(0, 60) || "",
              timestamp: msg.created_at || "",
              targetUrl: `/chat?conv=${conv.id}`,
              conversazioneId: conv.id,
              unreadCount: count,
            });
          }
        }));
      }
    } catch (err) {
      console.error("DropdownChat fetchUnread error:", err);
    }

    allPreviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setPreviews(allPreviews);
    setTotale(totalUnread);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUnread();

    const channel = supabase
      .channel("dropdown-chat-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gruppi_messaggi" }, () => fetchUnread())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messaggi_privati" }, () => fetchUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_letti", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_privati_letti", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUnread]);

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  };

  const handleClick = async (item: ChatPreview) => {
    setOpen(false);

    if (item.tipo === "gruppo") {
      await supabase.from("messaggi_letti").upsert({
        user_id: user!.id,
        gruppo_id: item.conversazioneId,
        ultimo_letto: new Date().toISOString(),
      } as any, { onConflict: "user_id,gruppo_id" });
    } else {
      await supabase.from("messaggi_privati_letti").upsert({
        user_id: user!.id,
        conversazione_id: item.conversazioneId,
        ultimo_letto: new Date().toISOString(),
      } as any, { onConflict: "user_id,conversazione_id" });
    }

    fetchUnread();
    navigate(item.targetUrl);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchUnread(); }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
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
            <h3 className="font-heading font-bold text-sm text-foreground">Messaggi</h3>
            {totale > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {totale} non {totale === 1 ? "letto" : "letti"}
              </Badge>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Caricamento...</div>
            ) : previews.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nessun messaggio non letto
              </div>
            ) : (
              <div className="divide-y divide-border">
                {previews.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {item.tipo === "gruppo"
                          ? <Users className="w-4 h-4" />
                          : <MessageCircle className="w-4 h-4" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{item.nome}</span>
                          <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded shrink-0">
                            {item.tipo === "gruppo" ? "Gruppo" : "Privata"}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(item.timestamp)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="font-medium">{item.mittente}:</span> {item.testo}
                      </p>
                      {item.unreadCount > 1 && (
                        <Badge variant="destructive" className="mt-1 text-[9px] px-1.5 py-0 h-3.5">
                          {item.unreadCount} messaggi
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border px-4 py-2">
            <button
              onClick={() => { setOpen(false); navigate("/chat"); }}
              className="w-full text-center text-xs text-primary hover:underline font-medium"
            >
              Vedi tutte le conversazioni
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownChat;
