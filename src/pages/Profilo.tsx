import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Camera, MapPin, CalendarDays, Heart, FileText, Save,
  Loader2, User, Bell, Shield, Eye, Mail, Phone,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQuartieri } from "@/hooks/useQuartieri";

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
  const { quartieri, aree } = useQuartieri();
  const [quartiereSearch, setQuartiereSearch] = useState("");
  const [showQuartiereSuggestions, setShowQuartiereSuggestions] = useState(false);
  const quartiereRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    nome: "", cognome: "", username: "", telefono: "", quartiere: "",
    sesso: "", data_nascita: "", indirizzo: "", civico: "", cap: "", citta: "",
  });

  const [prefs, setPrefs] = useState({
    notifiche_email: true, notifiche_push: true, newsletter: false,
    profilo_pubblico: true, mostra_email: false, mostra_telefono: false,
  });

  const [uploading, setUploading] = useState(false);

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

  const handleSaveData = () => saveMutation.mutate(form);
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

        {/* ── Tabs: solo I miei dati + Preferenze ── */}
        <Tabs defaultValue="dati" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="dati" className="gap-1.5"><User className="w-4 h-4" /> I miei dati</TabsTrigger>
            <TabsTrigger value="preferenze" className="gap-1.5"><Shield className="w-4 h-4" /> Preferenze</TabsTrigger>
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
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AuthLayout>
  );
};

export default Profilo;
