import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ChatList from "@/components/chat/ChatList";
import ChatDetail from "@/components/chat/ChatDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Users } from "lucide-react";

export interface MockConversation {
  id: string;
  otherUser: { id: string; nome: string; cognome: string; quartiere: string };
  ultimoMessaggio: string;
  ultimoAggiornamento: string;
  nonLetti: number;
}

export interface MockMessage {
  id: string;
  mittenteId: string;
  testo: string;
  createdAt: string;
  letto: boolean;
}

const Chat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>("private");

  // Determine if current conversationId is a private conversation
  const { data: isPrivateConv } = useQuery({
    queryKey: ["is_private_conv", conversationId],
    queryFn: async () => {
      if (!conversationId) return false;
      const { data } = await supabase
        .from("conversazioni_private")
        .select("id")
        .eq("id", conversationId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!conversationId,
  });

  // === OLD CONVERSATIONS (conversazioni/messaggi) ===
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversazioni", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversazioni")
        .select("*")
        .or(`utente1_id.eq.${user.id},utente2_id.eq.${user.id}`)
        .order("ultimo_aggiornamento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // === PRIVATE CONVERSATIONS (conversazioni_private/messaggi_privati) ===
  const { data: privateConversations = [] } = useQuery({
    queryKey: ["conversazioni_private", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("conversazioni_private")
        .select("*")
        .or(`acquirente_id.eq.${user.id},venditore_id.eq.${user.id}`)
        .order("ultimo_aggiornamento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Merge user IDs for profiles
  const otherUserIdsOld = conversations.map((c: any) =>
    c.utente1_id === user?.id ? c.utente2_id : c.utente1_id
  );
  const otherUserIdsPrivate = (privateConversations as any[]).map((c) =>
    c.acquirente_id === user?.id ? c.venditore_id : c.acquirente_id
  ).filter(Boolean);
  const allOtherUserIds = [...new Set([...otherUserIdsOld, ...otherUserIdsPrivate])];

  const { data: otherProfiles = [] } = useQuery({
    queryKey: ["chat_profiles", allOtherUserIds.join(",")],
    queryFn: async () => {
      if (allOtherUserIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, quartiere")
        .in("user_id", allOtherUserIds);
      return data || [];
    },
    enabled: allOtherUserIds.length > 0,
  });
  const profileMap = Object.fromEntries((otherProfiles as any[]).map((p) => [p.user_id, p]));

  // Unread counts for old conversations
  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["unread_per_conv", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data } = await supabase
        .from("messaggi")
        .select("conversazione_id")
        .eq("letto", false)
        .neq("mittente_id", user.id);
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => { counts[m.conversazione_id] = (counts[m.conversazione_id] || 0) + 1; });
      return counts;
    },
    enabled: !!user,
  });

  // Unread counts for private conversations
  const { data: unreadCountsPrivate = {} } = useQuery({
    queryKey: ["unread_per_conv_private", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: letti } = await supabase
        .from("messaggi_privati_letti")
        .select("conversazione_id, ultimo_letto")
        .eq("user_id", user.id);
      const mapLetti = new Map(letti?.map(l => [l.conversazione_id, l.ultimo_letto]) || []);

      const counts: Record<string, number> = {};
      await Promise.all((privateConversations as any[]).map(async (conv) => {
        const ultimoLetto = mapLetti.get(conv.id) || new Date(0).toISOString();
        const { count } = await supabase
          .from("messaggi_privati")
          .select("*", { count: "exact", head: true })
          .eq("conversazione_id", conv.id)
          .neq("mittente_id", user.id)
          .gt("created_at", ultimoLetto);
        if (count && count > 0) counts[conv.id] = count;
      }));
      return counts;
    },
    enabled: !!user && (privateConversations as any[]).length > 0,
  });

  // Build combined conversation list
  const chatConversationsOld: MockConversation[] = conversations.map((c: any) => {
    const otherId = c.utente1_id === user?.id ? c.utente2_id : c.utente1_id;
    const profile = profileMap[otherId];
    return {
      id: c.id,
      otherUser: { id: otherId, nome: profile?.nome || "Utente", cognome: profile?.cognome || "", quartiere: profile?.quartiere || "" },
      ultimoMessaggio: c.ultimo_messaggio || "",
      ultimoAggiornamento: c.ultimo_aggiornamento,
      nonLetti: (unreadCounts as any)[c.id] || 0,
    };
  });

  const chatConversationsPrivate: MockConversation[] = (privateConversations as any[]).map((c) => {
    const otherId = c.acquirente_id === user?.id ? c.venditore_id : c.acquirente_id;
    const profile = profileMap[otherId || ""];
    return {
      id: c.id,
      otherUser: { id: otherId || "", nome: profile?.nome || "Utente", cognome: profile?.cognome || "", quartiere: profile?.quartiere || "" },
      ultimoMessaggio: c.ultimo_messaggio || "",
      ultimoAggiornamento: c.ultimo_aggiornamento || "",
      nonLetti: (unreadCountsPrivate as any)[c.id] || 0,
    };
  });

  const chatConversations = [...chatConversationsOld, ...chatConversationsPrivate]
    .sort((a, b) => (b.ultimoAggiornamento || "").localeCompare(a.ultimoAggiornamento || ""));

  // Fetch messages for active conversation (old or private)
  const { data: messages = [] } = useQuery({
    queryKey: ["messaggi", conversationId, isPrivateConv],
    queryFn: async () => {
      if (!conversationId) return [];
      if (isPrivateConv) {
        const { data, error } = await supabase
          .from("messaggi_privati")
          .select("*")
          .eq("conversazione_id", conversationId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("messaggi")
          .select("*")
          .eq("conversazione_id", conversationId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!conversationId && isPrivateConv !== undefined,
  });

  // Mark messages as read
  useEffect(() => {
    if (!conversationId || !user) return;

    const markRead = async () => {
      if (isPrivateConv) {
        // Upsert messaggi_privati_letti for private conversations
        console.log("📖 Marking private conversation as read:", conversationId);
        const { error } = await supabase
          .from("messaggi_privati_letti")
          .upsert(
            {
              conversazione_id: conversationId,
              user_id: user.id,
              ultimo_letto: new Date().toISOString(),
            },
            { onConflict: "conversazione_id,user_id" }
          );
        if (error) {
          console.error("❌ Error upserting messaggi_privati_letti:", error);
          // Fallback: try insert then update
          const { data: existing } = await supabase
            .from("messaggi_privati_letti")
            .select("id")
            .eq("conversazione_id", conversationId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (existing) {
            await supabase
              .from("messaggi_privati_letti")
              .update({ ultimo_letto: new Date().toISOString() })
              .eq("conversazione_id", conversationId)
              .eq("user_id", user.id);
          } else {
            await supabase
              .from("messaggi_privati_letti")
              .insert({
                conversazione_id: conversationId,
                user_id: user.id,
                ultimo_letto: new Date().toISOString(),
              });
          }
        }
        queryClient.invalidateQueries({ queryKey: ["unread_per_conv_private"] });
      } else {
        // Old system: update messaggi.letto
        await supabase
          .from("messaggi")
          .update({ letto: true })
          .eq("conversazione_id", conversationId)
          .neq("mittente_id", user.id)
          .eq("letto", false);
        queryClient.invalidateQueries({ queryKey: ["unread_per_conv"] });
      }
    };
    markRead();
  }, [conversationId, user, isPrivateConv, messages]);

  // Realtime for messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi" }, () => {
        queryClient.invalidateQueries({ queryKey: ["messaggi", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["unread_per_conv"] });
        queryClient.invalidateQueries({ queryKey: ["conversazioni"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messaggi_privati" }, () => {
        queryClient.invalidateQueries({ queryKey: ["messaggi", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["unread_per_conv_private"] });
        queryClient.invalidateQueries({ queryKey: ["conversazioni_private"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId]);

  const mockMessages: MockMessage[] = (messages as any[]).map((m) => ({
    id: m.id,
    mittenteId: m.mittente_id,
    testo: m.testo,
    createdAt: m.created_at,
    letto: m.letto ?? false,
  }));

  const activeConversation = conversationId ? chatConversations.find((c) => c.id === conversationId) : null;

  const handleSend = async (text: string) => {
    if (!conversationId || !user) return;

    if (isPrivateConv) {
      await supabase.from("messaggi_privati").insert({
        conversazione_id: conversationId,
        mittente_id: user.id,
        testo: text,
      });
      await supabase.from("conversazioni_private").update({
        ultimo_messaggio: text,
        ultimo_aggiornamento: new Date().toISOString(),
        ultimo_mittente_id: user.id,
      }).eq("id", conversationId);
      queryClient.invalidateQueries({ queryKey: ["messaggi", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversazioni_private"] });
    } else {
      await supabase.from("messaggi").insert({
        conversazione_id: conversationId,
        mittente_id: user.id,
        testo: text,
      });
      await supabase.from("conversazioni").update({
        ultimo_messaggio: text,
        ultimo_aggiornamento: new Date().toISOString(),
      }).eq("id", conversationId);
      queryClient.invalidateQueries({ queryKey: ["messaggi", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversazioni"] });
    }
  };

  // Fetch user's groups for the groups tab
  const { data: myGroups = [] } = useQuery({
    queryKey: ["my_groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id")
        .eq("user_id", user.id)
        .eq("stato", "approvato");
      if (!memberships || memberships.length === 0) return [];
      const groupIds = memberships.map((m: any) => m.gruppo_id);
      const { data: groups } = await supabase
        .from("gruppi")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });
      return groups || [];
    },
    enabled: !!user,
  });

  const showList = !isMobile || !conversationId;
  const showDetail = !isMobile || !!conversationId;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex">
        {showList && (
          <div className={`${isMobile ? "w-full" : "w-80 lg:w-96"} border-r bg-card flex flex-col`}>
            <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1">
              <TabsList className="mx-4 mt-3 w-full">
                <TabsTrigger value="private" className="flex-1 gap-1">
                  <MessageCircle className="w-4 h-4" /> Chat private
                </TabsTrigger>
                <TabsTrigger value="gruppi" className="flex-1 gap-1">
                  <Users className="w-4 h-4" /> Gruppi
                </TabsTrigger>
              </TabsList>

              <TabsContent value="private" className="flex-1 flex flex-col mt-0">
                <ChatList
                  conversations={chatConversations}
                  activeId={conversationId}
                  onSelect={(id) => navigate(`/chat/${id}`)}
                />
              </TabsContent>

              <TabsContent value="gruppi" className="flex-1 mt-0">
                <ScrollArea className="flex-1">
                  {(myGroups as any[]).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nessun gruppo</p>
                      <p className="text-xs mt-1">Esplora i gruppi disponibili</p>
                    </div>
                  ) : (
                    (myGroups as any[]).map((g) => (
                      <button
                        key={g.id}
                        onClick={() => navigate(`/gruppo/${g.id}`)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 border-b transition-colors hover:bg-muted/50"
                      >
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {g.nome.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{g.nome}</span>
                          <p className="text-xs text-muted-foreground truncate">{g.quartiere || g.categoria || "Gruppo"}</p>
                        </div>
                      </button>
                    ))
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {showDetail && (
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <ChatDetail
                conversation={activeConversation}
                messages={mockMessages}
                currentUserId={user?.id || ""}
                onSend={handleSend}
                onBack={isMobile ? () => navigate("/chat") : undefined}
              />
            ) : (
              !isMobile && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">Seleziona una conversazione</p>
                    <p className="text-sm mt-1">Scegli una chat dalla lista per iniziare</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;