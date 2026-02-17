import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUnreadCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    if (!user) { setCount(0); return; }

    // Count unread private messages
    const { count: privateCount } = await supabase
      .from("messaggi")
      .select("*", { count: "exact", head: true })
      .eq("letto", false)
      .neq("mittente_id", user.id);

    // Count unread group messages (messages in groups user is member of, not sent by user)
    // We approximate by checking gruppi_messaggi created after last read
    // For simplicity, we just count private unread for now
    setCount(privateCount || 0);
  };

  useEffect(() => {
    fetchCount();

    if (!user) return;

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel("unread-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messaggi" },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
};
