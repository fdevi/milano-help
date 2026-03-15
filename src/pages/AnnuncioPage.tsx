import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { icons, LucideIcon, ChevronLeft, ChevronRight, Eye, Calendar, MapPin, Flag, MessageCircle, User, Heart, Mail, Phone, X, ZoomIn, Share2, Copy, Check, Navigation, Building2, Store } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { sendPushNotification } from "@/lib/pushNotification";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import CommentiAnnuncio from "@/components/chat/CommentiAnnuncio";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoibWlsYW5vaGVscCIsImEiOiJjbTlxMzJxcGIwMDFnMnFzOHU3OXF1YnhzIn0.X4KMsJcd_oBP4iFvOWm2TA";

const AnnuncioPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showSegnala, setShowSegnala] = useState(false);
  const [segnalaMotivo, setSegnalaMotivo] = useState("");
  const [segnalaNote, setSegnalaNote] = useState("");
  const [sending, setSending] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch annuncio
  const { data: annuncio, isLoading, error } = useQuery({
    queryKey: ["annuncio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci")
        .select("*, categorie_annunci(id, nome, label, icona)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isSpecialCategory = annuncio?.categorie_annunci &&
    ((annuncio.categorie_annunci as any).nome === "Professionisti" || (annuncio.categorie_annunci as any).nome === "negozi_di_quartiere");
  const isProf = (annuncio?.categorie_annunci as any)?.nome === "Professionisti";

  // Fetch author profile with full contact info for special categories
  const { data: autore } = useQuery({
    queryKey: ["profilo_autore", annuncio?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, avatar_url, quartiere, created_at, nome_attivita, tipo_account, lat, lon")
        .eq("user_id", annuncio!.user_id)
        .single();
      if (error) throw error;
      let email: string | null = null;
      let telefono: string | null = null;
      // Show contacts if user is logged in and annuncio owner consented
      if (user) {
        if ((annuncio as any).mostra_email) {
          const { data: contactData } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", annuncio!.user_id)
            .single();
          email = contactData?.email ?? null;
        }
        if ((annuncio as any).mostra_telefono) {
          const { data: contactData } = await supabase
            .from("profiles")
            .select("telefono")
            .eq("user_id", annuncio!.user_id)
            .single();
          telefono = contactData?.telefono ?? null;
        }
      }
      return { ...data, email, telefono };
    },
    enabled: !!annuncio?.user_id,
  });

  // Check if user liked
  const { data: userLiked } = useQuery({
    queryKey: ["annuncio_like", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("annunci_mi_piace")
        .select("annuncio_id")
        .eq("annuncio_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  // Fetch current user profile for notification name
  const { data: currentUserProfile } = useQuery({
    queryKey: ["my-profile-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("nome, cognome").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const toggleLike = async () => {
    if (!user) { navigate("/login"); return; }
    if (!annuncio) return;
    if (userLiked) {
      await supabase.from("annunci_mi_piace").delete().eq("annuncio_id", annuncio.id).eq("user_id", user.id);
      await supabase.from("annunci").update({ mi_piace: Math.max(0, (annuncio.mi_piace ?? 1) - 1) } as any).eq("id", annuncio.id);
    } else {
      await supabase.from("annunci_mi_piace").insert({ annuncio_id: annuncio.id, user_id: user.id } as any);
      await supabase.from("annunci").update({ mi_piace: (annuncio.mi_piace ?? 0) + 1 } as any).eq("id", annuncio.id);
      if (user.id !== annuncio.user_id) {
        const nomeUtente = currentUserProfile ? `${currentUserProfile.nome || "Utente"} ${currentUserProfile.cognome || ""}`.trim() : "Utente";
        await supabase.from("notifiche").insert({
          user_id: annuncio.user_id,
          tipo: "like_annuncio",
          titolo: "Nuovo Mi Piace",
          messaggio: `A ${nomeUtente} piace il tuo annuncio "${annuncio.titolo}"`,
          link: `/annuncio/${annuncio.id}`,
          riferimento_id: annuncio.id,
          mittente_id: user.id,
        } as any);
        sendPushNotification(annuncio.user_id, "Nuovo Mi Piace", `A ${nomeUtente} piace il tuo annuncio "${annuncio.titolo}"`, `/annuncio/${annuncio.id}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["annuncio_like", id] });
    queryClient.invalidateQueries({ queryKey: ["annuncio", id] });
  };

  // View counter
  useEffect(() => {
    if (!annuncio?.id) return;
    const key = `visto_annuncio_${annuncio.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.rpc("incrementa_visualizzazioni", { _annuncio_id: annuncio.id }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["annuncio", id] });
    });
  }, [annuncio?.id]);

  // Fetch other ads by author
  const { data: altriAnnunci = [] } = useQuery({
    queryKey: ["altri_annunci_autore", annuncio?.user_id, annuncio?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci")
        .select("id, titolo, prezzo, immagini, created_at")
        .eq("user_id", annuncio!.user_id)
        .eq("stato", "attivo")
        .neq("id", annuncio!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!annuncio?.user_id && !!annuncio?.id,
  });

  const categoria = annuncio?.categorie_annunci as { id: string; nome: string; label: string; icona: string } | null;
  const CatIcon: LucideIcon = categoria
    ? (icons as Record<string, LucideIcon>)[categoria.icona] || icons.Circle
    : icons.Circle;

  const images = annuncio?.immagini?.filter(Boolean) || [];

  const handleContatta = async () => {
    if (!user) { navigate("/login"); return; }
    if (!annuncio) return;
    const { data: existing } = await supabase
      .from("conversazioni")
      .select("id")
      .or(`utente1_id.eq.${user.id},utente2_id.eq.${user.id}`)
      .or(`utente1_id.eq.${annuncio.user_id},utente2_id.eq.${annuncio.user_id}`)
      .limit(1)
      .maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const { data: conv, error } = await supabase
      .from("conversazioni")
      .insert({ utente1_id: user.id, utente2_id: annuncio.user_id })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Errore", description: "Impossibile avviare la conversazione.", variant: "destructive" });
      return;
    }
    navigate(`/chat/${conv.id}`);
  };

  const handleSegnala = async () => {
    if (!user || !annuncio || !segnalaMotivo) return;
    setSending(true);
    const { error } = await supabase.from("segnalazioni").insert({
      annuncio_id: annuncio.id,
      utente_id: user.id,
      motivo: segnalaMotivo,
      note: segnalaNote || null,
    });
    setSending(false);
    setShowSegnala(false);
    if (error) {
      toast({ title: "Errore", description: "Impossibile inviare la segnalazione.", variant: "destructive" });
    } else {
      toast({ title: "Segnalazione inviata", description: "Grazie per la tua segnalazione." });
    }
    setSegnalaMotivo("");
    setSegnalaNote("");
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/annuncio/${id}` : '';
  const shareText = annuncio ? `${annuncio.titolo} - Milano Help` : '';

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shareText, url: shareUrl }); } catch {}
    } else {
      setShowSharePopup(true);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get lat/lon from annuncio or autore profile
  const lat = (annuncio as any)?.lat || autore?.lat;
  const lon = (annuncio as any)?.lon || autore?.lon;
  const hasLocation = lat && lon;

  if (!isLoading && (error || !annuncio)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Annuncio non trovato</h1>
          <p className="text-muted-foreground mb-6">L'annuncio che cerchi non esiste o è stato rimosso.</p>
          <Link to="/"><Button>Torna alla home</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoading && annuncio && annuncio.stato !== "attivo" && annuncio.user_id !== user?.id) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Annuncio non disponibile</h1>
          <p className="text-muted-foreground mb-6">Questo annuncio non è attualmente attivo.</p>
          <Link to="/"><Button>Torna alla home</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Back link */}
        {categoria && (
          <Link to={`/categoria/${categoria.nome}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Torna a {categoria.label}
          </Link>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        ) : annuncio ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gallery */}
              {images.length > 0 ? (
                <div className="relative rounded-xl overflow-hidden bg-muted">
                  <img
                    src={images[currentImage]}
                    alt={annuncio.titolo}
                    loading="lazy"
                    className="w-full max-h-[300px] md:max-h-[500px] object-contain bg-muted cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                  />
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="absolute top-3 right-3 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                  >
                    <ZoomIn className="w-4 h-4 text-foreground" />
                  </button>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentImage ? "bg-primary" : "bg-background/60"}`}
                          />
                        ))}
                      </div>
                      <Badge className="absolute bottom-3 right-3 bg-background/80 text-foreground text-xs">
                        {currentImage + 1}/{images.length}
                      </Badge>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-48 sm:h-72 bg-muted rounded-xl flex items-center justify-center">
                  <CatIcon className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Title and meta */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {categoria && (
                    <Badge variant="secondary" className="gap-1">
                      <CatIcon className="w-3 h-3" /> {categoria.label}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(annuncio.created_at), "d MMMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" /> {annuncio.visualizzazioni} visualizzazioni
                  </span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
                  {annuncio.titolo}
                </h1>
                {/* Business name for special categories */}
                {isSpecialCategory && autore?.nome_attivita && (
                  <p className="text-lg text-muted-foreground mb-2 flex items-center gap-2">
                    {isProf ? <Building2 className="w-5 h-5 text-blue-500" /> : <Store className="w-5 h-5 text-emerald-500" />}
                    {autore.nome_attivita}
                  </p>
                )}
                <div className="flex items-center gap-4 mb-2">
                  <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Heart className={`w-4 h-4 ${userLiked ? "text-destructive fill-destructive" : ""}`} />
                    {annuncio.mi_piace || 0} Mi piace
                  </button>
                  <button onClick={handleShare} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-4 h-4" /> Condividi
                  </button>
                </div>
                {/* Condition & operation badges */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(annuncio as any).condizione === "nuovo" && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500 text-white">Nuovo</span>
                  )}
                  {(annuncio as any).condizione === "usato" && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-500 text-black">Usato</span>
                  )}
                  {(annuncio as any).tipo_operazione === "vendita" && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white">Vendita</span>
                  )}
                  {(annuncio as any).tipo_operazione === "locazione" && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500 text-white">Locazione</span>
                  )}
                </div>
                {annuncio.prezzo != null && (
                  <p className="text-2xl font-bold text-primary mb-2">€{annuncio.prezzo.toFixed(2)}</p>
                )}
                {annuncio.quartiere && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {annuncio.quartiere}
                  </p>
                )}
              </div>

              {/* Description */}
              {annuncio.descrizione && (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">Descrizione</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{annuncio.descrizione}</p>
                </div>
              )}

              {/* Contenuto speciale (Menù / Offerte) */}
              {(annuncio as any).contenuto_speciale && (
                <div className={`border rounded-xl p-5 ${isProf ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'}`}>
                  <h2 className="font-heading font-bold text-foreground mb-3">📋 Menù / Offerte speciali</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{(annuncio as any).contenuto_speciale}</p>
                </div>
              )}

              {/* Map for special categories */}
              {isSpecialCategory && hasLocation && (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">📍 Posizione</h2>
                  <div className="rounded-xl overflow-hidden mb-3">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+${isProf ? '3b82f6' : '10b981'}(${lon},${lat})/${lon},${lat},15,0/600x300@2x?access_token=${MAPBOX_TOKEN}`}
                      alt="Mappa posizione"
                      className="w-full h-[200px] object-cover"
                      loading="lazy"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank')}
                  >
                    <Navigation className="w-4 h-4 mr-2" /> Portami qui
                  </Button>
                </div>
              )}
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
                  Mi piace {(annuncio as any).mi_piace > 0 ? `(${(annuncio as any).mi_piace})` : ""}
                </Button>

                {annuncio.user_id !== user?.id && (
                  <Button className="w-full" size="lg" onClick={handleContatta}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {user ? "Contatta" : "Accedi per contattare"}
                  </Button>
                )}

                {/* Contact info */}
                {user && autore?.email && (
                  <a href={`mailto:${autore.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4" /> {autore.email}
                  </a>
                )}
                {user && autore?.telefono && (
                  <a href={`tel:${autore.telefono}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-4 h-4" /> {autore.telefono}
                  </a>
                )}
                {!user && ((annuncio as any).mostra_email || (annuncio as any).mostra_telefono) && (
                  <p className="text-xs text-muted-foreground italic">
                    <a href="/login" className="underline hover:text-primary">Accedi</a> per vedere i contatti del venditore.
                  </p>
                )}

                {user && annuncio.user_id !== user?.id && (
                  <Button variant="outline" className="w-full" onClick={() => setShowSegnala(true)}>
                    <Flag className="w-4 h-4 mr-2" /> Segnala
                  </Button>
                )}

                <Button variant="outline" className="w-full" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" /> Condividi
                </Button>
              </div>

              {/* Author card */}
              {autore && (
                <div className="bg-card border rounded-xl p-5">
                  <h3 className="font-heading font-bold text-foreground mb-4">Pubblicato da</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12">
                      {autore.avatar_url && <AvatarImage src={autore.avatar_url} />}
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {autore.nome || "Utente"} {autore.cognome ? autore.cognome.charAt(0) + "." : ""}
                      </p>
                      {autore.nome_attivita && (
                        <p className="text-sm font-medium text-primary">{autore.nome_attivita}</p>
                      )}
                      {autore.quartiere && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {autore.quartiere}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Membro dal {format(new Date(autore.created_at), "MMMM yyyy", { locale: it })}
                  </p>
                </div>
              )}

              {/* Other ads by author */}
              {altriAnnunci.length > 0 && (
                <div className="bg-card border rounded-xl p-5">
                  <h3 className="font-heading font-bold text-foreground mb-4">Altri annunci</h3>
                  <div className="space-y-3">
                    {altriAnnunci.map((a) => (
                      <Link key={a.id} to={`/annuncio/${a.id}`} className="flex gap-3 group">
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {a.immagini?.[0] ? (
                            <img src={a.immagini[0]} alt={a.titolo} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <CatIcon className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {a.titolo}
                          </p>
                          {a.prezzo != null && (
                            <p className="text-sm font-bold text-primary">€{a.prezzo.toFixed(2)}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10" onClick={() => setLightboxOpen(false)}>
            <X className="w-8 h-8" />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10">
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setCurrentImage((p) => (p + 1) % images.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10">
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}
          <img src={images[currentImage]} alt={annuncio?.titolo} className="max-w-[95vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
              {currentImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* Share popup */}
      <Dialog open={showSharePopup} onOpenChange={setShowSharePopup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Condividi annuncio</DialogTitle>
            <DialogDescription>Scegli come condividere questo annuncio.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium">💬 WhatsApp</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium">📘 Facebook</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium">🐦 Twitter</a>
            <button onClick={handleCopyLink} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors text-sm font-medium">
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copiato!</> : <><Copy className="w-4 h-4" /> Copia link</>}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">📸 Per Instagram, condividi da mobile.</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showSegnala} onOpenChange={setShowSegnala}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segnala annuncio</DialogTitle>
            <DialogDescription>Seleziona un motivo e aggiungi eventuali dettagli.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={segnalaMotivo} onValueChange={setSegnalaMotivo}>
              <SelectTrigger><SelectValue placeholder="Seleziona motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="contenuto_inappropriato">Contenuto inappropriato</SelectItem>
                <SelectItem value="truffa">Possibile truffa</SelectItem>
                <SelectItem value="duplicato">Annuncio duplicato</SelectItem>
                <SelectItem value="altro">Altro</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Note aggiuntive (opzionale)" value={segnalaNote} onChange={(e) => setSegnalaNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSegnala(false)}>Annulla</Button>
            <Button onClick={handleSegnala} disabled={!segnalaMotivo || sending}>
              {sending ? "Invio..." : "Invia segnalazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commenti */}
      {annuncio && (
        <div className="container mx-auto px-4 pb-12">
          <CommentiAnnuncio annuncioId={annuncio.id} annuncioAutoreId={annuncio.user_id} annuncioTitolo={annuncio.titolo} />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AnnuncioPage;
