import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BadgeChat = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchUnread = async () => {
    if (!user) { setCount(0); return; }

    let totale = 0;

    // === Group messages ===
    const { data: membri } = await supabase
      .from("gruppi_membri")
      .select("gruppo_id")
      .eq("user_id", user.id)
      .eq("stato", "approvato");

    const gruppiIds = membri?.map(m => m.gruppo_id) || [];

    if (gruppiIds.length > 0) {
      const { data: letti } = await supabase
        .from("messaggi_letti")
        .select("gruppo_id, ultimo_letto")
        .eq("user_id", user.id);
      const mapLetti = new Map(letti?.map(l => [l.gruppo_id, l.ultimo_letto]) || []);

      await Promise.all(gruppiIds.map(async (gid) => {
        const ultimoLetto = mapLetti.get(gid) || new Date(0).toISOString();
        const { count: c } = await supabase
          .from("gruppi_messaggi")
          .select("*", { count: "exact", head: true })
          .eq("gruppo_id", gid)
          .gt("created_at", ultimoLetto);
        totale += c || 0;
      }));
    }

    // === Private messages ===
    const { data: convPrivate } = await supabase
      .from("conversazioni_private")
      .select("id")
      .or(`acquirente_id.eq.${user.id},venditore_id.eq.${user.id}`);

    if (convPrivate && convPrivate.length > 0) {
      const { data: lettiPrivati } = await supabase
        .from("messaggi_privati_letti")
        .select("conversazione_id, ultimo_letto")
        .eq("user_id", user.id);
      const mapLetti = new Map(lettiPrivati?.map(l => [l.conversazione_id, l.ultimo_letto]) || []);

      await Promise.all(convPrivate.map(async (conv) => {
        const ultimoLetto = mapLetti.get(conv.id) || new Date(0).toISOString();
        const { count: c } = await supabase
          .from("messaggi_privati")
          .select("*", { count: "exact", head: true })
          .eq("conversazione_id", conv.id)
          .neq("mittente_id", user.id)
          .gt("created_at", ultimoLetto);
        totale += c || 0;
      }));
    }

    setCount(totale);
  };

  useEffect(() => {
    if (!user) return;
    fetchUnread();

    const channel = supabase
      .channel("badge-chat-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gruppi_messaggi" }, () => fetchUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_letti", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messaggi_privati" }, () => fetchUnread())
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_privati_letti", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <Link to="/chat" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
      <MessageCircle className="w-5 h-5 text-muted-foreground" />
      {count > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-0.5 -right-0.5 px-1 py-0 text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center"
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
};

export default BadgeChat;
