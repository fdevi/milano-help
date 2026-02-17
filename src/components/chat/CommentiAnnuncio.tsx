import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Trash2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Props {
  annuncioId: string;
  annuncioAutoreId: string;
}

const CommentiAnnuncio = ({ annuncioId, annuncioAutoreId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testo, setTesto] = useState("");

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

  // Fetch profiles for comment authors
  const userIds = [...new Set(commenti.map((c: any) => c.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["commenti_profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // Fetch likes for all comments
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

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("annunci_commenti").insert({
        annuncio_id: annuncioId,
        user_id: user!.id,
        testo,
      } as any);
      if (error) throw error;

      // Create notification for annuncio author if commenter is not the author
      if (user!.id !== annuncioAutoreId) {
        await supabase.from("notifiche").insert({
          user_id: annuncioAutoreId,
          tipo: "commento",
          titolo: "Nuovo commento",
          messaggio: `Qualcuno ha commentato il tuo annuncio`,
          link: `/annuncio/${annuncioId}`,
        } as any);
      }
    },
    onSuccess: () => {
      setTesto("");
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

  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Commenti ({commenti.length})
      </h2>

      {/* Comment list */}
      <div className="space-y-4 mb-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        ) : commenti.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun commento ancora. Sii il primo!</p>
        ) : (
          commenti.map((c: any) => {
            const profile = profileMap[c.user_id];
            const initials = profile ? `${(profile.nome || "U")[0]}${(profile.cognome || "")[0] || ""}` : "U";
            const likesForComment = (allLikes as any[]).filter((l) => l.commento_id === c.id);
            const userLiked = user && likesForComment.some((l) => l.user_id === user.id);

            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {profile?.nome || "Utente"} {profile?.cognome ? profile.cognome[0] + "." : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: it })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{c.testo}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {user && (
                      <button
                        onClick={() => toggleLike.mutate(c.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${userLiked ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${userLiked ? "fill-current" : ""}`} />
                        {likesForComment.length > 0 && likesForComment.length}
                      </button>
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
          })
        )}
      </div>

      {/* Add comment */}
      {user ? (
        <div className="flex gap-2">
          <Textarea
            placeholder="Scrivi un commento..."
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            className="min-h-[60px]"
          />
          <Button
            onClick={() => addComment.mutate()}
            disabled={!testo.trim() || addComment.isPending}
            size="sm"
            className="shrink-0 self-end"
          >
            Invia
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Accedi per commentare.</p>
      )}
    </div>
  );
};

export default CommentiAnnuncio;
