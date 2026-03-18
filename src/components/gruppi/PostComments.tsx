import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Reply, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminMode } from "@/hooks/useAdminMode";
import { ADMIN_USER_ID, ADMIN_PROFILE, isAdminUser } from "@/lib/adminProfile";

interface PostCommentsProps {
  postId: string;
  gruppoId: string;
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "ora";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}g`;
  return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

const PostComments = ({ postId, gruppoId }: PostCommentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { effectiveUserId, adminMode, isAdmin } = useAdminMode();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; nome: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["post_comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("gruppi_post_commenti" as any)
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      return (data || []) as any[];
    },
  });

  const commentUserIds = [...new Set(comments.map((c: any) => c.user_id))];
  const { data: commentProfiles = [] } = useQuery({
    queryKey: ["comment_profiles", commentUserIds.join(",")],
    queryFn: async () => {
      if (commentUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url").in("user_id", commentUserIds);
      return data || [];
    },
    enabled: commentUserIds.length > 0,
  });
  const profileMap = Object.fromEntries(commentProfiles.map((p: any) => [p.user_id, p]));

  const topLevelComments = comments.filter((c: any) => !c.parent_id);
  const repliesMap: Record<string, any[]> = {};
  comments.filter((c: any) => c.parent_id).forEach((c: any) => {
    if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
    repliesMap[c.parent_id].push(c);
  });

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("gruppi_post_commenti" as any).insert({
        post_id: postId,
        gruppo_id: gruppoId,
        user_id: effectiveUserId(user.id),
        testo: newComment.trim(),
        parent_id: replyTo?.id || null,
      });
      if (error) throw error;
      setNewComment("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["post_comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post_comment_counts"] });
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Impossibile commentare.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComment = (comment: any, isReply = false) => {
    const isAdminComment = isAdminUser(comment.user_id);
    const p = isAdminComment ? ADMIN_PROFILE : profileMap[comment.user_id];
    const name = isAdminComment ? "Admin MilanoHelp" : (p ? `${p.nome || ""} ${p.cognome || ""}`.trim() || "Utente" : "Utente");
    const initials = isAdminComment ? "MH" : (p ? `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase() : "U");
    const replies = repliesMap[comment.id] || [];

    return (
      <div key={comment.id} className={`flex gap-2 ${isReply ? "ml-10" : ""}`}>
        <Avatar className={`${isReply ? "h-6 w-6" : "h-8 w-8"} shrink-0 mt-0.5`}>
          <AvatarImage src={p?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-xl px-3 py-2">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-sm">{comment.testo}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1 text-xs text-muted-foreground">
            <span>{timeAgo(comment.created_at)}</span>
            {!isReply && (
              <button
                onClick={() => setReplyTo({ id: comment.id, nome: name })}
                className="font-medium hover:text-primary"
              >
                Rispondi
              </button>
            )}
          </div>
          {!isReply && replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map((r: any) => renderComment(r, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      {topLevelComments.map((c: any) => renderComment(c))}

      <div className="flex gap-2 items-start">
        <Avatar className="h-7 w-7 shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
            {user ? "U" : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {replyTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Reply className="w-3 h-3" />
              <span>Rispondi a <strong>{replyTo.nome}</strong></span>
              <button onClick={() => setReplyTo(null)} className="ml-1 hover:text-destructive">✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder={replyTo ? "Scrivi una risposta..." : "Scrivi un commento..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
              className="text-sm h-9"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={submitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="shrink-0 h-9 w-9"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostComments;
