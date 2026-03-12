import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays, MapPin, Users, Clock, Heart, MessageCircle, Share2,
  Loader2, Calendar, Ticket, FileText, ImageIcon, Pencil, Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import EventStatusBadge from "@/components/EventStatusBadge";
import { format } from "date-fns";
import { abbreviaIndirizzo, formatDateRangeCompact } from "@/lib/formatMobile";

// ── Helpers ──

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const statoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  attivo: { label: "Attivo", variant: "default" },
  in_moderazione: { label: "In moderazione", variant: "secondary" },
  rifiutato: { label: "Rifiutato", variant: "destructive" },
  scaduto: { label: "Scaduto", variant: "outline" },
};

async function fetchMyAnnunci(userId: string) {
  const { data, error } = await supabase
    .from("annunci")
    .select("id, titolo, prezzo, immagini, created_at, stato, quartiere, categoria_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Componente PostCard ──

interface PostData {
  id: string; titolo: string; descrizione?: string; prezzo?: number;
  immagini?: string[]; created_at: string; quartiere?: string; user_id: string;
  autore_nome: string; autore_cognome: string; autore_avatar?: string | null;
  autore_quartiere?: string | null; like_count: number; comment_count: number; liked_by_me: boolean;
}

const PostCard = ({ post }: { post: PostData }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const initials = `${(post.autore_nome || "U")[0]}${(post.autore_cognome || "")[0]}`.toUpperCase();
  const displayName = post.autore_nome ? `${post.autore_nome}${post.autore_cognome ? ` ${post.autore_cognome[0]}.` : ""}` : "Utente";
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it });

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    if (newLiked) {
      const { error } = await supabase.from("annunci_mi_piace").insert({ annuncio_id: post.id, user_id: user.id });
      if (error) { setLiked(!newLiked); setLikeCount((c) => c + (newLiked ? -1 : 1)); }
    } else {
      const { error } = await supabase.from("annunci_mi_piace").delete().eq("annuncio_id", post.id).eq("user_id", user.id);
      if (error) { setLiked(!newLiked); setLikeCount((c) => c + (newLiked ? -1 : 1)); }
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.autore_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {post.autore_quartiere && <>{post.autore_quartiere} · {timeAgo}</>}
          </p>
        </div>
      </div>
      <div className="mb-3">
        <p className="font-heading font-bold text-lg">{post.titolo}</p>
        {post.descrizione && <p className="text-sm text-muted-foreground mt-1">{post.descrizione}</p>}
        {post.prezzo != null && post.prezzo > 0 && <Badge className="mt-2">€{post.prezzo.toFixed(2)}</Badge>}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {likeCount}</span>
        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comment_count}</span>
      </div>
      <Separator className="my-2" />
      <div className="flex items-center justify-around pt-2">
        <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? "text-primary" : ""}>
          <Heart className="w-4 h-4 mr-1" fill={liked ? "currentColor" : "none"} /> Mi piace
        </Button>
        <Button variant="ghost" size="sm"><MessageCircle className="w-4 h-4 mr-1" /> Commenta</Button>
        <Button variant="ghost" size="sm"><Share2 className="w-4 h-4 mr-1" /> Condividi</Button>
      </div>
    </Card>
  );
};

// ── Home Page ──

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("feed");
  const [deleteAnnuncioId, setDeleteAnnuncioId] = useState<string | null>(null);
  const [deleteEventoId, setDeleteEventoId] = useState<string | null>(null);

  // Feed cronologico
  const { data: feedData = [], isLoading: feedLoading } = useQuery({
    queryKey: ['home-feed', user?.id],
    queryFn: async () => {
      const { data: annunci } = await supabase
        .from('annunci')
        .select(`*, categorie_annunci (nome, label)`)
        .eq('stato', 'attivo')
        .order('created_at', { ascending: false })
        .limit(30);

      const { data: eventi } = await supabase
        .from('eventi').select('*').eq('stato', 'attivo').order('created_at', { ascending: false }).limit(30);

      const userIds = [
        ...(annunci?.map(a => a.user_id) || []),
        ...(eventi?.map(e => e.organizzatore_id) || [])
      ].filter(Boolean);

      let profiliMap = new Map();
      if (userIds.length > 0) {
        const uniqueIds = [...new Set(userIds)];
        const { data: profili } = await supabase.from('profiles').select('user_id, nome, cognome, avatar_url').in('user_id', uniqueIds);
        profiliMap = new Map(profili?.map(p => [p.user_id, p]) || []);
      }

      const items = [
        ...(annunci?.map(a => {
          const autore = profiliMap.get(a.user_id) || { nome: 'Utente', cognome: '' };
          return {
            id: a.id, tipo: 'annuncio' as const, titolo: a.titolo, descrizione: a.descrizione,
            prezzo: a.prezzo, immagini: a.immagini, created_at: a.created_at,
            autore, categoria: a.categorie_annunci, link: `/annuncio/${a.id}`
          };
        }) || []),
        ...(eventi?.map(e => {
          const autore = profiliMap.get(e.organizzatore_id) || { nome: 'Utente', cognome: '' };
          return {
            id: e.id, tipo: 'evento' as const, titolo: e.titolo, descrizione: e.descrizione,
            data: e.data, fine: e.fine, luogo: e.luogo, gratuito: e.gratuito, prezzo: e.prezzo,
            partecipanti: e.partecipanti, created_at: e.created_at,
            autore, link: `/evento/${e.id}`
          };
        }) || [])
      ];

      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!user,
  });

  // I miei annunci (SOLO annunci dell'utente)
  const { data: myAnnunci = [], isLoading: annunciLoading } = useQuery({
    queryKey: ["home-my-annunci", user?.id],
    queryFn: () => fetchMyAnnunci(user!.id),
    enabled: !!user,
  });

  // TUTTI gli eventi (per tab Eventi)
  const { data: allEventi = [], isLoading: loadingEventi } = useQuery({
    queryKey: ['home-all-eventi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventi')
        .select('*')
        .eq('stato', 'attivo')
        .order('data', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const orgIds = [...new Set(data.map(e => e.organizzatore_id))];
      const { data: profili } = await supabase.from('profiles').select('user_id, nome, cognome, avatar_url').in('user_id', orgIds);
      const profiliMap = new Map(profili?.map(p => [p.user_id, p]) || []);

      return data.map(evento => {
        const profilo = profiliMap.get(evento.organizzatore_id);
        return {
          ...evento,
          organizzatore_nome: profilo ? `${profilo.nome || ''} ${profilo.cognome || ''}`.trim() || 'Utente' : 'Utente',
          organizzatore_avatar: profilo?.avatar_url || null,
        };
      });
    },
  });

  // Handlers eliminazione
  const handleDeleteAnnuncio = async () => {
    if (!deleteAnnuncioId) return;
    const { error } = await supabase.from("annunci").delete().eq("id", deleteAnnuncioId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'annuncio", variant: "destructive" });
    } else {
      toast({ title: "Annuncio eliminato" });
      queryClient.invalidateQueries({ queryKey: ["home-my-annunci"] });
      queryClient.invalidateQueries({ queryKey: ["home-feed"] });
    }
    setDeleteAnnuncioId(null);
  };

  const handleDeleteEvento = async () => {
    if (!deleteEventoId) return;
    const { error } = await supabase.from("eventi").delete().eq("id", deleteEventoId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'evento", variant: "destructive" });
    } else {
      toast({ title: "Evento eliminato" });
      queryClient.invalidateQueries({ queryKey: ["home-all-eventi"] });
      queryClient.invalidateQueries({ queryKey: ["home-feed"] });
    }
    setDeleteEventoId(null);
  };

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="feed" className="gap-1.5">
              <MessageCircle className="w-4 h-4" /> Feed
            </TabsTrigger>
            <TabsTrigger value="annunci" className="gap-1.5">
              <FileText className="w-4 h-4" /> I miei annunci
            </TabsTrigger>
            <TabsTrigger value="eventi" className="gap-1.5">
              <Calendar className="w-4 h-4" /> Eventi
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Feed ── */}
          <TabsContent value="feed" className="mt-4">
            {feedLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : feedData.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium mb-2">Nessuna attività recente</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Quando qualcuno pubblicherà annunci o eventi, li vedrai qui in ordine cronologico.
                </p>
                <Link to="/nuovo-annuncio">
                  <Button>Pubblica il tuo primo annuncio</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedData.map((item: any) => (
                  <Link key={`${item.tipo}-${item.id}`} to={item.link}>
                  <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.tipo === 'evento' ? 'bg-secondary/10' : 'bg-primary/10'}`}>
                        {item.tipo === 'evento' ? <Calendar className="w-5 h-5 text-secondary" /> : <MessageCircle className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-foreground line-clamp-2">{item.titolo}</h4>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: it })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.descrizione || "Nessuna descrizione"}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={item.autore?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
                                {item.autore?.nome?.[0] || 'U'}{item.autore?.cognome?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            {item.autore?.nome || 'Utente'} {item.autore?.cognome || ''}
                          </span>
                          {item.tipo === 'evento' && (
                            <>
                              <EventStatusBadge dataInizio={item.data} dataFine={item.fine} />
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.fine
                                  ? formatDateRangeCompact(new Date(item.data), new Date(item.fine))
                                  : formatEventDate(item.data)}
                              </span>
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{abbreviaIndirizzo(item.luogo)}</span></span>
                            </>
                          )}
                          {item.tipo === 'annuncio' && item.prezzo > 0 && (
                            <Badge variant="secondary">€{item.prezzo.toFixed(2)}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Tab: I miei annunci (SOLO annunci dell'utente, con modifica/elimina) ── */}
          <TabsContent value="annunci" className="mt-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-bold">I miei annunci</h2>
                <Link to="/nuovo-annuncio"><Button size="sm">Nuovo annuncio</Button></Link>
              </div>
              {annunciLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-40 w-full" />
                      <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                    </Card>
                  ))}
                </div>
              ) : myAnnunci.length === 0 ? (
                <Card className="p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Non hai ancora pubblicato annunci</p>
                  <Button className="mt-4" asChild><Link to="/nuovo-annuncio">Pubblica il primo</Link></Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAnnunci.map((a, i) => {
                    const s = statoBadge[a.stato] || { label: a.stato, variant: "outline" as const };
                    const cover = a.immagini && a.immagini.length > 0 ? a.immagini[0] : null;
                    const timeAgo = formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: it });
                    return (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                        <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group">
                          <Link to={`/annuncio/${a.id}`}>
                            <div className="relative h-40 bg-muted">
                              {cover ? (
                                <img src={cover} alt={a.titolo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="flex items-center justify-center h-full"><ImageIcon className="w-10 h-10 text-muted-foreground/30" /></div>
                              )}
                              {a.immagini && a.immagini.length > 1 && (
                                <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
                                  1/{a.immagini.length}
                                </span>
                              )}
                              <Badge variant={s.variant} className="absolute top-2 right-2 text-xs">{s.label}</Badge>
                            </div>
                          </Link>
                          <div className="p-3">
                            <Link to={`/annuncio/${a.id}`}>
                              <h3 className="font-heading font-bold text-sm text-foreground truncate">{a.titolo}</h3>
                            </Link>
                            <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.quartiere || "Milano"}</span>
                              <span>{timeAgo}</span>
                            </div>
                            {a.prezzo != null && a.prezzo > 0 && <p className="mt-2 text-sm font-bold text-primary">€{a.prezzo.toFixed(2)}</p>}
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                              <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => navigate(`/modifica-annuncio/${a.id}`)}>
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                              </Button>
                              <Button size="sm" variant="ghost" className="flex-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteAnnuncioId(a.id)}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ── Tab: Eventi (TUTTI gli eventi attivi, modifica/elimina solo per i propri) ── */}
          <TabsContent value="eventi" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-bold">Tutti gli eventi</h2>
                <div className="flex gap-2">
                  <Link to="/nuovo-evento"><Button size="sm">Crea evento</Button></Link>
                  <Link to="/eventi"><Button variant="ghost" size="sm">Vedi tutti</Button></Link>
                </div>
              </div>
              {loadingEventi ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : allEventi.length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nessun evento in programma</p>
                  <Link to="/nuovo-evento"><Button variant="link" className="mt-2">Crea il primo evento</Button></Link>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allEventi.map((evento: any) => (
                    <Card key={evento.id} className="p-4 hover:shadow-card-hover transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/eventi`} className="hover:underline">
                            <h4 className="font-medium text-foreground line-clamp-2">{evento.titolo}</h4>
                          </Link>
                          <EventStatusBadge dataInizio={evento.data} dataFine={evento.fine} className="mb-1" />
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>
                              {evento.fine
                                ? formatDateRangeCompact(new Date(evento.data), new Date(evento.fine))
                                : formatEventDate(evento.data)}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{abbreviaIndirizzo(evento.luogo)}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={evento.organizzatore_avatar || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {evento.organizzatore_nome?.split(" ").map((w: string) => w[0]).join("").toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{evento.organizzatore_nome || "Utente"}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {evento.gratuito ? "Gratuito" : `€${evento.prezzo}`}
                            </Badge>
                          </div>
                          {/* Modifica/Elimina solo se è l'evento dell'utente loggato */}
                          {user?.id === evento.organizzatore_id && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate(`/modifica-evento/${evento.id}`)}>
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Modifica
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive" onClick={() => setDeleteEventoId(evento.id)}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Elimina
                              </Button>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">{evento.partecipanti || 0} partecipanti</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog conferma eliminazione annuncio */}
      <Dialog open={!!deleteAnnuncioId} onOpenChange={(open) => !open && setDeleteAnnuncioId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare l'annuncio?</DialogTitle>
            <DialogDescription>Questa azione è irreversibile. L'annuncio verrà eliminato definitivamente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAnnuncioId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteAnnuncio}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione evento */}
      <Dialog open={!!deleteEventoId} onOpenChange={(open) => !open && setDeleteEventoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare l'evento?</DialogTitle>
            <DialogDescription>Questa azione è irreversibile. L'evento verrà eliminato definitivamente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventoId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteEvento}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  );
};

export default Home;
