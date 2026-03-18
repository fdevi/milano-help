import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendPushNotification } from "@/lib/pushNotification";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Trash2, MessageSquare, Reply, X, Smile } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from "emoji-picker-react";
import { useAdminMode } from "@/hooks/useAdminMode";
import { isAdminUser, ADMIN_PROFILE } from "@/lib/adminProfile";

interface Props {
  annuncioId: string;
  annuncioAutoreId: string;
  annuncioTitolo?: string;
}

const CommentiAnnuncio = ({ annuncioId, annuncioAutoreId, annuncioTitolo }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { effectiveUserId, adminMode, isAdmin } = useAdminMode();
  const [testo, setTesto] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; nome: string; testo: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all comments flat, ordered chronologically
  const { data: commenti = [], isLoading } = useQuery({
    queryKey: ["commenti", annuncioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci_commenti")
        .select("*")
        .eq("annuncio_id", annuncioId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const userIds = [...new Set(commenti.map((c: any) => c.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["commenti_profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const commentIds = commenti.map((c: any) => c.id);
  const { data: allLikes = [] } = useQuery({
    queryKey: ["commenti_likes", commentIds.join(",")],
    queryFn: async () => {
      if (commentIds.length === 0) return [];
      const { data } = await supabase
        .from("annunci_commenti_piace")
        .select("*")
        .in("commento_id", commentIds);
      return data || [];
    },
    enabled: commentIds.length > 0,
  });

  const profileMap = Object.fromEntries((profiles as any[]).map((p) => [p.user_id, p]));

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-comment", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nome, cognome").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`commenti-annuncio-${annuncioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "annunci_commenti", filter: `annuncio_id=eq.${annuncioId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["commenti", annuncioId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [annuncioId, queryClient]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commenti.length]);

  const addComment = useMutation({
    mutationFn: async () => {
      const { data: inserted, error } = await supabase.from("annunci_commenti").insert({
        annuncio_id: annuncioId,
        user_id: effectiveUserId(user!.id),
        testo,
        parent_id: replyTo?.id || null,
      } as any).select("id").single();
      if (error) throw error;

      const commentId = inserted?.id;
      const nomeUtente = myProfile ? `${myProfile.nome || "Utente"} ${myProfile.cognome || ""}`.trim() : "Utente";
      const testoTroncato = testo.length > 50 ? testo.slice(0, 50) + "…" : testo;
      const linkBase = `/annuncio/${annuncioId}`;
      const linkWithHash = commentId ? `${linkBase}#comment-${commentId}` : linkBase;

      // Notify annuncio author
      if (user!.id !== annuncioAutoreId) {
        await supabase.from("notifiche").insert({
          user_id: annuncioAutoreId,
          tipo: "commento_annuncio",
          titolo: "Nuovo commento",
          messaggio: `${nomeUtente} ha commentato il tuo annuncio "${annuncioTitolo || ""}": "${testoTroncato}"`,
          link: linkWithHash,
          riferimento_id: annuncioId,
          mittente_id: user!.id,
        } as any);
        sendPushNotification(annuncioAutoreId, "Nuovo commento", `${nomeUtente} ha commentato il tuo annuncio "${annuncioTitolo || ""}": "${testoTroncato}"`, linkWithHash);
      }

      // Notify parent comment author (if replying)
      if (replyTo?.id) {
        const parentComment = commenti.find((c: any) => c.id === replyTo.id);
        if (parentComment && parentComment.user_id !== user!.id) {
          await supabase.from("notifiche").insert({
            user_id: parentComment.user_id,
            tipo: "risposta_commento",
            titolo: "Risposta al tuo commento",
            messaggio: `${nomeUtente} ha risposto al tuo commento: "${testoTroncato}"`,
            link: linkWithHash,
            riferimento_id: annuncioId,
            mittente_id: user!.id,
          } as any);
          sendPushNotification(parentComment.user_id, "Risposta al tuo commento", `${nomeUtente} ha risposto al tuo commento: "${testoTroncato}"`, linkWithHash);
        }
      }
    },
    onSuccess: () => {
      setTesto("");
      setReplyTo(null);
      setShowEmoji(false);
      queryClient.invalidateQueries({ queryKey: ["commenti", annuncioId] });
    },
    onError: () => toast({ title: "Errore", description: "Impossibile pubblicare il commento.", variant: "destructive" }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("annunci_commenti").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commenti", annuncioId] }),
  });

  const toggleLike = useMutation({
    mutationFn: async (commentId: string) => {
      const existing = (allLikes as any[]).find((l) => l.commento_id === commentId && l.user_id === user!.id);
      if (existing) {
        await supabase.from("annunci_commenti_piace").delete().eq("commento_id", commentId).eq("user_id", user!.id);
      } else {
        await supabase.from("annunci_commenti_piace").insert({ commento_id: commentId, user_id: user!.id } as any);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commenti_likes"] }),
  });

  const canDelete = (commentUserId: string) =>
    user && (user.id === commentUserId || user.id === annuncioAutoreId);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (testo.trim() && !addComment.isPending) {
        addComment.mutate();
      }
    }
  };

  const handleReply = (c: any) => {
    const profile = profileMap[c.user_id];
    const nome = profile ? `${profile.nome || "Utente"} ${profile.cognome ? profile.cognome[0] + "." : ""}` : "Utente";
    setReplyTo({ id: c.id, nome, testo: c.testo });
    textareaRef.current?.focus();
  };

  const onEmojiClick = (emojiData: any) => {
    setTesto((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const renderComment = (c: any) => {
    const isAdminComment = isAdminUser(c.user_id);
    const profile = isAdminComment ? ADMIN_PROFILE : profileMap[c.user_id];
    const nome = isAdminComment ? "Admin MilanoHelp" : (profile ? `${profile.nome || "Utente"} ${profile.cognome || ""}`.trim() : "Utente");
    const initials = isAdminComment ? "MH" : (nome.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "U");
    const likesForComment = (allLikes as any[]).filter((l) => l.commento_id === c.id);
    const userLiked = user && likesForComment.some((l) => l.user_id === user.id);

    // Find parent comment for reply preview
    const parentComment = c.parent_id ? commenti.find((p: any) => p.id === c.parent_id) : null;
    const parentProfile = parentComment ? profileMap[parentComment.user_id] : null;
    const parentNome = parentProfile ? `${parentProfile.nome || "Utente"} ${parentProfile.cognome || ""}`.trim() : "Utente";

    return (
      <div key={c.id} id={`comment-${c.id}`} className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {/* Reply preview (WhatsApp style) */}
          {parentComment && (
            <div className="bg-muted/60 rounded-lg px-3 py-1.5 mb-1 text-xs border-l-3 border-primary/50">
              <span className="font-semibold text-primary">{parentNome}</span>
              <p className="text-muted-foreground truncate">{parentComment.testo?.slice(0, 80)}{parentComment.testo?.length > 80 ? "…" : ""}</p>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">{nome}</span>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(c.created_at), "d MMM yyyy, HH:mm", { locale: it })}
            </span>
          </div>
          <p className="text-sm text-foreground/80 mt-0.5">{c.testo}</p>
          <div className="flex items-center gap-3 mt-1">
            {user && (
              <>
                <button
                  onClick={() => toggleLike.mutate(c.id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${userLiked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${userLiked ? "fill-current" : ""}`} />
                  {likesForComment.length > 0 && likesForComment.length}
                </button>
                <button
                  onClick={() => handleReply(c)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" /> Rispondi
                </button>
              </>
            )}
            {canDelete(c.user_id) && (
              <button
                onClick={() => deleteComment.mutate(c.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Commenti ({commenti.length})
      </h2>

      {/* Comment list - flat chronological */}
      <div ref={scrollRef} className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        ) : commenti.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun commento ancora. Sii il primo!</p>
        ) : (
          commenti.map((c: any) => renderComment(c))
        )}
      </div>

      {/* Add comment */}
      {user ? (
        <div className="relative">
          {replyTo && (
            <div className="flex items-center gap-2 bg-muted/60 rounded-t-lg px-3 py-2 text-xs border border-b-0">
              <Reply className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">
                Stai rispondendo a <span className="font-semibold text-foreground">{replyTo.nome}</span>: {replyTo.testo.slice(0, 40)}{replyTo.testo.length > 40 ? "…" : ""}
              </span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                placeholder="Scrivi un commento..."
                value={testo}
                onChange={(e) => setTesto(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`min-h-[60px] pr-10 ${replyTo ? "rounded-t-none" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                className="absolute right-2 bottom-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>
              {showEmoji && (
                <div className="absolute bottom-12 right-0 z-50">
                  <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} searchPlaceholder="Cerca emoji..." />
                </div>
              )}
            </div>
            <Button
              onClick={() => addComment.mutate()}
              disabled={!testo.trim() || addComment.isPending}
              size="sm"
              className="shrink-0"
            >
              Invia
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Premi Invio per inviare, Maiusc+Invio per andare a capo</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Accedi per commentare.</p>
      )}
    </div>
  );
};

export default CommentiAnnuncio;
