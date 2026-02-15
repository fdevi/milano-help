import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, CheckCheck, Check } from "lucide-react";
import type { MockConversation, MockMessage } from "@/pages/Chat";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

interface ChatDetailProps {
  conversation: MockConversation;
  messages: MockMessage[];
  currentUserId: string;
  onSend: (text: string) => void;
  onBack?: () => void;
}

const ChatDetail = ({ conversation, messages, currentUserId, onSend, onBack }: ChatDetailProps) => {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const { otherUser } = conversation;
  const initials = `${otherUser.nome[0]}${otherUser.cognome[0]}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-sm leading-tight">
            {otherUser.nome} {otherUser.cognome}
          </p>
          <p className="text-xs text-muted-foreground">{otherUser.quartiere}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-full text-muted-foreground text-sm">
            Nessun messaggio. Inizia la conversazione!
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.mittenteId === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  <p>{msg.testo}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                    {isMine && (
                      msg.letto
                        ? <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                        : <Check className="w-3 h-3 text-primary-foreground/70" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Typing indicator placeholder */}
      {/* <div className="px-4 pb-1 text-xs text-muted-foreground italic">Sta scrivendo...</div> */}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card flex gap-2">
        <Input
          placeholder="Scrivi un messaggio..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="flex-1"
        />
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
  );
};

export default ChatDetail;
