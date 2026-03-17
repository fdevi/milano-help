import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppSidebar from "@/components/AppSidebar";
import TopNavbar from "@/components/TopNavbar";
import FeedCard, { FeedItem, FeedItemType } from "@/components/feed/FeedCard";
import { Loader2, Rss } from "lucide-react";

const PAGE_SIZE = 100;
const ADMIN_USER_ID = "51aeacbc-1497-440c-8edb-23845ce077d3";
const ADMIN_PROFILE = {
  user_id: ADMIN_USER_ID,
  nome: "Admin",
  cognome: "MilanoHelp",
  avatar_url: "/logo/logo-192.png",
  quartiere: "Milano",
};

const Bacheca = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Cache membership dates for filtering group posts
  const membershipDatesRef = useRef<Map<string, string>>(new Map());

  const fetchFeed = useCallback(async (startOffset: number) => {
    if (!user) return [];

    // Step 1: Fetch user's group memberships to filter posts by join date
    const { data: memberships } = await supabase
      .from("gruppi_membri")
      .select("gruppo_id, created_at")
      .eq("user_id", user.id)
      .eq("stato", "approvato");

    const memberMap = new Map<string, string>();
    (memberships || []).forEach((m) => memberMap.set(m.gruppo_id, m.created_at));
    membershipDatesRef.current = memberMap;

    // Step 2: Fetch all sources in parallel
    const [annunciRes, eventiRes, gruppiMsgRes] = await Promise.all([
      supabase
        .from("annunci")
        .select("id, titolo, descrizione, immagini, created_at, user_id, stato, quartiere, categoria_attivita, categoria_id, categorie_annunci(label, nome), mi_piace")
        .eq("stato", "attivo")
        .order("created_at", { ascending: false })
        .range(0, 49),

      supabase
        .from("eventi")
        .select("id, titolo, descrizione, immagine, created_at, organizzatore_id, stato, luogo, mi_piace, fonte_esterna, data")
        .eq("stato", "attivo")
        .order("created_at", { ascending: false })
        .range(0, 19),

      supabase
        .from("gruppi_messaggi")
        .select("id, testo, immagini, created_at, mittente_id, gruppo_id, parent_id")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .range(0, 29),
    ]);

    const annunci = annunciRes.data || [];
    const eventi = eventiRes.data || [];
    // Filter group messages: only those posted after the user joined
    const gruppiMsg = (gruppiMsgRes.data || []).filter((m) => {
      const joinDate = memberMap.get(m.gruppo_id);
      if (!joinDate) return false; // user is not a member
      return new Date(m.created_at) >= new Date(joinDate);
    });

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
        likes_count: a.mi_piace ?? 0,
      });
    });

    eventi.forEach((e) => {
      // Use Admin profile for imported events
      const isImported = !!(e as any).fonte_esterna;
      const authorProfile = isImported ? ADMIN_PROFILE : (profileMap.get(e.organizzatore_id) || null);
      feedItems.push({
        id: e.id,
        type: "evento",
        title: e.titolo,
        text: e.descrizione,
        images: e.immagine ? [e.immagine] : [],
        created_at: e.created_at!,
        author: authorProfile,
        link: `/evento/${e.id}`,
        likes_count: e.mi_piace ?? 0,
        data: e.data,
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
        likes_count: 0,
      });
    });

    // Sort by created_at desc and limit
    feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return feedItems.slice(startOffset, startOffset + PAGE_SIZE);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchFeed(0).then((result) => {
      setItems(result);
      setHasMore(result.length >= PAGE_SIZE);
      setOffset(result.length);
      setLoading(false);
    });
  }, [user, fetchFeed]);

  // Realtime subscriptions with visibility-change reconnection
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const createChannel = () => {
      channel = supabase
        .channel("bacheca-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "annunci" },
          async (payload) => {
            const a = payload.new as any;
            if (a.stato !== "attivo") return;
            const [catRes, profRes] = await Promise.all([
              a.categoria_id
                ? supabase.from("categorie_annunci").select("label, nome").eq("id", a.categoria_id).single()
                : Promise.resolve({ data: null }),
              supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").eq("user_id", a.user_id).single(),
            ]);
            let type: FeedItemType = "annuncio";
            const cat = (a.categoria_attivita || "").toLowerCase();
            if (cat.includes("negozio") || cat.includes("negozi")) type = "negozio";
            else if (cat.includes("professionista") || cat.includes("professionisti")) type = "professionista";
            const newItem: FeedItem = {
              id: a.id,
              type,
              title: a.titolo,
              text: a.descrizione,
              images: a.immagini || [],
              created_at: a.created_at,
              author: profRes.data || null,
              link: `/annuncio/${a.id}`,
              categoria_label: type === "annuncio" ? catRes.data?.label || null : null,
              categoria_nome: type === "annuncio" ? catRes.data?.nome || null : null,
              likes_count: 0,
            };
            setItems((prev) => [newItem, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "eventi" },
          async (payload) => {
            const e = payload.new as any;
            if (e.stato !== "attivo") return;
            const isImported = !!e.fonte_esterna;
            let authorProfile = ADMIN_PROFILE;
            if (!isImported) {
              const { data: prof } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").eq("user_id", e.organizzatore_id).single();
              authorProfile = prof || ADMIN_PROFILE;
            }
            const newItem: FeedItem = {
              id: e.id,
              type: "evento",
              title: e.titolo,
              text: e.descrizione,
              images: e.immagine ? [e.immagine] : [],
              created_at: e.created_at,
              author: authorProfile,
              link: `/evento/${e.id}`,
              likes_count: 0,
              data: e.data,
            };
            setItems((prev) => [newItem, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "gruppi_messaggi" },
          async (payload) => {
            const m = payload.new as any;
            if (m.parent_id) return;
            const joinDate = membershipDatesRef.current.get(m.gruppo_id);
            if (!joinDate || new Date(m.created_at) < new Date(joinDate)) return;
            const [profRes, gruppoRes] = await Promise.all([
              supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").eq("user_id", m.mittente_id).single(),
              supabase.from("gruppi").select("id, nome").eq("id", m.gruppo_id).single(),
            ]);
            const newItem: FeedItem = {
              id: m.id,
              type: "post_gruppo",
              title: null,
              text: m.testo,
              images: m.immagini || [],
              created_at: m.created_at,
              author: profRes.data || null,
              gruppo_nome: gruppoRes.data?.nome || "Gruppo",
              gruppo_id: m.gruppo_id,
              link: `/gruppo/${m.gruppo_id}?message=${m.id}`,
              likes_count: 0,
            };
            setItems((prev) => [newItem, ...prev]);
          }
        )
        .subscribe();
    };

    createChannel();

    // Re-establish realtime when app comes back to foreground (mobile)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (channel) {
          supabase.removeChannel(channel);
        }
        createChannel();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchFeed(offset).then((more) => {
            setItems((prev) => [...prev, ...more]);
            setHasMore(more.length >= PAGE_SIZE);
            setOffset((prev) => prev + more.length);
            setLoadingMore(false);
          });
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, fetchFeed]);

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
                  <FeedCard key={`${item.type}-${item.id}`} item={item} currentUserId={user?.id} />
                ))}

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
