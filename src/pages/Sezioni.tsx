import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, ImageIcon, SlidersHorizontal, Tag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "react-router-dom";

const PAGE_SIZE = 12;

interface AnnuncioCard {
  id: string;
  titolo: string;
  descrizione: string | null;
  prezzo: number | null;
  immagini: string[] | null;
  created_at: string;
  quartiere: string | null;
  stato: string;
  user_id: string;
  categoria_nome: string | null;
  categoria_label: string | null;
}

type TabValue = "tutti" | "miei" | "salvati";

const DISTANCE_OPTIONS = [
  { label: "1 km", value: "1" },
  { label: "3 km", value: "3" },
  { label: "5 km", value: "5" },
  { label: "Tutta Milano", value: "all" },
];

async function fetchAnnunci({
  pageParam = 0,
  userId,
  tab,
  categoriaId,
}: {
  pageParam: number;
  userId: string;
  tab: TabValue;
  categoriaId: string | null;
}) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("annunci")
    .select("id, titolo, descrizione, prezzo, immagini, created_at, quartiere, stato, user_id, categoria_id")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (tab === "miei") {
    query = query.eq("user_id", userId);
  } else if (tab === "salvati") {
    // Fetch liked annunci ids first – handled separately
    const { data: likes } = await supabase
      .from("annunci_mi_piace")
      .select("annuncio_id")
      .eq("user_id", userId);
    const likedIds = (likes || []).map((l) => l.annuncio_id);
    if (likedIds.length === 0) return { items: [], nextPage: undefined };
    query = query.in("id", likedIds).eq("stato", "attivo");
  } else {
    query = query.eq("stato", "attivo");
  }

  if (categoriaId) {
    query = query.eq("categoria_id", categoriaId);
  }

  const { data: annunci, error } = await query;
  if (error) throw error;
  if (!annunci || annunci.length === 0) return { items: [], nextPage: undefined };

  // Fetch categories for labels
  const catIds = [...new Set(annunci.map((a) => a.categoria_id).filter(Boolean))] as string[];
  const { data: categorie } = catIds.length > 0
    ? await supabase.from("categorie_annunci").select("id, nome, label").in("id", catIds)
    : { data: [] };
  const catMap = new Map((categorie || []).map((c) => [c.id, c]));

  const items: AnnuncioCard[] = annunci.map((a) => {
    const cat = a.categoria_id ? catMap.get(a.categoria_id) : null;
    return {
      id: a.id,
      titolo: a.titolo,
      descrizione: a.descrizione,
      prezzo: a.prezzo,
      immagini: a.immagini,
      created_at: a.created_at,
      quartiere: a.quartiere,
      stato: a.stato,
      user_id: a.user_id,
      categoria_nome: cat?.nome || null,
      categoria_label: cat?.label || null,
    };
  });

  return {
    items,
    nextPage: annunci.length === PAGE_SIZE ? pageParam + 1 : undefined,
  };
}

const AnnuncioCardComponent = ({ annuncio }: { annuncio: AnnuncioCard }) => {
  const coverImage = annuncio.immagini && annuncio.immagini.length > 0 ? annuncio.immagini[0] : null;
  const timeAgo = formatDistanceToNow(new Date(annuncio.created_at), { addSuffix: true, locale: it });

  const statoBadge = annuncio.stato !== "attivo" ? (
    <Badge
      variant={annuncio.stato === "in_moderazione" ? "secondary" : "destructive"}
      className="absolute top-2 left-2 text-[10px]"
    >
      {annuncio.stato === "in_moderazione" ? "In moderazione" : annuncio.stato}
    </Badge>
  ) : null;

  return (
    <Link to={`/annuncio/${annuncio.id}`}>
      <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted">
          {coverImage ? (
            <img src={coverImage} alt={annuncio.titolo} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          {statoBadge}
          {annuncio.categoria_label && (
            <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px]">
              {annuncio.categoria_label}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col gap-1.5">
          <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2 leading-tight">
            {annuncio.titolo}
          </h3>

          {annuncio.prezzo != null && annuncio.prezzo > 0 && (
            <span className="font-heading font-bold text-primary text-base">
              €{annuncio.prezzo.toFixed(2)}
            </span>
          )}
          {annuncio.prezzo === 0 && (
            <span className="font-heading font-bold text-primary text-base">Gratis</span>
          )}

          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-1">
            {annuncio.quartiere && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {annuncio.quartiere}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

const CardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-full" />
    </div>
  </Card>
);

const Sezioni = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>("tutti");
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);
  const [selectedDistance, setSelectedDistance] = useState("all");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Fetch categories
  const { data: categorie } = useQuery({
    queryKey: ["categorie-annunci"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("id, nome, label, icona")
        .order("ordine", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Reset filters on tab change
  const handleTabChange = (val: string) => {
    setActiveTab(val as TabValue);
    setSelectedCategoria(null);
    setSelectedDistance("all");
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["sezioni-feed", user?.id, activeTab, selectedCategoria],
    queryFn: ({ pageParam }) =>
      fetchAnnunci({
        pageParam: pageParam as number,
        userId: user!.id,
        tab: activeTab,
        categoriaId: selectedCategoria,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
  });

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((p) => p.items) || [];

  return (
    <AuthLayout>
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Sezioni</h1>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="tutti" className="flex-1 sm:flex-initial">Tutti gli annunci</TabsTrigger>
            <TabsTrigger value="miei" className="flex-1 sm:flex-initial">I miei annunci</TabsTrigger>
            <TabsTrigger value="salvati" className="flex-1 sm:flex-initial">Annunci salvati</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            <button
              onClick={() => setSelectedCategoria(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategoria === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Tutte
            </button>
            {(categorie || []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(selectedCategoria === cat.id ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategoria === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Distance pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            {DISTANCE_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDistance(d.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedDistance === d.value
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d.label}
              </button>
            ))}

            {/* Advanced filters button */}
            <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtri
            </button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Errore nel caricamento degli annunci. Riprova più tardi.</p>
          </Card>
        ) : allItems.length === 0 ? (
          <Card className="p-8 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {activeTab === "miei"
                ? "Non hai ancora pubblicato annunci"
                : activeTab === "salvati"
                ? "Non hai ancora salvato annunci"
                : "Nessun annuncio trovato"}
            </p>
            {activeTab !== "salvati" && (
              <Button variant="default" size="sm" className="mt-4" asChild>
                <Link to="/nuovo-annuncio">Pubblica un annuncio</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <AnnuncioCardComponent annuncio={item} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isFetchingNextPage && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
          {!hasNextPage && allItems.length > 0 && (
            <p className="text-xs text-muted-foreground">Hai visto tutti gli annunci</p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};

export default Sezioni;
