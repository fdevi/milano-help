import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, MapPin, Clock, Heart, MessageCircle, User, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const EventoPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch evento
  const { data: evento, isLoading, error } = useQuery({
    queryKey: ["evento", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventi")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch organizzatore
  const { data: organizzatore } = useQuery({
    queryKey: ["profilo_organizzatore", evento?.organizzatore_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url, quartiere")
        .eq("user_id", evento!.organizzatore_id)
        .single();
      return data;
    },
    enabled: !!evento?.organizzatore_id,
  });

  // Check if user liked
  const { data: userLiked } = useQuery({
    queryKey: ["evento_like", id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("eventi_mi_piace")
        .select("evento_id")
        .eq("evento_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  // Like count
  const { data: likeCount = 0 } = useQuery({
    queryKey: ["evento_like_count", id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("eventi_mi_piace")
        .select("*", { count: "exact", head: true })
        .eq("evento_id", id!);
      return count || 0;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: commenti = [] } = useQuery({
    queryKey: ["evento_commenti", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eventi_commenti")
        .select("*")
        .eq("evento_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profili } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url")
        .in("user_id", userIds as string[]);

      const profiliMap = new Map(profili?.map(p => [p.user_id, p]) || []);
      return data.map((c: any) => ({
        ...c,
        profilo: profiliMap.get(c.user_id) || null,
      }));
    },
    enabled: !!id,
  });

  // Incrementa visualizzazioni (una sola volta per sessione)
  useEffect(() => {
    if (!evento?.id) return;
    const key = `visto_evento_${evento.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const timer = setTimeout(() => {
      supabase.rpc("incrementa_visualizzazioni_evento", { _evento_id: evento.id } as any).then(() => {
        queryClient.invalidateQueries({ queryKey: ["evento", id] });
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [evento?.id]);

  const toggleLike = async () => {
    if (!user) { navigate("/login"); return; }
    if (!evento) return;

    if (userLiked) {
      await (supabase as any).from("eventi_mi_piace").delete().eq("evento_id", evento.id).eq("user_id", user.id);
      await (supabase as any).from("eventi").update({ mi_piace: Math.max(0, likeCount - 1) }).eq("id", evento.id);
    } else {
      await (supabase as any).from("eventi_mi_piace").insert({ evento_id: evento.id, user_id: user.id });
      await (supabase as any).from("eventi").update({ mi_piace: likeCount + 1 }).eq("id", evento.id);

      // Notifica al creatore dell'evento
      if (evento.organizzatore_id !== user.id) {
        const { data: profilo } = await supabase.from("profiles").select("nome, cognome").eq("user_id", user.id).single();
        const nomeUtente = profilo ? `${profilo.nome || ""} ${profilo.cognome || ""}`.trim() || "Un utente" : "Un utente";
        await supabase.from("notifiche").insert({
          user_id: evento.organizzatore_id,
          tipo: "like_evento",
          titolo: "Mi piace al tuo evento",
          messaggio: `A ${nomeUtente} piace il tuo evento "${evento.titolo}"`,
          link: `/evento/${evento.id}`,
          mittente_id: user.id,
          riferimento_id: evento.id,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["evento_like", id] });
    queryClient.invalidateQueries({ queryKey: ["evento_like_count", id] });
    queryClient.invalidateQueries({ queryKey: ["evento", id] });
  };

  const handleComment = async () => {
    if (!user) { navigate("/login"); return; }
    if (!commentText.trim() || !evento) return;

    setSending(true);
    const testoTroncato = commentText.trim();
    const { error } = await (supabase as any).from("eventi_commenti").insert({
      evento_id: evento.id,
      user_id: user.id,
      testo: testoTroncato,
    });
    setSending(false);

    if (error) {
      toast({ title: "Errore", description: "Impossibile inviare il commento.", variant: "destructive" });
    } else {
      // Notifica al creatore dell'evento
      if (evento.organizzatore_id !== user.id) {
        const { data: profilo } = await supabase.from("profiles").select("nome, cognome").eq("user_id", user.id).single();
        const nomeUtente = profilo ? `${profilo.nome || ""} ${profilo.cognome || ""}`.trim() || "Un utente" : "Un utente";
        const preview = testoTroncato.length > 50 ? testoTroncato.slice(0, 50) + "…" : testoTroncato;
        await supabase.from("notifiche").insert({
          user_id: evento.organizzatore_id,
          tipo: "commento_evento",
          titolo: "Nuovo commento sul tuo evento",
          messaggio: `${nomeUtente} ha commentato il tuo evento "${evento.titolo}": "${preview}"`,
          link: `/evento/${evento.id}`,
          mittente_id: user.id,
          riferimento_id: evento.id,
        });
      }
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["evento_commenti", id] });
    }
  };

  if (!isLoading && (error || !evento)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Evento non trovato</h1>
          <p className="text-muted-foreground mb-6">L'evento che cerchi non esiste o è stato rimosso.</p>
          <Link to="/categoria/evento"><Button>Torna agli eventi</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const orgName = organizzatore ? `${organizzatore.nome || ""} ${organizzatore.cognome || ""}`.trim() || "Utente" : "Utente";
  const orgInitials = orgName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-12">
        <Link to="/categoria/evento" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Torna agli eventi
        </Link>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        ) : evento ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image */}
              {evento.immagine ? (
                <div className="rounded-xl overflow-hidden bg-muted">
                  <img src={evento.immagine} alt={evento.titolo} className="w-full h-72 sm:h-96 object-cover" />
                </div>
              ) : (
                <div className="h-72 sm:h-96 bg-muted rounded-xl flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Title and meta */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="w-3 h-3" /> Evento
                  </Badge>
                  {evento.gratuito ? (
                    <Badge className="bg-primary text-primary-foreground">Gratuito</Badge>
                  ) : evento.prezzo != null ? (
                    <Badge variant="outline">€{Number(evento.prezzo).toFixed(2)}</Badge>
                  ) : null}
                </div>

                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
                  {evento.titolo}
                </h1>

                <div className="space-y-2 text-muted-foreground mb-4">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(evento.data), "EEEE d MMMM yyyy, HH:mm", { locale: it })}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {evento.luogo}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Heart className={`w-5 h-5 ${userLiked ? "text-destructive fill-destructive" : ""}`} />
                    {likeCount} Mi piace
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageCircle className="w-5 h-5" /> {commenti.length} Commenti
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Eye className="w-5 h-5" /> {(evento as any).visualizzazioni || 0} Visualizzazioni
                  </span>
                </div>
              </div>

              {/* Description */}
              {evento.descrizione && (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">Descrizione</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{evento.descrizione}</p>
                </div>
              )}

              {/* Comments */}
              <div className="bg-card border rounded-xl p-5">
                <h2 className="font-heading font-bold text-foreground mb-4">
                  Commenti ({commenti.length})
                </h2>

                {/* Comment form */}
                {user ? (
                  <div className="flex gap-3 mb-6">
                    <Textarea
                      placeholder="Scrivi un commento..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button onClick={handleComment} disabled={sending || !commentText.trim()} size="icon" className="shrink-0 self-end">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    <Link to="/login" className="underline hover:text-primary">Accedi</Link> per lasciare un commento.
                  </p>
                )}

                {commenti.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nessun commento ancora. Sii il primo!</p>
                ) : (
                  <div className="space-y-4">
                    {commenti.map((c: any) => {
                      const nome = c.profilo ? `${c.profilo.nome || ""} ${c.profilo.cognome || ""}`.trim() || "Utente" : "Utente";
                      const initials = nome.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={c.id} className="flex gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            {c.profilo?.avatar_url && <AvatarImage src={c.profilo.avatar_url} />}
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-foreground">{nome}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(c.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 mt-0.5">{c.testo}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              <div className="bg-card border rounded-xl p-5 space-y-3">
                <Button
                  variant={userLiked ? "default" : "outline"}
                  className="w-full"
                  onClick={toggleLike}
                >
                  <Heart className={`w-4 h-4 mr-2 ${userLiked ? "fill-current" : ""}`} />
                  Mi piace {likeCount > 0 ? `(${likeCount})` : ""}
                </Button>

                {evento.max_partecipanti && (
                  <div className="text-sm text-muted-foreground text-center">
                    {evento.partecipanti || 0}/{evento.max_partecipanti} partecipanti
                  </div>
                )}
              </div>

              {/* Organizer card */}
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-heading font-bold text-foreground mb-4">Organizzato da</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    {organizzatore?.avatar_url && <AvatarImage src={organizzatore.avatar_url} />}
                    <AvatarFallback>{orgInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{orgName}</p>
                    {organizzatore?.quartiere && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {organizzatore.quartiere}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Event info */}
              <div className="bg-card border rounded-xl p-5 space-y-3">
                <h3 className="font-heading font-bold text-foreground mb-2">Dettagli evento</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(new Date(evento.data), "d MMMM yyyy", { locale: it })}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {format(new Date(evento.data), "HH:mm", { locale: it })}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {evento.luogo}
                  </p>
                  {evento.categoria && (
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      {evento.categoria}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>

      <Footer />
    </div>
  );
};

export default EventoPage;
