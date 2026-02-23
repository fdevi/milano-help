import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const BadgeNotificheChat = () => {
  const { user } = useAuth();
  const [messaggiNonLetti, setMessaggiNonLetti] = useState(0);

  useEffect(() => {
    if (!user) return;

    const caricaNonLetti = async () => {
      const { data: membri } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id")
        .eq("user_id", user.id)
        .eq("stato", "approvato");

      const gruppiIds = membri?.map(m => m.gruppo_id) || [];
      if (gruppiIds.length === 0) {
        setMessaggiNonLetti(0);
        return;
      }

      const { data: letti } = await supabase
        .from("messaggi_letti")
        .select("gruppo_id, ultimo_letto")
        .eq("user_id", user.id);

      const mapLetti = new Map(letti?.map(l => [l.gruppo_id, l.ultimo_letto]) || []);

      let totale = 0;
      await Promise.all(gruppiIds.map(async (gruppoId) => {
        const ultimoLetto = mapLetti.get(gruppoId) || new Date(0).toISOString();

        const { count } = await supabase
          .from("gruppi_messaggi")
          .select("*", { count: "exact", head: true })
          .eq("gruppo_id", gruppoId)
          .gt("created_at", ultimoLetto);

        totale += count || 0;
      }));

      setMessaggiNonLetti(totale);
    };

    caricaNonLetti();

    const channel = supabase
      .channel("messaggi-non-letti")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gruppi_messaggi" },
        () => caricaNonLetti()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (messaggiNonLetti === 0) return null;

  return (
    <Badge
      variant="destructive"
      className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold min-w-[1.2rem] h-4 flex items-center justify-center"
    >
      {messaggiNonLetti > 99 ? "99+" : messaggiNonLetti}
    </Badge>
  );
};

export default BadgeNotificheChat;
