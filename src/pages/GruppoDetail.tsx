import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Users, Lock, Globe, MapPin, UserPlus, LogOut, Check, X, Pencil, Trash2, Reply, Smile, Heart, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { sendPushNotification } from "@/lib/pushNotification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "emoji-picker-react";

const GruppoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editDescrizione, setEditDescrizione] = useState("");
  const [editImmagine, setEditImmagine] = useState("");
  const [editTipo, setEditTipo] = useState<"pubblico" | "privato">("pubblico");
  const [editCategoria, setEditCategoria] = useState("");
  const [editQuartiere, setEditQuartiere] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; nome: string; testo: string } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [editAiPrompt, setEditAiPrompt] = useState("");
  const [editIsGenerating, setEditIsGenerating] = useState(false);
  const [editShowAiPrompt, setEditShowAiPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateEditImage = async () => {
    if (!editAiPrompt.trim()) return;
    setEditIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-group-image", {
        body: { prompt: editAiPrompt.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        setEditImmagine(data.url);
        setEditShowAiPrompt(false);
        setEditAiPrompt("");
        toast({ title: "Immagine generata!" });
      }
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Impossibile generare l'immagine.", variant: "destructive" });
    } finally {
      setEditIsGenerating(false);
    }
  };

  const { data: gruppo } = useQuery({
    queryKey: ["gruppo", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("gruppi").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: membri = [] } = useQuery({
    queryKey: ["gruppo_membri", id],
    queryFn: async () => {
      const { data } = await supabase.from("gruppi_membri").select("*").eq("gruppo_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const memberUserIds = (membri as any[]).filter((m) => m.stato === "approvato").map((m) => m.user_id);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["gruppo_profiles", memberUserIds.join(",")],
    queryFn: async () => {
      if (memberUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url").in("user_id", memberUserIds);
      return data || [];
    },
    enabled: memberUserIds.length > 0,
  });

  const myMembership = user ? (membri as any[]).find((m) => m.user_id === user.id) : null;
  const isMember = myMembership?.stato === "approvato";
  const isGroupAdmin = myMembership?.ruolo === "admin";
  const isPending = myMembership?.stato === "in_attesa";
  const { isAdmin: isSiteAdmin } = useAdminCheck();
  const canEditOrDelete = (gruppo as any)?.creatore_id === user?.id || isSiteAdmin;

  const { data: messaggi = [] } = useQuery({
    queryKey: ["gruppo_messaggi", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gruppi_messaggi")
        .select("*")
        .eq("gruppo_id", id!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!id && isMember,
  });

  // Likes for group messages
  const groupMsgIds = (messaggi as any[]).map((m) => m.id);
  const { data: groupLikes = [] } = useQuery({
    queryKey: ["gruppi_messaggi_piace", id],
    queryFn: async () => {
      if (groupMsgIds.length === 0) return [];
      const { data } = await supabase
        .from("gruppi_messaggi_piace")
        .select("messaggio_id, user_id")
        .in("messaggio_id", groupMsgIds);
      return data || [];
    },
    enabled: !!id && isMember && groupMsgIds.length > 0,
  });

  const handleToggleGroupLike = async (messageId: string) => {
    if (!user) return;
    const existing = (groupLikes as any[]).find(
      (l: any) => l.messaggio_id === messageId && l.user_id === user.id
    );
    if (existing) {
      await supabase.from("gruppi_messaggi_piace").delete().eq("messaggio_id", messageId).eq("user_id", user.id);
    } else {
      await supabase.from("gruppi_messaggi_piace").insert({ messaggio_id: messageId, user_id: user.id } as any);

      // Push notification for like on group message
      try {
        const msg = (messaggi as any[]).find((m) => m.id === messageId);
        if (msg && msg.mittente_id !== user.id) {
          const p = profileMap[user.id];
          const myName = p ? `${p.nome || ""} ${p.cognome || ""}`.trim() || "Utente" : "Utente";
          sendPushNotification(
            msg.mittente_id,
            "Nuovo like",
            `${myName} ha messo like al tuo messaggio`,
            `/gruppo/${id}`
          );
        }
      } catch (e) {
        console.warn("[push] group like push failed:", e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["gruppi_messaggi_piace", id] });
  };

  const getGroupLikeCount = (msgId: string) => (groupLikes as any[]).filter((l: any) => l.messaggio_id === msgId).length;
  const hasGroupLiked = (msgId: string) => (groupLikes as any[]).some((l: any) => l.messaggio_id === msgId && l.user_id === user?.id);

  // Profiles for messages
  const msgUserIds = [...new Set((messaggi as any[]).map((m) => m.mittente_id))];
  const { data: msgProfiles = [] } = useQuery({
    queryKey: ["msg_profiles", msgUserIds.join(",")],
    queryFn: async () => {
      if (msgUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url").in("user_id", msgUserIds);
      return data || [];
    },
    enabled: msgUserIds.length > 0,
  });
  const profileMap = Object.fromEntries((msgProfiles as any[]).map((p) => [p.user_id, p]));
  const memberProfileMap = Object.fromEntries((memberProfiles as any[]).map((p) => [p.user_id, p]));

  // Pending members (for admin)
  const pendingMembers = (membri as any[]).filter((m) => m.stato === "in_attesa");
  const pendingUserIds = pendingMembers.map((m) => m.user_id);
  const { data: pendingProfiles = [] } = useQuery({
    queryKey: ["pending_profiles", pendingUserIds.join(",")],
    queryFn: async () => {
      if (pendingUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url").in("user_id", pendingUserIds);
      return data || [];
    },
    enabled: pendingUserIds.length > 0,
  });
  const pendingProfileMap = Object.fromEntries((pendingProfiles as any[]).map((p) => [p.user_id, p]));

  // Segna messaggi come letti
  const segnaComeLetto = async () => {
    if (!user || !id || !isMember) return;
    const now = new Date().toISOString();
    await supabase
      .from("messaggi_letti")
      .upsert(
        { user_id: user.id, gruppo_id: id, ultimo_letto: now, updated_at: now } as any,
        { onConflict: "user_id,gruppo_id" }
      );
    
  };

  useEffect(() => {
    if (isMember && messaggi.length > 0) {
      segnaComeLetto();
    }
  }, [isMember, messaggi]);

  // Real-time messages
  useEffect(() => {
    if (!id || !isMember) return;
    const channel = supabase
      .channel(`gruppo-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gruppi_messaggi", filter: `gruppo_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });
        queryClient.invalidateQueries({ queryKey: ["msg_profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gruppi_messaggi_piace" }, () => {
        queryClient.invalidateQueries({ queryKey: ["gruppi_messaggi_piace", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isMember, queryClient]);

  // Scroll: bottom by default, to specific message on ?message=
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageId = params.get("message");
    const messaggiList = messaggi as any[];

    console.log("[GruppoDetail scroll] useEffect", {
      messageId,
      messagesCount: messaggiList.length,
      hasScrollRef: !!scrollRef.current,
    });

    if (!messaggiList.length) {
      console.log("[GruppoDetail scroll] nessun messaggio, skip");
      return;
    }

    const scrollToBottom = (reason: string) => {
      const container = scrollRef.current;
      if (!container) {
        console.log("[GruppoDetail scroll] tentativo scroll al fondo ma ref assente", { reason });
        return false;
      }

      container.scrollTop = container.scrollHeight;
      console.log("[GruppoDetail scroll] tentativo scroll al fondo", {
        reason,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
      });
      return true;
    };

    const scrollToElement = (elId: string) => {
      const element = document.getElementById(elId);
      console.log("[GruppoDetail scroll] ricerca messaggio", { elId, found: !!element });

      if (!element) return false;

      console.log("[GruppoDetail scroll] trovato messaggio, eseguo scroll", { elId });
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
      hasScrolledRef.current = true;
      const targetId = `message-${messageId}`;

      if (scrollToElement(targetId)) {
        cleanUrl();
        return;
      }

      let observer: MutationObserver | null = null;
      let fallbackTimer: number | undefined;
      let attachObserverTimer: number | undefined;
      let attempts = 0;

      const tryScroll = (source: string) => {
        console.log("[GruppoDetail scroll] tentativo scroll al messaggio", {
          source,
          targetId,
          attempt: attempts,
        });

        if (scrollToElement(targetId)) {
          cleanUrl();
          observer?.disconnect();
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (attachObserverTimer) clearTimeout(attachObserverTimer);
          return true;
        }

        return false;
      };

      const attachObserver = () => {
        const container = scrollRef.current;
        if (!container) {
          console.log("[GruppoDetail scroll] observer non agganciato: ref non disponibile");
          return false;
        }

        if (observer) return true;

        observer = new MutationObserver(() => {
          console.log("[GruppoDetail scroll] observer: mutazione rilevata");
          tryScroll("observer");
        });
        observer.observe(container, { childList: true, subtree: true });
        console.log("[GruppoDetail scroll] observer agganciato");
        return true;
      };

      if (!attachObserver()) {
        let refAttempts = 0;
        const retryAttach = () => {
          refAttempts++;
          if (attachObserver()) return;
          if (refAttempts < 15) {
            attachObserverTimer = window.setTimeout(retryAttach, 100);
          }
        };
        attachObserverTimer = window.setTimeout(retryAttach, 50);
      }

      const retryFn = () => {
        attempts++;
        if (tryScroll("retry")) return;

        if (attempts < 30) {
          fallbackTimer = window.setTimeout(retryFn, 300);
        } else {
          console.log("[GruppoDetail scroll] max tentativi raggiunti, fallback fondo");
          observer?.disconnect();
          scrollToBottom("fallback-message-not-found");
        }
      };

      fallbackTimer = window.setTimeout(retryFn, 200);

      return () => {
        observer?.disconnect();
        if (fallbackTimer) clearTimeout(fallbackTimer);
        if (attachObserverTimer) clearTimeout(attachObserverTimer);
      };
    }

    const timer = window.setTimeout(() => {
      scrollToBottom("default-open");
    }, 300);

    return () => clearTimeout(timer);
  }, [messaggi, location.search]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gruppi_messaggi").insert({
        gruppo_id: id!,
        mittente_id: user!.id,
        testo: text.trim(),
        parent_id: replyTo?.id || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      const sentText = text.trim();
      setText("");
      setReplyTo(null);
      setShowEmoji(false);
      queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });

      // Push notification to all group members except sender
      try {
        const { data: membri } = await supabase
          .from("gruppi_membri")
          .select("user_id")
          .eq("gruppo_id", id!)
          .eq("stato", "approvato")
          .neq("user_id", user!.id);

        if (membri && membri.length > 0) {
          const p = profileMap[user!.id];
          const myName = p ? `${p.nome || ""} ${p.cognome || ""}`.trim() || "Utente" : "Utente";
          const preview = sentText.length > 50 ? sentText.slice(0, 50) + "…" : sentText;
          const gruppoNome = (gruppo as any)?.nome || "gruppo";

          await Promise.all(
            membri.map((m: any) =>
              sendPushNotification(
                m.user_id,
                `Nuovo messaggio in ${gruppoNome}`,
                `${myName}: ${preview}`,
                `/gruppo/${id}`
              )
            )
          );
        }
      } catch (e) {
        console.warn("[push] group message push failed:", e);
      }
    },
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim() && !sendMessage.isPending) {
        sendMessage.mutate();
      }
    }
  };

  const handleReply = (msg: any) => {
    const p = profileMap[msg.mittente_id];
    const nome = p ? `${p.nome || "Utente"} ${p.cognome ? p.cognome[0] + "." : ""}`.trim() : "Utente";
    setReplyTo({ id: msg.id, nome, testo: msg.testo });
    textareaRef.current?.focus();
  };

  const onEmojiClick = (emojiData: any) => {
    setText((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const joinGroup = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Devi effettuare l'accesso per unirti.");
      const { data: existing } = await supabase
        .from("gruppi_membri")
        .select("stato")
        .eq("gruppo_id", id!)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        if (existing.stato === "approvato") throw new Error("Sei già membro di questo gruppo.");
        else if (existing.stato === "in_attesa") throw new Error("Hai già una richiesta in attesa per questo gruppo.");
      }
      const tipo = (gruppo as any)?.tipo ?? "pubblico";
      const stato = tipo === "privato" ? "in_attesa" : "approvato";
      const { error } = await supabase.from("gruppi_membri").insert({ gruppo_id: id!, user_id: user.id, ruolo: "membro", stato } as any);
      if (error) {
        if (error.code === '23505') throw new Error("Sei già membro o hai già inviato una richiesta.");
        else if (error.code === '42501') throw new Error("Non hai i permessi per unirti a questo gruppo.");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gruppo_membri", id] });
      queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["gruppi_member_counts"] });
      const tipo = (gruppo as any)?.tipo;
      toast({ title: tipo === "privato" ? "Richiesta inviata!" : "✅ Ti sei unito al gruppo!", description: tipo === "privato" ? "Attendi l'approvazione di un amministratore." : undefined });
    },
    onError: (err: any) => toast({ title: "❌ Errore", description: err?.message ?? "Impossibile unirsi al gruppo.", variant: "destructive" }),
  });

  const leaveGroup = useMutation({
    mutationFn: async () => { await supabase.from("gruppi_membri").delete().eq("gruppo_id", id!).eq("user_id", user!.id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["gruppo_membri", id] }); toast({ title: "Hai lasciato il gruppo." }); },
  });

  const handleMemberAction = useMutation({
    mutationFn: async ({ memberId, action }: { memberId: string; action: "approvato" | "rifiutato" }) => {
      await supabase.from("gruppi_membri").update({ stato: action } as any).eq("id", memberId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gruppo_membri", id] }),
  });

  const openEditDialog = () => {
    const g = gruppo as any;
    setEditNome(g?.nome ?? ""); setEditDescrizione(g?.descrizione ?? ""); setEditImmagine(g?.immagine ?? "");
    setEditTipo((g?.tipo === "privato" ? "privato" : "pubblico") as "pubblico" | "privato");
    setEditCategoria(g?.categoria ?? ""); setEditQuartiere(g?.quartiere ?? ""); setShowEdit(true);
  };

  const updateGruppo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gruppi").update({
        nome: editNome.trim(), descrizione: editDescrizione?.trim() || null, immagine: editImmagine?.trim() || null,
        tipo: editTipo, categoria: editCategoria?.trim() || null, quartiere: editQuartiere?.trim() || null,
      } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { setShowEdit(false); queryClient.invalidateQueries({ queryKey: ["gruppo", id] }); queryClient.invalidateQueries({ queryKey: ["gruppi"] }); toast({ title: "Gruppo aggiornato." }); },
    onError: (err: any) => toast({ title: "Errore", description: err?.message ?? "Impossibile aggiornare il gruppo.", variant: "destructive" }),
  });

  const deleteGruppo = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("gruppi").delete().eq("id", id!); if (error) throw error; },
    onSuccess: () => { setShowDeleteConfirm(false); queryClient.invalidateQueries({ queryKey: ["gruppi"] }); queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] }); toast({ title: "Gruppo eliminato." }); navigate("/gruppi"); },
    onError: (err: any) => toast({ title: "Errore", description: err?.message ?? "Impossibile eliminare il gruppo.", variant: "destructive" }),
  });

  if (!gruppo) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24"><p className="text-muted-foreground">Caricamento...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-card flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/gruppi")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {(gruppo as any).immagine ? (
            <img src={(gruppo as any).immagine} alt={(gruppo as any).nome} className="w-10 h-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">{(gruppo as any).nome?.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-foreground truncate">{(gruppo as any).nome}</h1>
              {(gruppo as any).tipo === "privato" ? <Lock className="w-4 h-4 text-muted-foreground shrink-0" /> : <Globe className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" /> {memberUserIds.length} membri
              {(gruppo as any).quartiere && <><MapPin className="w-3 h-3 ml-1" /> {(gruppo as any).quartiere}</>}
            </div>
          </div>
          {user && !myMembership && (
            <Button size="sm" onClick={() => joinGroup.mutate()} disabled={joinGroup.isPending}>
              <UserPlus className="w-4 h-4 mr-1" /> Unisciti
            </Button>
          )}
          {isPending && <Badge variant="secondary">In attesa</Badge>}
          {isMember && !isGroupAdmin && (
            <Button variant="outline" size="sm" onClick={() => leaveGroup.mutate()}>
              <LogOut className="w-4 h-4 mr-1" /> Esci
            </Button>
          )}
          {canEditOrDelete && (
            <>
              <Button variant="ghost" size="icon" onClick={openEditDialog}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </>
          )}
        </div>

        {/* Content */}
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-fit">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="membri">Membri ({memberUserIds.length})</TabsTrigger>
            {isGroupAdmin && pendingMembers.length > 0 && (
              <TabsTrigger value="richieste">
                Richieste <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{pendingMembers.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0">
            {!isMember ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                {isPending ? "La tua richiesta è in attesa di approvazione." : "Unisciti al gruppo per vedere i messaggi."}
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                  {(messaggi as any[]).length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full text-muted-foreground text-sm">
                      Nessun messaggio. Inizia la conversazione!
                    </div>
                  ) : (
                    (messaggi as any[]).map((msg, index, arr) => {
                      const isMine = msg.mittente_id === user?.id;
                      const p = profileMap[msg.mittente_id];
                      const initials = p ? `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase() : "U";
                      const displayName = p ? `${p.nome || ""}${p.cognome ? ` ${p.cognome[0]}.` : ""}`.trim() || "Utente" : "Utente";
                      
                      // Reply preview
                      const parentMsg = msg.parent_id ? (messaggi as any[]).find((m) => m.id === msg.parent_id) : null;
                      const parentProfile = parentMsg ? profileMap[parentMsg.mittente_id] : null;
                      const parentName = parentProfile ? `${parentProfile.nome || "Utente"} ${parentProfile.cognome || ""}`.trim() : "Utente";

                      return (
                        <div
                          key={msg.id}
                          id={`message-${msg.id}`}
                          data-last-message={index === arr.length - 1 ? "true" : undefined}
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} group transition-all duration-300`}
                        >
                          {!isMine && (
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={p?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {isMine && (
                            <div className="order-last">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={p?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                          <div className="flex flex-col">
                          <div className={`max-w-[75%] rounded-2xl text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                            {/* Reply preview */}
                            {parentMsg && (
                              <div className={`px-3 pt-2 pb-1 text-xs rounded-t-2xl ${isMine ? "bg-primary/80" : "bg-muted/80"}`}>
                                <div className={`border-l-2 pl-2 ${isMine ? "border-primary-foreground/40" : "border-primary/50"}`}>
                                  <span className={`font-semibold ${isMine ? "text-primary-foreground/90" : "text-primary"}`}>{parentName}</span>
                                  <p className={`truncate ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {parentMsg.testo?.slice(0, 60)}{parentMsg.testo?.length > 60 ? "…" : ""}
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="px-3 py-2">
                              {!isMine && <p className="text-xs font-medium mb-1 opacity-70">{displayName}</p>}
                              <p>{msg.testo}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                          {getGroupLikeCount(msg.id) > 0 && (
                            <div className={`flex ${isMine ? "justify-end" : "justify-start"} -mt-1`}>
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-card border rounded-full px-1.5 py-0.5 shadow-sm">
                                <Heart className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                                {getGroupLikeCount(msg.id)}
                              </span>
                            </div>
                          )}
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-2">
                            <button
                              onClick={() => handleReply(msg)}
                              className="text-muted-foreground hover:text-primary"
                              title="Rispondi"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleGroupLike(msg.id)}
                              className={`transition-colors ${hasGroupLiked(msg.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                              title="Mi piace"
                            >
                              <Heart className={`w-3.5 h-3.5 ${hasGroupLiked(msg.id) ? "fill-red-500" : ""}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Input area */}
                <div className="px-4 py-3 border-t bg-card">
                  {replyTo && (
                    <div className="flex items-center gap-2 bg-muted/60 rounded-t-lg px-3 py-2 text-xs border border-b-0">
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
                    <Button size="icon" onClick={() => sendMessage.mutate()} disabled={!text.trim() || sendMessage.isPending} className="shrink-0">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="membri" className="px-4 py-4">
            <div className="space-y-2">
              {memberUserIds.map((uid: string) => {
                const p = memberProfileMap[uid];
                const m = (membri as any[]).find((mm) => mm.user_id === uid);
                const isCreatore = (gruppo as any)?.creatore_id === uid;
                return (
                  <div key={uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={p?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {p ? `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p?.nome || "Utente"} {p?.cognome || ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCreatore && <Badge variant="default" className="text-xs">Creatore</Badge>}
                      {m?.ruolo === "admin" && !isCreatore && <Badge variant="secondary">Admin</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {isGroupAdmin && (
            <TabsContent value="richieste" className="px-4 py-4">
              <div className="space-y-2">
                {pendingMembers.map((m: any) => {
                  const pp = pendingProfileMap[m.user_id];
                  const pInitials = pp ? `${(pp.nome || "U")[0]}${(pp.cognome || "")[0]}`.toUpperCase() : "U";
                  const pName = pp ? `${pp.nome || "Utente"} ${pp.cognome || ""}`.trim() : "Utente";
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Avatar className="h-9 w-9"><AvatarImage src={pp?.avatar_url || undefined} /><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{pInitials}</AvatarFallback></Avatar>
                      <p className="flex-1 text-sm font-medium">{pName}</p>
                      <Button size="icon" variant="ghost" onClick={() => handleMemberAction.mutate({ memberId: m.id, action: "approvato" })}>
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleMemberAction.mutate({ memberId: m.id, action: "rifiutato" })}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica gruppo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={editNome} onChange={(e) => setEditNome(e.target.value)} /></div>
            <div><Label>Descrizione</Label><Textarea value={editDescrizione} onChange={(e) => setEditDescrizione(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Immagine</Label>
              <div className="flex gap-2">
                <Input placeholder="URL immagine" value={editImmagine} onChange={(e) => setEditImmagine(e.target.value)} className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => setEditShowAiPrompt(!editShowAiPrompt)} className="shrink-0 gap-1">
                  <Sparkles className="w-4 h-4" /> AI
                </Button>
              </div>
              {editShowAiPrompt && (
                <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                  <Input placeholder="Descrivi l'immagine..." value={editAiPrompt} onChange={(e) => setEditAiPrompt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generateEditImage()} className="flex-1" disabled={editIsGenerating} />
                  <Button size="sm" onClick={generateEditImage} disabled={!editAiPrompt.trim() || editIsGenerating}>
                    {editIsGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Genera"}
                  </Button>
                </div>
              )}
              {editImmagine && (
                <div className="flex justify-center">
                  <img src={editImmagine} alt="Anteprima" className="max-w-[150px] max-h-[150px] rounded-lg object-cover border" onError={(e) => (e.currentTarget.style.display = "none")} onLoad={(e) => (e.currentTarget.style.display = "block")} />
                </div>
              )}
            </div>
            <div><Label>Tipo</Label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={editTipo} onChange={(e) => setEditTipo(e.target.value as any)}>
                <option value="pubblico">Pubblico</option><option value="privato">Privato</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Annulla</Button>
            <Button onClick={() => updateGruppo.mutate()} disabled={!editNome.trim() || updateGruppo.isPending}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Elimina gruppo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Sei sicuro di voler eliminare questo gruppo? L'azione è irreversibile.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annulla</Button>
            <Button variant="destructive" onClick={() => deleteGruppo.mutate()} disabled={deleteGruppo.isPending}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GruppoDetail;
