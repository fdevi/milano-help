import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Users, Lock, Globe, MapPin, UserPlus, LogOut, Check, X, Pencil, Trash2, Reply, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "emoji-picker-react";

const GruppoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isMember, queryClient]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messaggi]);

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
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      setShowEmoji(false);
      queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });
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
                    (messaggi as any[]).map((msg) => {
                      const isMine = msg.mittente_id === user?.id;
                      const p = profileMap[msg.mittente_id];
                      const initials = p ? `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase() : "U";
                      const displayName = p ? `${p.nome || ""}${p.cognome ? ` ${p.cognome[0]}.` : ""}`.trim() || "Utente" : "Utente";
                      
                      // Reply preview
                      const parentMsg = msg.parent_id ? (messaggi as any[]).find((m) => m.id === msg.parent_id) : null;
                      const parentProfile = parentMsg ? profileMap[parentMsg.mittente_id] : null;
                      const parentName = parentProfile ? `${parentProfile.nome || "Utente"} ${parentProfile.cognome || ""}`.trim() : "Utente";

                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} group`}>
                          {!isMine && (
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={p?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                          )}
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
                          <button
                            onClick={() => handleReply(msg)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0 mb-2"
                            title="Rispondi"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
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
