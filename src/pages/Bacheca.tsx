import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "@/components/AppSidebar";
import TopNavbar from "@/components/TopNavbar";
import FeedCard, { FeedItem, FeedItemType } from "@/components/feed/FeedCard";
import { Button } from "@/components/ui/button";
import { Loader2, Rss } from "lucide-react";

const PAGE_SIZE = 100;

const Bacheca = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (startOffset: number) => {
    if (!user) return [];

    // Fetch all sources in parallel
    const [annunciRes, eventiRes, gruppiMsgRes, profilesCache, gruppiCache] = await Promise.all([
      // Annunci (includes negozi & professionisti via categoria)
      supabase
        .from("annunci")
        .select("id, titolo, descrizione, immagini, created_at, user_id, stato, quartiere, categoria_attivita, categoria_id, categorie_annunci(label, nome)")
        .eq("stato", "attivo")
        .order("created_at", { ascending: false })
        .range(0, 49),

      // Eventi
      supabase
        .from("eventi")
        .select("id, titolo, descrizione, immagine, created_at, organizzatore_id, stato, luogo")
        .eq("stato", "attivo")
        .order("created_at", { ascending: false })
        .range(0, 19),

      // Group posts from user's groups
      supabase
        .from("gruppi_messaggi")
        .select("id, testo, immagini, created_at, mittente_id, gruppo_id, parent_id")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .range(0, 29),

      // Will resolve profiles later
      Promise.resolve(null),
      // Will resolve group names later
      Promise.resolve(null),
    ]);

    const annunci = annunciRes.data || [];
    const eventi = eventiRes.data || [];
    const gruppiMsg = gruppiMsgRes.data || [];

    // Collect user IDs for profile lookup
    const userIds = new Set<string>();
    annunci.forEach((a) => userIds.add(a.user_id));
    eventi.forEach((e) => userIds.add(e.organizzatore_id));
    gruppiMsg.forEach((m) => userIds.add(m.mittente_id));

    // Collect gruppo IDs
    const gruppoIds = new Set<string>();
    gruppiMsg.forEach((m) => gruppoIds.add(m.gruppo_id));

    // Fetch profiles and groups in parallel
    const [profilesRes, gruppiRes] = await Promise.all([
      userIds.size > 0
        ? supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").in("user_id", Array.from(userIds))
        : Promise.resolve({ data: [] }),
      gruppoIds.size > 0
        ? supabase.from("gruppi").select("id, nome").in("id", Array.from(gruppoIds))
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map<string, any>();
    (profilesRes.data || []).forEach((p) => profileMap.set(p.user_id, p));
    const gruppoMap = new Map<string, string>();
    (gruppiRes.data || []).forEach((g) => gruppoMap.set(g.id, g.nome));

    // Map to FeedItem[]
    const feedItems: FeedItem[] = [];

    annunci.forEach((a) => {
      let type: FeedItemType = "annuncio";
      const cat = (a.categoria_attivita || "").toLowerCase();
      if (cat.includes("negozio") || cat.includes("negozi")) type = "negozio";
      else if (cat.includes("professionista") || cat.includes("professionisti")) type = "professionista";

      const categoriaLabel = (a as any).categorie_annunci?.label || null;
      const categoriaNome = (a as any).categorie_annunci?.nome || null;

      feedItems.push({
        id: a.id,
        type,
        title: a.titolo,
        text: a.descrizione,
        images: a.immagini || [],
        created_at: a.created_at,
        author: profileMap.get(a.user_id) || null,
        link: `/annuncio/${a.id}`,
        categoria_label: type === "annuncio" ? categoriaLabel : null,
        categoria_nome: type === "annuncio" ? categoriaNome : null,
      });
    });

    eventi.forEach((e) => {
      feedItems.push({
        id: e.id,
        type: "evento",
        title: e.titolo,
        text: e.descrizione,
        images: e.immagine ? [e.immagine] : [],
        created_at: e.created_at!,
        author: profileMap.get(e.organizzatore_id) || null,
        link: `/evento/${e.id}`,
      });
    });

    gruppiMsg.forEach((m) => {
      feedItems.push({
        id: m.id,
        type: "post_gruppo",
        title: null,
        text: m.testo,
        images: m.immagini || [],
        created_at: m.created_at,
        author: profileMap.get(m.mittente_id) || null,
        gruppo_nome: gruppoMap.get(m.gruppo_id) || "Gruppo",
        gruppo_id: m.gruppo_id,
        link: `/gruppo/${m.gruppo_id}?message=${m.id}`,
      });
    });

    // Sort by created_at desc and limit
    feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return feedItems.slice(startOffset, startOffset + PAGE_SIZE);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchFeed(0).then((items) => {
      setItems(items);
      setHasMore(items.length >= PAGE_SIZE);
      setOffset(items.length);
      setLoading(false);
    });
  }, [user, fetchFeed]);

  const loadMore = async () => {
    setLoadingMore(true);
    const more = await fetchFeed(offset);
    setItems((prev) => [...prev, ...more]);
    setHasMore(more.length >= PAGE_SIZE);
    setOffset((prev) => prev + more.length);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 ml-16 lg:ml-56 pt-16">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-6">
              <Rss className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Bacheca</h1>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Rss className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nessun contenuto nella bacheca</p>
                <p className="text-sm mt-1">I nuovi annunci, eventi e post appariranno qui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <FeedCard key={`${item.type}-${item.id}`} item={item} />
                ))}

                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Carica altri
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Bacheca;
