import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Reply, X, Smile, Heart } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { ADMIN_PROFILE } from "@/lib/adminProfile";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export interface ChatMessage {
  id: string;
  mittenteId: string;
  testo: string;
  createdAt: string;
  letto: boolean;
  parentId?: string | null;
  pubblicatoComeAdmin?: boolean;
}

export interface ChatUserProfile {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
}

export interface MessageLike {
  messaggio_id: string;
  user_id: string;
}

interface ChatDetailProps {
  conversationName: string;
  conversationSubtitle?: string;
  messages: ChatMessage[];
  currentUserId: string;
  profiles: Record<string, ChatUserProfile>;
  onSend: (text: string, parentId?: string | null) => void;
  onBack?: () => void;
  isGroup?: boolean;
  likes?: MessageLike[];
  onToggleLike?: (messageId: string) => void;
}

const ChatDetail = ({ conversationName, conversationSubtitle, messages, currentUserId, profiles, onSend, onBack, isGroup, likes = [], onToggleLike }: ChatDetailProps) => {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; nome: string; testo: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageId = params.get("message");

    if (!messages.length) return;

    const scrollToElement = (elId: string) => {
      const element = document.getElementById(elId);
      if (!element) return false;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary", "rounded-lg");
      setTimeout(() => element.classList.remove("ring-2", "ring-primary", "rounded-lg"), 3000);
      return true;
    };

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      url.searchParams.delete("like");
      window.history.replaceState({}, "", url.toString());
    };

    if (messageId) {
      // Try immediately, then use MutationObserver as fallback
      if (scrollToElement(`message-${messageId}`)) { cleanUrl(); return; }

      let attempts = 0;
      const maxAttempts = 30;
      let observer: MutationObserver | null = null;
      let fallbackTimer: number | undefined;

      const tryWithObserver = () => {
        if (scrollToElement(`message-${messageId}`)) {
          cleanUrl();
          observer?.disconnect();
          if (fallbackTimer) clearTimeout(fallbackTimer);
          return true;
        }
        return false;
      };

      if (scrollRef.current) {
        observer = new MutationObserver(() => { tryWithObserver(); });
        observer.observe(scrollRef.current, { childList: true, subtree: true });
      }

      // Also retry with timer as belt-and-suspenders
      const retryFn = () => {
        attempts++;
        if (tryWithObserver()) return;
        if (attempts < maxAttempts) {
          fallbackTimer = window.setTimeout(retryFn, 300);
        } else {
          observer?.disconnect();
        }
      };
      fallbackTimer = window.setTimeout(retryFn, 200);

      return () => {
        observer?.disconnect();
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
    } else {
      // No deep-link: scroll to bottom
      const timer = window.setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages, location.search]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, replyTo?.id || null);
    setText("");
    setReplyTo(null);
    setShowEmoji(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (msg: ChatMessage) => {
    const p = profiles[msg.mittenteId];
    const nome = p ? `${p.nome || "Utente"} ${p.cognome ? p.cognome[0] + "." : ""}`.trim() : "Utente";
    setReplyTo({ id: msg.id, nome, testo: msg.testo });
    textareaRef.current?.focus();
  };

  const onEmojiClick = (emojiData: any) => {
    setText((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const getProfileName = (userId: string) => {
    const p = profiles[userId];
    return p ? `${p.nome || "Utente"} ${p.cognome || ""}`.trim() : "Utente";
  };

  const getInitials = (userId: string) => {
    const p = profiles[userId];
    if (!p) return "U";
    return `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase();
  };

  const getLikeCount = (msgId: string) => likes.filter((l) => l.messaggio_id === msgId).length;
  const hasLiked = (msgId: string) => likes.some((l) => l.messaggio_id === msgId && l.user_id === currentUserId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight">{conversationName}</p>
          {conversationSubtitle && <p className="text-xs text-muted-foreground">{conversationSubtitle}</p>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full text-muted-foreground text-sm">
            Nessun messaggio. Inizia la conversazione!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.mittenteId === currentUserId;
            const p = profiles[msg.mittenteId];
            const parentMsg = msg.parentId ? messages.find((m) => m.id === msg.parentId) : null;
            const parentName = parentMsg ? getProfileName(parentMsg.mittenteId) : null;
            const likeCount = getLikeCount(msg.id);
            const liked = hasLiked(msg.id);

            return (
              <div
                key={msg.id}
                id={`message-${msg.id}`}
                data-last-message={index === messages.length - 1 ? "true" : undefined}
                className={`flex items-end gap-2 group ${isMine ? "justify-end" : "justify-start"} transition-all duration-300`}
              >
                {!isMine && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={p?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      {getInitials(msg.mittenteId)}
                    </AvatarFallback>
                  </Avatar>
                )}
                {isMine && (
                  <div className="order-last">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={p?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {getInitials(msg.mittenteId)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <div className="flex flex-col">
                  <div className={`max-w-[75%] rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                    {parentMsg && (
                      <div className={`px-3 pt-2 pb-1 text-xs rounded-t-2xl ${isMine ? "bg-primary/80" : "bg-muted/80"}`}>
                        <div className={`border-l-2 pl-2 ${isMine ? "border-primary-foreground/40" : "border-primary/50"}`}>
                          <span className={`font-semibold ${isMine ? "text-primary-foreground/90" : "text-primary"}`}>{parentName}</span>
                          <p className={`truncate ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {parentMsg.testo.slice(0, 60)}{parentMsg.testo.length > 60 ? "…" : ""}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="px-3 py-2">
                      {(isGroup && !isMine) && (
                        <p className="text-xs font-medium mb-1 opacity-70">{getProfileName(msg.mittenteId)}</p>
                      )}
                      <p>{msg.testo}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Like count badge below message */}
                  {likeCount > 0 && (
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} -mt-1`}>
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-card border rounded-full px-1.5 py-0.5 shadow-sm">
                        <Heart className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                        {likeCount}
                      </span>
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-2">
                  <button
                    onClick={() => handleReply(msg)}
                    className="text-muted-foreground hover:text-primary"
                    title="Rispondi"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  {onToggleLike && (
                    <button
                      onClick={() => onToggleLike(msg.id)}
                      className={`transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      title="Mi piace"
                    >
                      <Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-500" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card">
        {replyTo && (
          <div className="flex items-center gap-2 bg-muted/60 rounded-t-lg px-3 py-2 text-xs border border-b-0 mb-0">
            <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-muted-foreground truncate">
              Stai rispondendo a <span className="font-semibold text-foreground">{replyTo.nome}</span>: {replyTo.testo.slice(0, 40)}{replyTo.testo.length > 40 ? "…" : ""}
            </span>
            <button onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-destructive shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              placeholder="Scrivi un messaggio..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`min-h-[44px] max-h-[120px] pr-10 resize-none ${replyTo ? "rounded-t-none" : ""}`}
              rows={1}
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
            size="icon"
            onClick={handleSend}
            disabled={!text.trim()}
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;
