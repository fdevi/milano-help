import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Camera, MapPin, CalendarDays, Heart, FileText, Save,
  Loader2, User, Bell, Shield, Eye, Mail, Phone, Pencil, Trash2, Plus, Clock, CheckCircle, XCircle, AlertTriangle, CalendarClock, RefreshCw, Train,
} from "lucide-react";
import { useFermatePreferite } from "@/hooks/useFermatePreferite";
import OneSignalDiagnostics from "@/components/OneSignalDiagnostics";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQuartieri } from "@/hooks/useQuartieri";
import { Link, useNavigate } from "react-router-dom";
import EventStatusBadge from "@/components/EventStatusBadge";
import { abbreviaIndirizzo, formatDateRangeCompact } from "@/lib/formatMobile";

// ── Profile fetching ──
async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles").select("*").eq("user_id", userId).single();
  if (error) throw error;
  return data;
}

async function fetchStats(userId: string) {
  const { data: annunci } = await supabase.from("annunci").select("id").eq("user_id", userId);
  const annunciCount = annunci?.length || 0;
  let likeCount = 0;
  if (annunci && annunci.length > 0) {
    const ids = annunci.map((a) => a.id);
    const { data: likes } = await supabase.from("annunci_mi_piace").select("annuncio_id").in("annuncio_id", ids);
    likeCount = likes?.length || 0;
  }
  return { annunciCount, likeCount };
}

const Profilo = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { quartieri, aree } = useQuartieri();
  const [quartiereSearch, setQuartiereSearch] = useState("");
  const [showQuartiereSuggestions, setShowQuartiereSuggestions] = useState(false);
  const quartiereRef = useRef<HTMLDivElement>(null);
  const [deleteAnnuncioId, setDeleteAnnuncioId] = useState<string | null>(null);
  const [deletingAnnuncio, setDeletingAnnuncio] = useState(false);
  const [deleteEventoId, setDeleteEventoId] = useState<string | null>(null);
  const [deletingEvento, setDeletingEvento] = useState(false);
  const [prorogaAnnuncioId, setProrogaAnnuncioId] = useState<string | null>(null);
  const [prorogandoAnnuncio, setProrogandoAnnuncio] = useState(false);

  const [form, setForm] = useState({
    nome: "", cognome: "", username: "", telefono: "", quartiere: "",
    sesso: "", data_nascita: "", indirizzo: "", civico: "", cap: "", citta: "",
  });

  const [prefs, setPrefs] = useState({
    notifiche_email: true, notifiche_push: true, newsletter: false,
    profilo_pubblico: true, mostra_email: false, mostra_telefono: false,
  });

  const [uploading, setUploading] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [passwordForEmail, setPasswordForEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdatingEmail(true);
    
    // Verifica password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: passwordForEmail,
    });
    if (signInError) {
      toast({ title: "Errore", description: "Password non corretta", variant: "destructive" });
      setUpdatingEmail(false);
      return;
    }

    try {
      // Genera token e salva nel DB
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 ora

      const { error: insertError } = await supabase.from('email_changes').insert({
        user_id: user.id,
        old_email: user.email!,
        new_email: newEmail,
        token,
        expires_at: expiresAt,
      });

      if (insertError) throw insertError;

      // Invia email di conferma al NUOVO indirizzo
      const confirmLink = `${window.location.origin}/confirm-email-change?token=${token}`;
      
      const { error: fnError } = await supabase.functions.invoke('send-auth-email', {
        body: {
          to: newEmail,
          type: 'email_change',
          data: { confirmLink, newEmail },
        },
      });

      if (fnError) throw fnError;

      toast({ title: "Verifica richiesta", description: "Controlla la tua nuova casella email per confermare il cambio." });
      setShowEmailForm(false);
      setNewEmail("");
      setPasswordForEmail("");
    } catch (err: any) {
      toast({ title: "Errore", description: err.message || "Errore durante il cambio email", variant: "destructive" });
    }
    setUpdatingEmail(false);
  };

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", user?.id],
    queryFn: () => fetchStats(user!.id),
    enabled: !!user,
  });

  const { data: mieAnnunci, refetch: refetchAnnunci } = useQuery({
    queryKey: ["profile-annunci", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("annunci")
        .select("*, categoria:categorie_annunci(label)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: tuttiEventi, refetch: refetchEventi } = useQuery({
    queryKey: ["profilo-eventi-tutti"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventi")
        .select("*")
        .eq("stato", "attivo")
        .order("data", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { preferiti: preferitiFermate } = useFermatePreferite();

  const handleDeleteAnnuncio = async () => {
    if (!deleteAnnuncioId) return;
    setDeletingAnnuncio(true);
    const { error } = await supabase.from("annunci").delete().eq("id", deleteAnnuncioId);
    setDeletingAnnuncio(false);
    setDeleteAnnuncioId(null);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'annuncio.", variant: "destructive" });
    } else {
      toast({ title: "Annuncio eliminato" });
      refetchAnnunci();
      queryClient.invalidateQueries({ queryKey: ["annunci"] });
      queryClient.invalidateQueries({ queryKey: ["profile-stats", user?.id] });
    }
  };

  const handleProrogaAnnuncio = async () => {
    if (!prorogaAnnuncioId || !mieAnnunci) return;
    setProrogandoAnnuncio(true);
    const annuncio = mieAnnunci.find((a: any) => a.id === prorogaAnnuncioId);
    if (!annuncio?.data_scadenza) { setProrogandoAnnuncio(false); setProrogaAnnuncioId(null); return; }
    const newDate = new Date(annuncio.data_scadenza);
    newDate.setDate(newDate.getDate() + 30);
    const { error } = await supabase.from("annunci").update({
      data_scadenza: newDate.toISOString(),
      proroghe_effettuate: (annuncio.proroghe_effettuate || 0) + 1,
    }).eq("id", prorogaAnnuncioId);
    setProrogandoAnnuncio(false);
    setProrogaAnnuncioId(null);
    if (error) {
      toast({ title: "Errore", description: "Impossibile prorogare l'annuncio.", variant: "destructive" });
    } else {
      toast({ title: "Annuncio prorogato", description: "La scadenza è stata estesa di 30 giorni." });
      refetchAnnunci();
    }
  };

  const handleDeleteEvento = async () => {
    if (!deleteEventoId) return;
    setDeletingEvento(true);
    const { error } = await supabase.from("eventi").delete().eq("id", deleteEventoId);
    setDeletingEvento(false);
    setDeleteEventoId(null);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'evento.", variant: "destructive" });
    } else {
      toast({ title: "Evento eliminato" });
      refetchEventi();
    }
  };

  useEffect(() => {
    if (profile) {
      console.log("🖼️ Profilo: avatar_url dal DB:", profile.avatar_url);
      setForm({
        nome: profile.nome || "", cognome: profile.cognome || "",
        username: profile.username || "", telefono: profile.telefono || "",
        quartiere: profile.quartiere || "", sesso: profile.sesso || "",
        data_nascita: profile.data_nascita || "", indirizzo: profile.indirizzo || "",
        civico: profile.civico || "", cap: profile.cap || "", citta: profile.citta || "",
      });
      setPrefs({
        notifiche_email: profile.notifiche_email ?? true,
        notifiche_push: profile.notifiche_push ?? true,
        newsletter: profile.newsletter ?? false,
        profilo_pubblico: profile.profilo_pubblico ?? true,
        mostra_email: profile.mostra_email ?? false,
        mostra_telefono: profile.mostra_telefono ?? false,
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profilo aggiornato", description: "Le modifiche sono state salvate." });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare le modifiche.", variant: "destructive" });
    },
  });

  const handleSaveData = () => {
    const cleanedForm: Record<string, unknown> = { ...form };
    // Convert empty strings to null for nullable fields
    if (cleanedForm.data_nascita === "") cleanedForm.data_nascita = null;
    if (cleanedForm.sesso === "") cleanedForm.sesso = null;
    if (cleanedForm.quartiere === "") cleanedForm.quartiere = null;
    if (cleanedForm.indirizzo === "") cleanedForm.indirizzo = null;
    if (cleanedForm.civico === "") cleanedForm.civico = null;
    if (cleanedForm.cap === "") cleanedForm.cap = null;
    if (cleanedForm.citta === "") cleanedForm.citta = null;
    saveMutation.mutate(cleanedForm);
  };
  const handleSavePrefs = () => saveMutation.mutate(prefs);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) { toast({ title: "Errore upload", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
    if (updateError) { toast({ title: "Errore", description: "Upload riuscito ma impossibile aggiornare il profilo.", variant: "destructive" }); }
    else { queryClient.invalidateQueries({ queryKey: ["profile", user.id] }); toast({ title: "Foto aggiornata" }); }
    setUploading(false);
  };

  if (profileLoading) {
    return (
      <AuthLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /></div>
            </div>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  const initials = `${(profile?.nome || "U")[0]}${(profile?.cognome || "")[0]}`.toUpperCase();
  const memberSince = profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy", { locale: it }) : "";

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Header Card ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  {uploading ? <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" /> : <Camera className="w-6 h-6 text-primary-foreground" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-xl font-heading font-bold text-foreground">{profile?.nome || ""} {profile?.cognome || ""}</h1>
                {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-muted-foreground">
                  {profile?.quartiere && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.quartiere}</span>}
                  {memberSince && <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Iscritto da {memberSince}</span>}
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-heading font-bold text-foreground">{stats?.annunciCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Annunci</p>
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-primary">{stats?.likeCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Heart className="w-3 h-3" /> Like</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="dati" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto min-h-10 p-1 gap-1">
            <TabsTrigger value="dati" className="gap-1.5 flex-1 min-w-[110px] sm:min-w-0"><User className="w-4 h-4" /> <span className="whitespace-nowrap">I miei dati</span></TabsTrigger>
            <TabsTrigger value="annunci" className="gap-1.5 flex-1 min-w-[110px] sm:min-w-0"><FileText className="w-4 h-4" /> <span className="whitespace-nowrap">Annunci</span></TabsTrigger>
            <TabsTrigger value="eventi" className="gap-1.5 flex-1 min-w-[110px] sm:min-w-0"><CalendarDays className="w-4 h-4" /> <span className="whitespace-nowrap">Eventi</span></TabsTrigger>
            <TabsTrigger value="fermate" className="gap-1.5 flex-1 min-w-[110px] sm:min-w-0"><Train className="w-4 h-4" /> <span className="whitespace-nowrap">Fermate</span></TabsTrigger>
            <TabsTrigger value="preferenze" className="gap-1.5 flex-1 min-w-[110px] sm:min-w-0"><Shield className="w-4 h-4" /> <span className="whitespace-nowrap">Preferenze</span></TabsTrigger>
          </TabsList>

          {/* ── Tab: I miei dati ── */}
          <TabsContent value="dati">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 shadow-card space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label htmlFor="nome">Nome</Label><Input id="nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="cognome">Cognome</Label><Input id="cognome" value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="username">Username</Label><Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label htmlFor="telefono">Telefono</Label><Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sesso">Sesso</Label>
                    <Select value={form.sesso} onValueChange={(v) => setForm({ ...form, sesso: v })}>
                      <SelectTrigger id="sesso"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent><SelectItem value="M">Maschio</SelectItem><SelectItem value="F">Femmina</SelectItem><SelectItem value="altro">Altro</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="data_nascita">Data di nascita</Label><Input id="data_nascita" type="date" value={form.data_nascita} onChange={(e) => setForm({ ...form, data_nascita: e.target.value })} /></div>
                </div>
                <Separator />
                <h3 className="font-heading font-semibold text-foreground text-sm">Indirizzo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative" ref={quartiereRef}>
                    <Label htmlFor="quartiere">Zona di appartenenza</Label>
                    <Input
                      id="quartiere"
                      placeholder="Cerca la tua zona..."
                      value={showQuartiereSuggestions ? quartiereSearch : (form.quartiere || "")}
                      onChange={(e) => {
                        setQuartiereSearch(e.target.value);
                        setShowQuartiereSuggestions(true);
                      }}
                      onFocus={() => {
                        setQuartiereSearch(form.quartiere || "");
                        setShowQuartiereSuggestions(true);
                      }}
                      autoComplete="off"
                    />
                    {form.quartiere && !showQuartiereSuggestions && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {form.quartiere}</p>
                    )}
                    {showQuartiereSuggestions && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {quartieri
                          .filter(q => {
                            const s = quartiereSearch.toLowerCase();
                            return !s || q.nome.toLowerCase().includes(s) || q.area.toLowerCase().includes(s);
                          })
                          .slice(0, 10)
                          .map(q => (
                            <button
                              key={q.nome}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                              onMouseDown={() => {
                                setForm({ ...form, quartiere: q.nome });
                                setShowQuartiereSuggestions(false);
                              }}
                            >
                              <span className="text-foreground">{q.nome}</span>
                              <span className="text-xs text-muted-foreground">{q.area}</span>
                            </button>
                          ))}
                        {quartiereSearch && quartieri.filter(q => q.nome.toLowerCase().includes(quartiereSearch.toLowerCase())).length === 0 && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Nessuna zona trovata</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="citta">Città</Label><Input id="citta" value={form.citta} onChange={(e) => setForm({ ...form, citta: e.target.value })} /></div>
                  <div className="space-y-1.5 sm:col-span-1"><Label htmlFor="indirizzo">Via</Label><Input id="indirizzo" value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label htmlFor="civico">Civico</Label><Input id="civico" value={form.civico} onChange={(e) => setForm({ ...form, civico: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="cap">CAP</Label><Input id="cap" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} /></div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveData} disabled={saveMutation.isPending} className="gap-2">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salva modifiche
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary" /> Email di accesso
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Email attuale: <span className="font-mono text-foreground">{user?.email}</span>
                  </p>

                  {!showEmailForm ? (
                    <Button variant="outline" size="sm" onClick={() => setShowEmailForm(true)}>
                      Cambia email
                    </Button>
                  ) : (
                    <form onSubmit={handleEmailChange} className="space-y-3 max-w-md">
                      <div className="space-y-1.5">
                        <Label htmlFor="new-email">Nuova email</Label>
                        <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password-confirm">Password (per confermare)</Label>
                        <Input id="password-confirm" type="password" value={passwordForEmail} onChange={(e) => setPasswordForEmail(e.target.value)} required />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={updatingEmail}>
                          {updatingEmail ? <><Loader2 className="w-4 h-4 animate-spin" /> Invio...</> : "Conferma cambio"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setShowEmailForm(false); setNewEmail(""); setPasswordForEmail(""); }}>
                          Annulla
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Le mie fermate ── */}
          <TabsContent value="fermate">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 shadow-card space-y-4">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <Train className="w-4 h-4 text-primary" /> Le mie fermate
                </h3>
                <p className="text-sm text-muted-foreground">
                  Le tue fermate preferite. Clicca su una fermata per aprirla sulla mappa.
                </p>
                {!preferitiFermate || preferitiFermate.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-sm text-muted-foreground">Nessuna fermata tra i preferiti.</p>
                    <Link to="/fermate">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Vai alla mappa fermate
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {preferitiFermate.map((pref) => (
                      <li key={pref.id}>
                        <Link
                          to={`/fermate?fermata=${pref.stop_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:shadow-sm transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Train className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{pref.stop_name ?? pref.stop_id}</p>
                          </div>
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {preferitiFermate && preferitiFermate.length > 0 && (
                  <div className="pt-2">
                    <Link to="/fermate">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Apri mappa fermate
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Preferenze ── */}
          <TabsContent value="preferenze">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 shadow-card space-y-6">
                <div>
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-primary" /> Notifiche</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Notifiche email</p><p className="text-xs text-muted-foreground">Ricevi aggiornamenti via email</p></div>
                      <Switch checked={prefs.notifiche_email} onCheckedChange={(v) => setPrefs({ ...prefs, notifiche_email: v })} />
                    </div>
                     <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Notifiche push</p><p className="text-xs text-muted-foreground">Ricevi notifiche nel browser</p></div>
                      <Switch checked={prefs.notifiche_push} onCheckedChange={(v) => setPrefs({ ...prefs, notifiche_push: v })} />
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-border p-2 text-xs">
                      {(window as any).oneSignalReady
                        ? <span className="text-green-600 font-medium">✅ OneSignal attivo</span>
                        : <span className="text-amber-600 font-medium">⏳ OneSignal in caricamento…</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Attiva notifiche push</p><p className="text-xs text-muted-foreground">Abilita il permesso per ricevere notifiche push sul dispositivo</p></div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={async () => {
                          const w = window as any;
                          const waitForOneSignal = () => new Promise<void>((resolve, reject) => {
                            let attempts = 0;
                            const check = () => {
                              if (w.oneSignalReady && w.OneSignal?.Notifications) {
                                resolve();
                              } else if (attempts++ >= 10) {
                                reject(new Error("timeout"));
                              } else {
                                setTimeout(check, 1000);
                              }
                            };
                            check();
                          });
                          try {
                            toast({ title: "Inizializzazione in corso...", description: "Attendi qualche secondo." });
                            await waitForOneSignal();
                            const permission = await w.OneSignal.Notifications.requestPermission();
                            console.log("[OneSignal] Permission result:", permission);
                            toast({ title: permission ? "Notifiche attivate!" : "Permesso negato", description: permission ? "Riceverai le notifiche push." : "Puoi abilitarle dalle impostazioni del dispositivo." });
                          } catch {
                            toast({ title: "Errore", description: "Il servizio notifiche non è disponibile. Riprova più tardi.", variant: "destructive" });
                          }
                        }}
                      >
                        <Bell className="w-4 h-4" /> Attiva
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Newsletter</p><p className="text-xs text-muted-foreground">Ricevi la newsletter settimanale</p></div>
                      <Switch checked={prefs.newsletter} onCheckedChange={(v) => setPrefs({ ...prefs, newsletter: v })} />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-primary" /> Privacy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Profilo pubblico</p><p className="text-xs text-muted-foreground">Rendi il tuo profilo visibile agli altri</p></div>
                      <Switch checked={prefs.profilo_pubblico} onCheckedChange={(v) => setPrefs({ ...prefs, profilo_pubblico: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Mostra email</p><p className="text-xs text-muted-foreground">Mostra la tua email nel profilo</p></div>
                      <Switch checked={prefs.mostra_email} onCheckedChange={(v) => setPrefs({ ...prefs, mostra_email: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Mostra telefono</p><p className="text-xs text-muted-foreground">Mostra il tuo numero nel profilo</p></div>
                      <Switch checked={prefs.mostra_telefono} onCheckedChange={(v) => setPrefs({ ...prefs, mostra_telefono: v })} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSavePrefs} disabled={saveMutation.isPending} className="gap-2">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salva preferenze
                  </Button>
                </div>
              </Card>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Badge icona app</h4>
                <p className="text-xs text-muted-foreground">Se il badge sull'icona mostra un numero errato, puoi azzerarlo manualmente.</p>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={resettingBadge}
                  onClick={async () => {
                    setResettingBadge(true);
                    try {
                      if ("clearAppBadge" in navigator) await (navigator as any).clearAppBadge().catch(() => {});
                      if ("setAppBadge" in navigator) await (navigator as any).setAppBadge(0).catch(() => {});
                      window.dispatchEvent(new Event("badge-update"));
                      toast({ title: "✅ Badge resettato", description: "Il badge è stato azzerato. Verrà aggiornato con i dati corretti." });
                    } catch {
                      toast({ title: "❌ Errore", description: "Impossibile resettare il badge", variant: "destructive" });
                    } finally {
                      setResettingBadge(false);
                    }
                  }}
                >
                  {resettingBadge ? <><Loader2 className="w-4 h-4 animate-spin" /> Reset in corso...</> : <><RefreshCw className="w-4 h-4" /> Resetta badge icona</>}
                </Button>
              </div>
              <div className="mt-4">
                <OneSignalDiagnostics />
              </div>
            </motion.div>
          </TabsContent>

          {/* ── Tab: I miei annunci ── */}
          <TabsContent value="annunci">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> I miei annunci
                  </h3>
                  <Link to="/nuovo-annuncio">
                    <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nuovo</Button>
                  </Link>
                </div>

                {!mieAnnunci || mieAnnunci.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Non hai ancora pubblicato annunci.</p>
                ) : (
                  <div className="space-y-3">
                    {mieAnnunci.map((a: any) => {
                      const statoMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
                        in_moderazione: { label: "In moderazione", variant: "secondary", icon: Clock },
                        attivo: { label: "Attivo", variant: "default", icon: CheckCircle },
                        rifiutato: { label: "Rifiutato", variant: "destructive", icon: XCircle },
                        chiuso: { label: "Chiuso", variant: "outline", icon: AlertTriangle },
                      };
                      const config = statoMap[a.stato] ?? statoMap.chiuso;
                      const StatusIcon = config.icon;
                      const firstImg = a.immagini?.filter(Boolean)?.[0];
                      return (
                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                          <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            {firstImg ? (
                              <img src={firstImg} alt={a.titolo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-[10px]">No img</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link to={`/annuncio/${a.id}`} className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">{a.titolo}</Link>
                            <p className="text-xs text-muted-foreground">
                              {new Date(a.created_at).toLocaleDateString("it-IT")}
                              {a.prezzo != null && ` · €${a.prezzo}`}
                            </p>
                            {/* Expiry info */}
                            {a.stato === "attivo" && a.data_scadenza && (() => {
                              const daysLeft = differenceInDays(new Date(a.data_scadenza), new Date());
                              return (
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarClock className="w-3 h-3" />
                                    Scade: {format(new Date(a.data_scadenza), "dd MMM yyyy", { locale: it })}
                                  </span>
                                  {daysLeft <= 7 ? (
                                    <Badge variant="destructive" className="text-xs">
                                      {daysLeft <= 0 ? "Scaduto" : `Scade tra ${daysLeft} giorni`}
                                    </Badge>
                                  ) : daysLeft <= 14 ? (
                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                      Scade tra {daysLeft} giorni
                                    </Badge>
                                  ) : null}
                                  {daysLeft <= 7 && (
                                    <Button size="sm" variant="outline" className="h-5 text-[10px] gap-1 px-1.5" onClick={() => setProrogaAnnuncioId(a.id)}>
                                      <RefreshCw className="w-3 h-3" /> Proroga 30gg
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                            {a.stato === "chiuso" && a.data_scadenza && new Date(a.data_scadenza) < new Date() && (
                              <p className="text-xs text-destructive mt-1">Annuncio scaduto</p>
                            )}
                          </div>
                          <Badge variant={config.variant} className="gap-1 text-xs shrink-0">
                            <StatusIcon className="w-3 h-3" /> {config.label}
                          </Badge>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/modifica-annuncio/${a.id}`)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteAnnuncioId(a.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Tab: Eventi ── */}
          <TabsContent value="eventi">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-6 shadow-card space-y-4">
                <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Eventi
                </h3>
                {!tuttiEventi || tuttiEventi.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nessun evento disponibile.</p>
                ) : (
                  <div className="space-y-3">
                    {tuttiEventi.map((ev: any) => (
                      <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                        <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {ev.immagine ? (
                            <img src={ev.immagine} alt={ev.titolo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <CalendarDays className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={`/evento/${ev.id}`} className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">{ev.titolo}</Link>
                            <EventStatusBadge dataInizio={ev.data} dataFine={ev.fine} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ev.fine
                              ? formatDateRangeCompact(new Date(ev.data), new Date(ev.fine))
                              : new Date(ev.data).toLocaleDateString("it-IT")} · {abbreviaIndirizzo(ev.luogo)}
                            {ev.gratuito ? " · Gratuito" : ev.prezzo != null ? ` · €${ev.prezzo}` : ""}
                          </p>
                        </div>
                        {user?.id === ev.organizzatore_id && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/modifica-evento/${ev.id}`)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteEventoId(ev.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Delete annuncio dialog */}
        <Dialog open={!!deleteAnnuncioId} onOpenChange={() => setDeleteAnnuncioId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Elimina annuncio</DialogTitle>
              <DialogDescription>Sei sicuro di voler eliminare questo annuncio? L'azione non è reversibile.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAnnuncioId(null)}>Annulla</Button>
              <Button variant="destructive" onClick={handleDeleteAnnuncio} disabled={deletingAnnuncio}>
                {deletingAnnuncio ? "Eliminazione..." : "Elimina"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Proroga annuncio dialog */}
        <Dialog open={!!prorogaAnnuncioId} onOpenChange={() => setProrogaAnnuncioId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Proroga annuncio</DialogTitle>
              <DialogDescription>Vuoi prorogare la scadenza di questo annuncio di 30 giorni?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProrogaAnnuncioId(null)}>Annulla</Button>
              <Button onClick={handleProrogaAnnuncio} disabled={prorogandoAnnuncio}>
                {prorogandoAnnuncio ? "Proroga in corso..." : "Conferma proroga"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete evento dialog */}
        <Dialog open={!!deleteEventoId} onOpenChange={() => setDeleteEventoId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Elimina evento</DialogTitle>
              <DialogDescription>Sei sicuro di voler eliminare questo evento? L'azione non è reversibile.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteEventoId(null)}>Annulla</Button>
              <Button variant="destructive" onClick={handleDeleteEvento} disabled={deletingEvento}>
                {deletingEvento ? "Eliminazione..." : "Elimina"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthLayout>
  );
};

export default Profilo;
