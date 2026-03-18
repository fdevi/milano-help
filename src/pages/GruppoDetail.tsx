import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, Lock, Globe, MapPin, UserPlus, LogOut, Check, X, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { sendPushNotification } from "@/lib/pushNotification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PostComposer from "@/components/gruppi/PostComposer";
import PostCard from "@/components/gruppi/PostCard";

const GruppoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editDescrizione, setEditDescrizione] = useState("");
  const [editImmagine, setEditImmagine] = useState("");
  const [editTipo, setEditTipo] = useState<"pubblico" | "privato">("pubblico");
  const [editCategoria, setEditCategoria] = useState("");
  const [editQuartiere, setEditQuartiere] = useState("");
  const [editAiPrompt, setEditAiPrompt] = useState("");
  const [editIsGenerating, setEditIsGenerating] = useState(false);
  const [editShowAiPrompt, setEditShowAiPrompt] = useState(false);
  const [editUploadingFile, setEditUploadingFile] = useState(false);

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
      toast({ title: "Errore", description: err?.message || "Impossibile generare.", variant: "destructive" });
    } finally {
      setEditIsGenerating(false);
    }
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Seleziona un'immagine", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Max 5MB", variant: "destructive" }); return; }
    setEditUploadingFile(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gruppi/avatar-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("annunci-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("annunci-images").getPublicUrl(path);
      setEditImmagine(data.publicUrl);
      toast({ title: "Immagine caricata!" });
    } catch (err: any) {
      toast({ title: "Errore upload", description: err?.message, variant: "destructive" });
    } finally {
      setEditUploadingFile(false);
      if (e.target) e.target.value = "";
    }
  };

  // --- Data queries ---
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
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").in("user_id", memberUserIds);
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

  // Posts (messaggi) - newest first for feed
  const { data: messaggi = [] } = useQuery({
    queryKey: ["gruppo_messaggi", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gruppi_messaggi")
        .select("*")
        .eq("gruppo_id", id!)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id && isMember,
  });

  // Likes
  const groupMsgIds = (messaggi as any[]).map((m) => m.id);
  const { data: groupLikes = [] } = useQuery({
    queryKey: ["gruppi_messaggi_piace", id],
    queryFn: async () => {
      if (groupMsgIds.length === 0) return [];
      const { data } = await supabase.from("gruppi_messaggi_piace").select("messaggio_id, user_id").in("messaggio_id", groupMsgIds);
      return data || [];
    },
    enabled: !!id && isMember && groupMsgIds.length > 0,
  });

  // Comment counts
  const { data: commentCounts = [] } = useQuery({
    queryKey: ["post_comment_counts", id],
    queryFn: async () => {
      if (groupMsgIds.length === 0) return [];
      const { data } = await supabase
        .from("gruppi_post_commenti" as any)
        .select("post_id")
        .in("post_id", groupMsgIds);
      return (data || []) as any[];
    },
    enabled: !!id && isMember && groupMsgIds.length > 0,
  });

  const getCommentCount = (postId: string) => (commentCounts as any[]).filter((c: any) => c.post_id === postId).length;

  const handleToggleGroupLike = async (messageId: string) => {
    if (!user) return;
    const existing = (groupLikes as any[]).find((l: any) => l.messaggio_id === messageId && l.user_id === user.id);
    if (existing) {
      await supabase.from("gruppi_messaggi_piace").delete().eq("messaggio_id", messageId).eq("user_id", user.id);
    } else {
      await supabase.from("gruppi_messaggi_piace").insert({ messaggio_id: messageId, user_id: user.id } as any);
      try {
        const msg = (messaggi as any[]).find((m) => m.id === messageId);
        if (msg && msg.mittente_id !== user.id) {
          const p = profileMap[user.id];
          const myName = p ? `${p.nome || ""} ${p.cognome || ""}`.trim() || "Utente" : "Utente";
          sendPushNotification(msg.mittente_id, "Nuovo like", `${myName} ha messo like al tuo post`, `/gruppo/${id}?message=${messageId}`);
        }
      } catch (e) {
        console.warn("[push] group like push failed:", e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["gruppi_messaggi_piace", id] });
  };

  const getGroupLikeCount = (msgId: string) => (groupLikes as any[]).filter((l: any) => l.messaggio_id === msgId).length;
  const hasGroupLiked = (msgId: string) => (groupLikes as any[]).some((l: any) => l.messaggio_id === msgId && l.user_id === user?.id);

  // Profiles for posts
  const msgUserIds = [...new Set((messaggi as any[]).map((m) => m.mittente_id))];
  const { data: msgProfiles = [] } = useQuery({
    queryKey: ["msg_profiles", msgUserIds.join(",")],
    queryFn: async () => {
      if (msgUserIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, nome, cognome, avatar_url, quartiere").in("user_id", msgUserIds);
      return data || [];
    },
    enabled: msgUserIds.length > 0,
  });
  const profileMap = Object.fromEntries((msgProfiles as any[]).map((p) => [p.user_id, p]));
  const memberProfileMap = Object.fromEntries((memberProfiles as any[]).map((p) => [p.user_id, p]));

  // Pending members
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

  // Mark as read
  const segnaComeLetto = async () => {
    if (!user || !id || !isMember) return;
    const now = new Date().toISOString();
    await supabase.from("messaggi_letti").upsert(
      { user_id: user.id, gruppo_id: id, ultimo_letto: now, updated_at: now } as any,
      { onConflict: "user_id,gruppo_id" }
    );
  };

  useEffect(() => {
    if (isMember && messaggi.length > 0) segnaComeLetto();
  }, [isMember, messaggi]);

  // Realtime
  useEffect(() => {
    if (!id || !isMember) return;
    const channel = supabase
      .channel(`gruppo-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gruppi_messaggi", filter: `gruppo_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });
        queryClient.invalidateQueries({ queryKey: ["msg_profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gruppi_messaggi_piace" }, () => {
        queryClient.invalidateQueries({ queryKey: ["gruppi_messaggi_piace", id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "gruppi_post_commenti" }, () => {
        queryClient.invalidateQueries({ queryKey: ["post_comment_counts", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, isMember, queryClient]);

  // Scroll to specific message on ?message=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const messageId = params.get("message");
    if (!messageId || !(messaggi as any[]).length) return;

    const targetId = `message-${messageId}`;
    let attempts = 0;

    const tryScroll = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "rounded-lg");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 3000);
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        window.history.replaceState({}, "", url.toString());
        return;
      }
      attempts++;
      if (attempts < 20) setTimeout(tryScroll, 200);
    };

    setTimeout(tryScroll, 300);
  }, [messaggi, location.search]);

  // --- Mutations ---
  const joinGroup = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Devi effettuare l'accesso.");
      const { data: existing } = await supabase.from("gruppi_membri").select("stato").eq("gruppo_id", id!).eq("user_id", user.id).maybeSingle();
      if (existing) {
        if (existing.stato === "approvato") throw new Error("Sei già membro.");
        if (existing.stato === "in_attesa") throw new Error("Richiesta già inviata.");
      }
      const tipo = (gruppo as any)?.tipo ?? "pubblico";
      const stato = tipo === "privato" ? "in_attesa" : "approvato";
      const { error } = await supabase.from("gruppi_membri").insert({ gruppo_id: id!, user_id: user.id, ruolo: "membro", stato } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gruppo_membri", id] });
      queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] });
      const tipo = (gruppo as any)?.tipo;
      toast({ title: tipo === "privato" ? "Richiesta inviata!" : "Ti sei unito al gruppo!" });
    },
    onError: (err: any) => toast({ title: "Errore", description: err?.message, variant: "destructive" }),
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
    onError: (err: any) => toast({ title: "Errore", description: err?.message, variant: "destructive" }),
  });

  const deleteGruppo = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("gruppi").delete().eq("id", id!); if (error) throw error; },
    onSuccess: () => { setShowDeleteConfirm(false); queryClient.invalidateQueries({ queryKey: ["gruppi"] }); queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] }); toast({ title: "Gruppo eliminato." }); navigate("/gruppi"); },
    onError: (err: any) => toast({ title: "Errore", description: err?.message, variant: "destructive" }),
  });

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("gruppi_messaggi").delete().eq("id", postId);
    if (error) { toast({ title: "Errore eliminazione", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });
    toast({ title: "Post eliminato." });
  };

  if (!gruppo) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24"><p className="text-muted-foreground">Caricamento...</p></div>
    </div>
  );

  const myProfile = user ? memberProfileMap[user.id] || profileMap[user.id] : null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
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
        <Tabs defaultValue="feed" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 w-fit">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="membri">Membri ({memberUserIds.length})</TabsTrigger>
            {isGroupAdmin && pendingMembers.length > 0 && (
              <TabsTrigger value="richieste">
                Richieste <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">{pendingMembers.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="feed" className="flex-1 flex flex-col mt-0 overflow-y-auto">
            {!isMember ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
                {isPending ? "La tua richiesta è in attesa di approvazione." : "Unisciti al gruppo per vedere i post."}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto w-full pb-8">
                {/* Post composer */}
                <PostComposer
                  gruppoId={id!}
                  members={memberProfiles as any[]}
                  myProfile={myProfile}
                  onPostCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] });
                    // Push to all members
                    const g = gruppo as any;
                    const myName = myProfile ? `${myProfile.nome || ""} ${(myProfile as any).cognome || ""}`.trim() || "Utente" : "Utente";
                    memberUserIds.filter(uid => uid !== user?.id).forEach(uid => {
                      sendPushNotification(uid, `Nuovo post in ${g.nome}`, `${myName} ha pubblicato un post`, `/gruppo/${id}`);
                    });
                  }}
                />

                {/* Feed */}
                {(messaggi as any[]).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nessun post ancora. Inizia tu!
                  </div>
                ) : (
                  <div className="space-y-4 px-4 mt-2">
                    {(messaggi as any[]).map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        profile={profileMap[post.mittente_id] || null}
                        gruppoId={id!}
                        gruppoNome={(gruppo as any).nome}
                        gruppoQuartiere={(gruppo as any).quartiere}
                        likeCount={getGroupLikeCount(post.id)}
                        commentCount={getCommentCount(post.id)}
                        hasLiked={hasGroupLiked(post.id)}
                        onToggleLike={handleToggleGroupLike}
                        onDelete={deletePost}
                        onPostUpdated={() => queryClient.invalidateQueries({ queryKey: ["gruppo_messaggi", id] })}
                        canDelete={post.mittente_id === user?.id || canEditOrDelete}
                        canEdit={post.mittente_id === user?.id || isGroupAdmin || isSiteAdmin}
                        members={memberProfiles as any[]}
                        myProfile={myProfile}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="membri" className="px-4 py-4">
            <div className="space-y-2 max-w-2xl mx-auto">
              {memberUserIds.map((uid: string) => {
                const p = memberProfileMap[uid];
                const m = (membri as any[]).find((mm) => mm.user_id === uid);
                const isCreatore = (gruppo as any)?.creatore_id === uid;
                const displayName = `${p?.nome || "Utente"} ${p?.cognome || ""}`.trim();
                const displayInitials = p ? `${(p.nome || "U")[0]}${(p.cognome || "")[0]}`.toUpperCase() : "U";
                return (
                  <div key={uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={p?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {displayInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
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
              <div className="space-y-2 max-w-2xl mx-auto">
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
              <div>
                <Label className="text-xs text-muted-foreground">Oppure carica un file</Label>
                <Input type="file" accept="image/*" onChange={handleEditFileUpload} disabled={editUploadingFile} />
                {editUploadingFile && <p className="text-xs text-muted-foreground mt-1">Caricamento...</p>}
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
