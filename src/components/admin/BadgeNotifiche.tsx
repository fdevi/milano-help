import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  tipo: "moderazione" | "eventi";
}

const BadgeNotifiche = ({ tipo }: Props) => {
  const [count, setCount] = useState(0);

  const table = tipo === "moderazione" ? "annunci" : "eventi";

  const fetchCount = async () => {
    const { count: c } = await (supabase as any)
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_moderazione");
    setCount(c || 0);
  };

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel(`badge-${tipo}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fetchCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tipo]);

  if (count === 0) return null;

  return (
    <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
      {count}
    </span>
  );
};

export default BadgeNotifiche;
