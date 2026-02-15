import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle } from "lucide-react";
import type { MockConversation } from "@/pages/Chat";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}g`;
}

interface ChatListProps {
  conversations: MockConversation[];
  activeId?: string;
  onSelect: (id: string) => void;
}

const ChatList = ({ conversations, activeId, onSelect }: ChatListProps) => {
  const totalUnread = conversations.reduce((sum, c) => sum + c.nonLetti, 0);

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-heading font-bold text-lg">Chat</h2>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="text-xs px-2">
            {totalUnread}
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nessuna conversazione</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const initials = `${conv.otherUser.nome[0]}${conv.otherUser.cognome[0]}`;
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b transition-colors hover:bg-muted/50 ${
                  isActive ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {conv.otherUser.nome} {conv.otherUser.cognome}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {timeAgo(conv.ultimoAggiornamento)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate pr-2">
                      {conv.otherUser.quartiere} · {conv.ultimoMessaggio}
                    </p>
                    {conv.nonLetti > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0 h-5 shrink-0">
                        {conv.nonLetti}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </>
  );
};

export default ChatList;
