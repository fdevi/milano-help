import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PostImageGrid from "./PostImageGrid";
import PostComments from "./PostComments";
import ShareDialog from "./ShareDialog";
import PostComposer from "./PostComposer";

interface PostProfile {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
  quartiere?: string | null;
}

interface MemberProfile {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
}

interface PostCardProps {
  post: any;
  profile: PostProfile | null;
  gruppoId: string;
  gruppoNome: string;
  gruppoQuartiere?: string | null;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  onToggleLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onPostUpdated?: () => void;
  canDelete?: boolean;
  canEdit?: boolean;
  members?: MemberProfile[];
  myProfile?: MemberProfile | null;
}

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "adesso";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} g`;
  return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

const renderTextWithMentions = (text: string) => {
  const parts = text.split(/(@[\w\sàèéìòù]+?)(?=\s|$|@)/gi);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-primary font-semibold">
          {part}
        </span>
      );
    }
    return part;
  });
};

const PostCard = ({
  post,
  profile,
  gruppoId,
  gruppoNome,
  gruppoQuartiere,
  likeCount,
  commentCount,
  hasLiked,
  onToggleLike,
  onDelete,
  onPostUpdated,
  canDelete,
  canEdit,
  members = [],
  myProfile,
}: PostCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const name = profile ? `${profile.nome || ""} ${profile.cognome || ""}`.trim() || "Utente" : "Utente";
  const initials = profile ? `${(profile.nome || "U")[0]}${(profile.cognome || "")[0]}`.toUpperCase() : "U";
  const location = gruppoQuartiere || gruppoNome;
  const images = post.immagini || [];
  const textLines = (post.testo || "").split("\n");
  const isLong = post.testo?.length > 200 || textLines.length > 4;
  const wasEdited = post.updated_at && post.updated_at !== post.created_at;

  if (isEditing) {
    return (
      <Card className="overflow-hidden" id={`message-${post.id}`}>
        <div className="p-2">
          <PostComposer
            gruppoId={gruppoId}
            members={members}
            myProfile={myProfile}
            onPostCreated={() => onPostUpdated?.()}
            isEditing
            postId={post.id}
            initialText={post.testo === "(foto)" ? "" : post.testo || ""}
            initialImages={images}
            onCancelEdit={() => setIsEditing(false)}
          />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden" id={`message-${post.id}`}>
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{location}</span>
              <span>·</span>
              <span>{timeAgo(post.created_at)}</span>
              {wasEdited && <><span>·</span><span className="italic">modificato</span></>}
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
          {(canDelete || canEdit) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifica post
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete?.(post.id)}
                  >
                    Elimina post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Text content */}
        {post.testo && post.testo !== "(foto)" && (
          <div className="px-4 pb-2">
            <p
              className={`text-sm leading-relaxed whitespace-pre-line ${
                !expanded && isLong ? "line-clamp-4" : ""
              }`}
              style={
                !expanded && isLong
                  ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }
                  : undefined
              }
            >
              {renderTextWithMentions(post.testo)}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm font-medium text-primary hover:underline mt-1"
              >
                {expanded ? "Riduci" : "Continua a leggere"}
              </button>
            )}
          </div>
        )}

        {/* Images */}
        <PostImageGrid images={images} />

        {/* Stats bar */}
        {(likeCount > 0 || commentCount > 0) && (
          <div className="px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            {likeCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-500 text-red-500" /> {likeCount}
              </span>
            )}
            {commentCount > 0 && (
              <button onClick={() => setShowComments(true)} className="hover:underline">
                {commentCount} comment{commentCount !== 1 ? "i" : "o"}
              </button>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="px-2 py-1 flex items-center border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleLike(post.id)}
            className={`flex-1 gap-1.5 ${hasLiked ? "text-red-500" : "text-muted-foreground"}`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? "fill-red-500" : ""}`} /> Mi piace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-1.5 text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4" /> Commenta
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShare(true)}
            className="flex-1 gap-1.5 text-muted-foreground"
          >
            <Share2 className="w-4 h-4" /> Condividi
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="border-t">
            <PostComments postId={post.id} gruppoId={gruppoId} />
          </div>
        )}
      </Card>

      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        postId={post.id}
        gruppoId={gruppoId}
      />
    </>
  );
};

export default PostCard;
