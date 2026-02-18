import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Share2, MoreHorizontal, MapPin, ThumbsUp, Loader2, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

interface PostData {
  id: string;
  titolo: string;
  descrizione: string | null;
  prezzo: number | null;
  immagini: string[] | null;
  created_at: string;
  user_id: string;
  quartiere: string | null;
  // joined
  autore_nome: string;
  autore_cognome: string;
  autore_avatar: string | null;
  autore_quartiere: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

async function fetchPosts({ pageParam = 0, userId }: { pageParam: number; userId: string }) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: annunci, error } = await supabase
    .from("annunci")
    .select("id, titolo, descrizione, prezzo, immagini, created_at, user_id, quartiere")
    .eq("stato", "attivo")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!annunci || annunci.length === 0) return { posts: [], nextPage: undefined };

  // Fetch profiles for authors
  const userIds = [...new Set(annunci.map((a) => a.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, nome, cognome, avatar_url, quartiere")
    .in("user_id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  // Fetch like counts
  const annunciIds = annunci.map((a) => a.id);
  const { data: likeCounts } = await supabase
    .from("annunci_mi_piace")
    .select("annuncio_id")
    .in("annuncio_id", annunciIds);

  const likeMap = new Map<string, number>();
  (likeCounts || []).forEach((l) => {
    likeMap.set(l.annuncio_id, (likeMap.get(l.annuncio_id) || 0) + 1);
  });

  // Fetch comment counts
  const { data: commentCounts } = await supabase
    .from("annunci_commenti")
    .select("annuncio_id")
    .in("annuncio_id", annunciIds);

  const commentMap = new Map<string, number>();
  (commentCounts || []).forEach((c) => {
    commentMap.set(c.annuncio_id, (commentMap.get(c.annuncio_id) || 0) + 1);
  });

  // Fetch my likes
  const { data: myLikes } = await supabase
    .from("annunci_mi_piace")
    .select("annuncio_id")
    .eq("user_id", userId)
    .in("annuncio_id", annunciIds);

  const myLikeSet = new Set((myLikes || []).map((l) => l.annuncio_id));

  const posts: PostData[] = annunci.map((a) => {
    const p = profileMap.get(a.user_id);
    return {
      ...a,
      autore_nome: p?.nome || "",
      autore_cognome: p?.cognome || "",
      autore_avatar: p?.avatar_url || null,
      autore_quartiere: p?.quartiere || a.quartiere || null,
      like_count: likeMap.get(a.id) || 0,
      comment_count: commentMap.get(a.id) || 0,
      liked_by_me: myLikeSet.has(a.id),
    };
  });

  return {
    posts,
    nextPage: annunci.length === PAGE_SIZE ? pageParam + 1 : undefined,
  };
}

const PostCard = ({ post }: { post: PostData }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const initials = `${(post.autore_nome || "U")[0]}${(post.autore_cognome || "")[0]}`.toUpperCase();
  const displayName = post.autore_nome
    ? `${post.autore_nome}${post.autore_cognome ? ` ${post.autore_cognome[0]}.` : ""}`
    : "Utente";

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it });

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));

    if (newLiked) {
      const { error } = await supabase
        .from("annunci_mi_piace")
        .insert({ annuncio_id: post.id, user_id: user.id });
      if (error) {
        setLiked(!newLiked);
        setLikeCount((c) => c + (newLiked ? -1 : 1));
      }
    } else {
      const { error } = await supabase
        .from("annunci_mi_piace")
        .delete()
        .eq("annuncio_id", post.id)
        .eq("user_id", user.id);
      if (error) {
        setLiked(!newLiked);
        setLikeCount((c) => c + (newLiked ? -1 : 1));
      }
    }
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.autore_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <span className="font-heading font-bold text-sm text-foreground">{displayName}</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {post.autore_quartiere && (
              <>
                <MapPin className="w-3 h-3" />
                <span>{post.autore_quartiere}</span>
                <span>·</span>
              </>
            )}
            <span>{timeAgo}</span>
          </div>
        </div>
        <button className="p-1 rounded hover:bg-muted transition-colors">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <Link to={`/annuncio/${post.id}`} className="hover:underline">
          <h3 className="font-heading font-bold text-foreground mb-1">{post.titolo}</h3>
        </Link>
        {post.descrizione && (
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{post.descrizione}</p>
        )}
        {post.prezzo != null && post.prezzo > 0 && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm">
            €{post.prezzo.toFixed(2)}
          </span>
        )}
      </div>

      {/* Images */}
      {post.immagini && post.immagini.length > 0 && (
        <div className="px-4 pb-3">
          {post.immagini.length === 1 ? (
            <img
              src={post.immagini[0]}
              alt={post.titolo}
              className="rounded-lg w-full h-64 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="grid grid-cols-2 gap-1.5 rounded-lg overflow-hidden">
              {post.immagini.slice(0, 4).map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="w-full h-40 object-cover" loading="lazy" />
                  {i === 3 && post.immagini!.length > 4 && (
                    <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                      <span className="text-background font-bold text-lg">+{post.immagini!.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-primary" /> {likeCount}
        </span>
        <span>{post.comment_count} commenti</span>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-around p-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground"}`}
          onClick={toggleLike}
        >
          <ThumbsUp className={`w-4 h-4 ${liked ? "fill-primary" : ""}`} />
          Mi piace
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs text-muted-foreground" asChild>
          <Link to={`/annuncio/${post.id}`}>
            <MessageCircle className="w-4 h-4" />
            Commenta
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs text-muted-foreground">
          <Share2 className="w-4 h-4" />
          Condividi
        </Button>
      </div>
    </Card>
  );
};

const PostSkeleton = () => (
  <Card className="p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-48 w-full rounded-lg" />
  </Card>
);

const Home = () => {
  const { user } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["home-feed", user?.id],
    queryFn: ({ pageParam }) => fetchPosts({ pageParam: pageParam as number, userId: user!.id }),
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

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flatMap((p) => p.posts) || [];

  return (
    <AuthLayout>
      {/* Composer placeholder */}
      <Card className="p-4 mb-6 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">U</AvatarFallback>
          </Avatar>
          <Link
            to="/nuovo-annuncio"
            className="flex-1 bg-muted/50 rounded-full px-4 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
          >
            Cosa succede nel tuo quartiere?
          </Link>
        </div>
      </Card>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Errore nel caricamento del feed. Riprova più tardi.</p>
        </Card>
      ) : allPosts.length === 0 ? (
        <Card className="p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nessun annuncio disponibile</p>
          <p className="text-sm text-muted-foreground mt-1">Sii il primo a pubblicare qualcosa!</p>
          <Button variant="hero" size="sm" className="mt-4" asChild>
            <Link to="/nuovo-annuncio">Pubblica un annuncio</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {allPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="py-6 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-xs text-muted-foreground">Hai visto tutti gli annunci</p>
        )}
      </div>
    </AuthLayout>
  );
};

export default Home;
