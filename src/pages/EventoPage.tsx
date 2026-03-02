import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, MapPin, Clock, Heart, MessageCircle, User, Send, Eye, Link as LinkIcon, Mail, Share2, Check, HelpCircle } from "lucide-react";
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

  // Fetch participation status
  const { data: userPartecipazione } = useQuery({
    queryKey: ["evento_partecipazione", id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("eventi_partecipanti")
        .select("stato")
        .eq("evento_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.stato || null;
    },
    enabled: !!id && !!user,
  });

  // Fetch participation counts
  const { data: partecipantiCounts } = useQuery({
    queryKey: ["evento_partecipanti_counts", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("eventi_partecipanti")
        .select("stato")
        .eq("evento_id", id!);
      const confermati = (data || []).filter((p: any) => p.stato === "confermato").length;
      const forse = (data || []).filter((p: any) => p.stato === "forse").length;
      return { confermati, forse };
    },
    enabled: !!id,
  });

  // Incrementa visualizzazioni (una sola volta per sessione)
  useEffect(() => {
    if (!evento?.id) return;
    const key = `viewed_evento_${evento.id}`;
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

  const handlePartecipazione = async (stato: "confermato" | "forse") => {
    if (!user) { navigate("/login"); return; }
    if (!evento) return;

    // Se l'utente ha già lo stesso stato, rimuovi
    if (userPartecipazione === stato) {
      await (supabase as any).from("eventi_partecipanti").delete().eq("evento_id", evento.id).eq("user_id", user.id);
    } else {
      // Upsert: inserisci o aggiorna
      if (userPartecipazione) {
        await (supabase as any).from("eventi_partecipanti").update({ stato }).eq("evento_id", evento.id).eq("user_id", user.id);
      } else {
        // Check max partecipanti
        if (stato === "confermato" && evento.max_partecipanti && partecipantiCounts && partecipantiCounts.confermati >= evento.max_partecipanti) {
          toast({ title: "Posti esauriti", description: "Il numero massimo di partecipanti è stato raggiunto.", variant: "destructive" });
          return;
        }
        await (supabase as any).from("eventi_partecipanti").insert({ evento_id: evento.id, user_id: user.id, stato });

        // Notifica al creatore
        if (evento.organizzatore_id !== user.id && stato === "confermato") {
          const { data: profilo } = await supabase.from("profiles").select("nome, cognome").eq("user_id", user.id).single();
          const nomeUtente = profilo ? `${profilo.nome || ""} ${profilo.cognome || ""}`.trim() || "Un utente" : "Un utente";
          await supabase.from("notifiche").insert({
            user_id: evento.organizzatore_id,
            tipo: "partecipazione_evento",
            titolo: "Nuovo partecipante al tuo evento",
            messaggio: `${nomeUtente} parteciperà al tuo evento "${evento.titolo}"`,
            link: `/evento/${evento.id}`,
            mittente_id: user.id,
            riferimento_id: evento.id,
          });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["evento_partecipazione", id] });
    queryClient.invalidateQueries({ queryKey: ["evento_partecipanti_counts", id] });
  };

  const handleShare = (type: string) => {
    if (!evento) return;
    const url = window.location.href;
    const title = evento.titolo;

    switch (type) {
      case "copy":
        navigator.clipboard.writeText(url);
        toast({ title: "Link copiato!", description: "Il link dell'evento è stato copiato negli appunti." });
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`);
        break;
      case "facebook":
        window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
        break;
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
  const confermati = partecipantiCounts?.confermati || 0;
  const forseCnt = partecipantiCounts?.forse || 0;
  const maxReached = !!(evento?.max_partecipanti && confermati >= evento.max_partecipanti);

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

                <div className="flex items-center gap-4 flex-wrap">
                  <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Heart className={`w-5 h-5 ${userLiked ? "text-destructive fill-destructive" : ""}`} />
                    {likeCount} Mi piace
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MessageCircle className="w-5 h-5" /> {commenti.length} Commenti
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Eye className="w-5 h-5" /> {evento.visualizzazioni || 0} Visualizzazioni
                  </span>
                </div>

                {/* Partecipanti counter */}
                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {evento.max_partecipanti ? `${confermati}/${evento.max_partecipanti}` : confermati} confermati
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    {forseCnt} forse
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
              <div id="commenti" className="bg-card border rounded-xl p-5">
                <h2 className="font-heading font-bold text-foreground mb-4">
                  Commenti ({commenti.length})
                </h2>

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
              {/* Participation */}
              <div className="bg-card border rounded-xl p-5 space-y-3">
                <h3 className="font-heading font-bold text-foreground mb-2">Partecipa</h3>
                <div className="flex gap-2">
                  <Button
                    variant={userPartecipazione === "confermato" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handlePartecipazione("confermato")}
                    disabled={maxReached && userPartecipazione !== "confermato"}
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Parteciperò
                  </Button>
                  <Button
                    variant={userPartecipazione === "forse" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => handlePartecipazione("forse")}
                  >
                    <HelpCircle className="w-4 h-4 mr-1.5" />
                    Forse
                  </Button>
                </div>
                {maxReached && userPartecipazione !== "confermato" && (
                  <p className="text-xs text-destructive text-center">Posti esauriti</p>
                )}
                <div className="text-sm text-muted-foreground text-center">
                  ✅ {evento.max_partecipanti ? `${confermati}/${evento.max_partecipanti}` : confermati} confermati · ❓ {forseCnt} forse
                </div>
              </div>

              {/* Like button */}
              <div className="bg-card border rounded-xl p-5">
                <Button
                  variant={userLiked ? "default" : "outline"}
                  className="w-full"
                  onClick={toggleLike}
                >
                  <Heart className={`w-4 h-4 mr-2 ${userLiked ? "fill-current" : ""}`} />
                  Mi piace {likeCount > 0 ? `(${likeCount})` : ""}
                </Button>
              </div>

              {/* Share */}
              <div className="bg-card border rounded-xl p-5">
                <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Condividi
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  <button onClick={() => handleShare("copy")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors" title="Copia link">
                    <LinkIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Link</span>
                  </button>
                  <button onClick={() => handleShare("whatsapp")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors" title="WhatsApp">
                    <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span className="text-[10px] text-muted-foreground">WhatsApp</span>
                  </button>
                  <button onClick={() => handleShare("facebook")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors" title="Facebook">
                    <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-[10px] text-muted-foreground">Facebook</span>
                  </button>
                  <button onClick={() => handleShare("twitter")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors" title="X (Twitter)">
                    <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span className="text-[10px] text-muted-foreground">X</span>
                  </button>
                  <button onClick={() => handleShare("email")} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors" title="Email">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Email</span>
                  </button>
                </div>
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
