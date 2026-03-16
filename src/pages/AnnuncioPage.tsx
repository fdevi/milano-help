import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { icons, LucideIcon, ChevronLeft, ChevronRight, Eye, Calendar, MapPin, Flag, MessageCircle, User, Heart, Mail, Phone, X, ZoomIn, Share2, Copy, Check, Navigation, Building2, Store, MoreVertical, Star, Globe, Clock, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { sendPushNotification } from "@/lib/pushNotification";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import CommentiAnnuncio from "@/components/chat/CommentiAnnuncio";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiYmx1ZXgiLCJhIjoiY21tZGpxM2d4MDNsYjJxczc1enhiODRwZiJ9.Trj9Jg8cpsKLKNZun7Z23Q";

const BUSINESS_CATEGORY_COLORS: Record<string, string> = {
  "Alimentari": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Panetteria": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Ristorante": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Bar / Caffetteria": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Parrucchiere": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Estetista": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  "Abbigliamento": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "Altro": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const AnnuncioPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
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
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewVoto, setReviewVoto] = useState(5);
  const [reviewCommento, setReviewCommento] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  // Admin review management
  const [editingReview, setEditingReview] = useState<any>(null);
  const [editReviewVoto, setEditReviewVoto] = useState(5);
  const [editReviewCommento, setEditReviewCommento] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

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

  // Fetch author profile
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
      if (user) {
        if ((annuncio as any).mostra_email) {
          const { data: contactData } = await supabase.from("profiles").select("email").eq("user_id", annuncio!.user_id).single();
          email = contactData?.email ?? null;
        }
        if ((annuncio as any).mostra_telefono) {
          const { data: contactData } = await supabase.from("profiles").select("telefono").eq("user_id", annuncio!.user_id).single();
          telefono = contactData?.telefono ?? null;
        }
      }
      return { ...data, email, telefono };
    },
    enabled: !!annuncio?.user_id,
  });

  // Fetch reviews
  const { data: recensioni = [] } = useQuery({
    queryKey: ["recensioni", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recensioni")
        .select("*")
        .eq("annuncio_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const enriched = await Promise.all(
        (data || []).map(async (r: any) => {
          const { data: p } = await supabase.from("profiles").select("nome, cognome, avatar_url").eq("user_id", r.utente_id).single();
          return { ...r, profilo: p };
        })
      );
      return enriched;
    },
    enabled: !!id && !!isSpecialCategory,
  });

  const avgRating = recensioni.length > 0
    ? (recensioni.reduce((sum: number, r: any) => sum + r.voto, 0) / recensioni.length).toFixed(1)
    : null;

  // Check if user already reviewed
  const { data: userReview } = useQuery({
    queryKey: ["user_review", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("recensioni").select("id").eq("annuncio_id", id!).eq("utente_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!id && !!user && !!isSpecialCategory,
  });

  // Check if user liked
  const { data: userLiked } = useQuery({
    queryKey: ["annuncio_like", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("annunci_mi_piace").select("annuncio_id").eq("annuncio_id", id!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

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
    const wasLiked = userLiked;
    await supabase.rpc("toggle_like_annuncio" as any, { _annuncio_id: annuncio.id, _user_id: user.id });
    if (!wasLiked && user.id !== annuncio.user_id) {
      const nomeUtente = currentUserProfile ? `${currentUserProfile.nome || "Utente"} ${currentUserProfile.cognome || ""}`.trim() : "Utente";
      const notificaPayload = {
        user_id: annuncio.user_id,
        tipo: "like_annuncio",
        titolo: "Nuovo Mi Piace",
        messaggio: `A ${nomeUtente} piace il tuo annuncio "${annuncio.titolo}"`,
        link: `/annuncio/${annuncio.id}`,
        riferimento_id: annuncio.id,
        mittente_id: user.id,
      };
      const { error: notificaError } = await supabase.from("notifiche").insert(notificaPayload as any);
      if (notificaError) {
        console.error("[NotificheDebug][like_annuncio] errore insert", { notificaPayload, notificaError });
      } else {
        console.log("[NotificheDebug][like_annuncio] insert OK", notificaPayload);
      }
      sendPushNotification(annuncio.user_id, "Nuovo Mi Piace", `A ${nomeUtente} piace il tuo annuncio "${annuncio.titolo}"`, `/annuncio/${annuncio.id}`);
    }
    queryClient.invalidateQueries({ queryKey: ["annuncio_like", id] });
    queryClient.invalidateQueries({ queryKey: ["annuncio", id] });
  };

  useEffect(() => {
    if (!annuncio?.id) return;
    const key = `visto_annuncio_${annuncio.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase.rpc("incrementa_visualizzazioni", { _annuncio_id: annuncio.id }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["annuncio", id] });
    });
  }, [annuncio?.id]);

  const { data: altriAnnunci = [] } = useQuery({
    queryKey: ["altri_annunci_autore", annuncio?.user_id, annuncio?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("annunci").select("id, titolo, prezzo, immagini, created_at")
        .eq("user_id", annuncio!.user_id).eq("stato", "attivo").neq("id", annuncio!.id)
        .order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: !!annuncio?.user_id && !!annuncio?.id,
  });

  const categoria = annuncio?.categorie_annunci as { id: string; nome: string; label: string; icona: string } | null;
  const CatIcon: LucideIcon = categoria ? (icons as Record<string, LucideIcon>)[categoria.icona] || icons.Circle : icons.Circle;
  const images = annuncio?.immagini?.filter(Boolean) || [];

  // Lat/lon from annuncio fields, fallback to autore profile
  const lat = (annuncio as any)?.lat || autore?.lat;
  const lon = (annuncio as any)?.lon || autore?.lon;
  const hasLocation = lat && lon;

  const handleContatta = async () => {
    if (!user) { navigate("/login"); return; }
    if (!annuncio) return;
    const { data: existing } = await supabase.from("conversazioni").select("id")
      .or(`utente1_id.eq.${user.id},utente2_id.eq.${user.id}`)
      .or(`utente1_id.eq.${annuncio.user_id},utente2_id.eq.${annuncio.user_id}`)
      .limit(1).maybeSingle();
    if (existing) { navigate(`/chat/${existing.id}`); return; }
    const { data: conv, error } = await supabase.from("conversazioni").insert({ utente1_id: user.id, utente2_id: annuncio.user_id }).select("id").single();
    if (error) { toast({ title: "Errore", description: "Impossibile avviare la conversazione.", variant: "destructive" }); return; }
    navigate(`/chat/${conv.id}`);
  };

  const handleSegnala = async () => {
    if (!user || !annuncio || !segnalaMotivo) return;
    setSending(true);
    const { error } = await supabase.from("segnalazioni").insert({ annuncio_id: annuncio.id, utente_id: user.id, motivo: segnalaMotivo, note: segnalaNote || null });
    setSending(false);
    setShowSegnala(false);
    if (error) { toast({ title: "Errore", description: "Impossibile inviare la segnalazione.", variant: "destructive" }); }
    else { toast({ title: "Segnalazione inviata", description: "Grazie per la tua segnalazione." }); }
    setSegnalaMotivo(""); setSegnalaNote("");
  };

  const handleSubmitReview = async () => {
    if (!user || !annuncio) return;
    setReviewSending(true);
    const { error } = await (supabase as any).from("recensioni").insert({
      annuncio_id: annuncio.id, utente_id: user.id, voto: reviewVoto, commento: reviewCommento.trim() || null,
    });
    setReviewSending(false);
    if (error) {
      toast({ title: "Errore", description: error.message?.includes("unique") ? "Hai già recensito questa attività." : "Impossibile inviare la recensione.", variant: "destructive" });
    } else {
      toast({ title: "Recensione inviata!", description: "Grazie per il tuo feedback." });
      setShowReviewForm(false); setReviewCommento(""); setReviewVoto(5);
      queryClient.invalidateQueries({ queryKey: ["recensioni", id] });
      queryClient.invalidateQueries({ queryKey: ["user_review", id] });
      // Send notification to annuncio owner
      if (user.id !== annuncio.user_id) {
        const nomeUtente = currentUserProfile ? `${currentUserProfile.nome || "Utente"} ${currentUserProfile.cognome || ""}`.trim() : "Utente";
        const notificaPayload = {
          user_id: annuncio.user_id,
          tipo: "recensione",
          titolo: "Nuova recensione",
          messaggio: `${nomeUtente} ha recensito "${annuncio.titolo}" con ${reviewVoto} stelle`,
          link: `/annuncio/${annuncio.id}`,
          riferimento_id: annuncio.id,
          mittente_id: user.id,
        };
        const { error: notificaError } = await supabase.from("notifiche").insert(notificaPayload as any);
        if (notificaError) {
          console.error("[NotificheDebug][recensione] errore insert", { notificaPayload, notificaError });
        } else {
          console.log("[NotificheDebug][recensione] insert OK", notificaPayload);
        }
        sendPushNotification(annuncio.user_id, "Nuova recensione", `${nomeUtente} ha recensito "${annuncio.titolo}" con ${reviewVoto} stelle`, `/annuncio/${annuncio.id}`);
      }
    }
  };

  // Admin: edit review
  const handleEditReview = async () => {
    if (!editingReview) return;
    const { error } = await (supabase as any).from("recensioni").update({
      voto: editReviewVoto, commento: editReviewCommento.trim() || null,
    }).eq("id", editingReview.id);
    if (error) { toast({ title: "Errore", description: "Impossibile modificare la recensione.", variant: "destructive" }); }
    else {
      toast({ title: "Recensione aggiornata" });
      setEditingReview(null);
      queryClient.invalidateQueries({ queryKey: ["recensioni", id] });
    }
  };

  // Admin: delete review
  const handleDeleteReview = async () => {
    if (!deletingReviewId) return;
    const { error } = await (supabase as any).from("recensioni").delete().eq("id", deletingReviewId);
    if (error) { toast({ title: "Errore", description: "Impossibile eliminare la recensione.", variant: "destructive" }); }
    else {
      toast({ title: "Recensione eliminata" });
      setDeletingReviewId(null);
      queryClient.invalidateQueries({ queryKey: ["recensioni", id] });
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/annuncio/${id}` : '';
  const shareText = annuncio ? `${annuncio.titolo} - Milano Help` : '';

  const handleShare = async () => {
    if (navigator.share) { try { await navigator.share({ title: shareText, url: shareUrl }); } catch {} }
    else { setShowSharePopup(true); }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (!isLoading && annuncio && annuncio.stato !== "attivo" && annuncio.user_id !== user?.id && !isAdmin) {
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

  const catAttivita = (annuncio as any)?.categoria_attivita;
  const catAttivitaColor = catAttivita ? (BUSINESS_CATEGORY_COLORS[catAttivita] || BUSINESS_CATEGORY_COLORS["Altro"]) : "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-12">
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
              {/* Gallery with 3-dot menu */}
              <div className="relative rounded-xl overflow-hidden bg-muted">
                {images.length > 0 ? (
                  <>
                    <img src={images[currentImage]} alt={annuncio.titolo} loading="lazy"
                      className="w-full max-h-[300px] md:max-h-[500px] object-contain bg-muted cursor-pointer"
                      onClick={() => setLightboxOpen(true)} />
                    <button onClick={() => setLightboxOpen(true)}
                      className="absolute top-3 left-3 bg-background/80 rounded-full p-2 hover:bg-background transition-colors">
                      <ZoomIn className="w-4 h-4 text-foreground" />
                    </button>
                    {images.length > 1 && (
                      <>
                        <button onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, i) => (
                            <button key={i} onClick={() => setCurrentImage(i)}
                              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentImage ? "bg-primary" : "bg-background/60"}`} />
                          ))}
                        </div>
                        <Badge className="absolute bottom-3 right-3 bg-background/80 text-foreground text-xs">
                          {currentImage + 1}/{images.length}
                        </Badge>
                      </>
                    )}
                  </>
                ) : (
                  <div className="h-48 sm:h-72 flex items-center justify-center">
                    <CatIcon className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* 3-dot menu on image */}
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="bg-background/80 backdrop-blur-sm rounded-full p-2 hover:bg-background transition-colors">
                        <MoreVertical className="w-4 h-4 text-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={toggleLike} className="flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${userLiked ? "text-destructive fill-destructive" : ""}`} />
                        {userLiked ? "Rimuovi Mi piace" : "Mi piace"} {(annuncio as any).mi_piace > 0 ? `(${(annuncio as any).mi_piace})` : ""}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user && autore?.telefono && (
                        <DropdownMenuItem asChild>
                          <a href={`tel:${autore.telefono}`} className="flex items-center gap-2"><Phone className="w-4 h-4" /> Chiama</a>
                        </DropdownMenuItem>
                      )}
                      {user && autore?.email && (
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${autore.email}`} className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</a>
                        </DropdownMenuItem>
                      )}
                      {annuncio.user_id !== user?.id && (
                        <DropdownMenuItem onClick={handleContatta} className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" /> Contatta
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleShare} className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Condividi
                      </DropdownMenuItem>
                      {isSpecialCategory && user && annuncio.user_id !== user?.id && !userReview && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowReviewForm(true)} className="flex items-center gap-2">
                            <Star className="w-4 h-4" /> Recensisci
                          </DropdownMenuItem>
                        </>
                      )}
                      {user && annuncio.user_id !== user?.id && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowSegnala(true)} className="flex items-center gap-2 text-destructive">
                            <Flag className="w-4 h-4" /> Segnala
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Title and meta */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {categoria && (
                    <Badge variant="secondary" className="gap-1">
                      <CatIcon className="w-3 h-3" /> {categoria.label}
                    </Badge>
                  )}
                  {catAttivita && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${catAttivitaColor}`}>
                      {catAttivita}
                    </span>
                  )}
                  {isSpecialCategory && (avgRating || recensioni.length > 0) && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s < Math.round(Number(avgRating || 0)) ? (isProf ? 'text-blue-500 fill-blue-500' : 'text-emerald-500 fill-emerald-500') : 'text-muted-foreground/30'}`} />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">{avgRating} ({recensioni.length})</span>
                    </div>
                  )}
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(annuncio.created_at), "d MMMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" /> {annuncio.visualizzazioni}
                  </span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
                  {annuncio.titolo}
                </h1>
                {isSpecialCategory && autore?.nome_attivita && (
                  <p className="text-lg text-muted-foreground mb-2 flex items-center gap-2">
                    {isProf ? <Building2 className="w-5 h-5 text-blue-500" /> : <Store className="w-5 h-5 text-emerald-500" />}
                    {autore.nome_attivita}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(annuncio as any).condizione === "nuovo" && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500 text-white">Nuovo</span>}
                  {(annuncio as any).condizione === "usato" && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-500 text-black">Usato</span>}
                  {(annuncio as any).tipo_operazione === "vendita" && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white">Vendita</span>}
                  {(annuncio as any).tipo_operazione === "locazione" && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-purple-500 text-white">Locazione</span>}
                </div>
                {annuncio.prezzo != null && (
                  <p className="text-2xl font-bold text-primary mb-2">€{annuncio.prezzo.toFixed(2)}</p>
                )}
                {/* Address */}
                {((annuncio as any).via || annuncio.quartiere) && (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {(annuncio as any).via ? `${(annuncio as any).via}${(annuncio as any).civico ? ` ${(annuncio as any).civico}` : ''}${(annuncio as any).citta ? `, ${(annuncio as any).citta}` : ''}${(annuncio as any).cap ? ` ${(annuncio as any).cap}` : ''}` : annuncio.quartiere}
                  </p>
                )}

                {/* Quick like button */}
                <button onClick={toggleLike} className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
                  <Heart className={`w-5 h-5 ${userLiked ? "text-destructive fill-destructive" : ""}`} />
                  <span>{(annuncio as any).mi_piace || 0}</span>
                </button>
              </div>

              {/* Description */}
              {annuncio.descrizione && (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">Descrizione</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{annuncio.descrizione}</p>
                </div>
              )}

              {/* Opening hours */}
              {(annuncio as any).orari_apertura && (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2"><Clock className="w-5 h-5" /> Orari di apertura</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{(annuncio as any).orari_apertura}</p>
                </div>
              )}

              {/* Website */}
              {(annuncio as any).sito_web && (
                <div className="bg-card border rounded-xl p-5">
                  <a href={(annuncio as any).sito_web.startsWith('http') ? (annuncio as any).sito_web : `https://${(annuncio as any).sito_web}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline">
                    <Globe className="w-5 h-5" /> {(annuncio as any).sito_web}
                  </a>
                </div>
              )}

              {/* Contenuto speciale (Menù / Offerte) */}
              {(annuncio as any).contenuto_speciale && (
                <div className={`border rounded-xl p-5 ${isProf ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'}`}>
                  <h2 className="font-heading font-bold text-foreground mb-3">📋 Menù / Listino</h2>
                  <p className="text-foreground/80 whitespace-pre-line leading-relaxed">{(annuncio as any).contenuto_speciale}</p>
                </div>
              )}

              {/* Map */}
              {hasLocation ? (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">📍 Posizione</h2>
                  <div className="rounded-xl overflow-hidden mb-3">
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+${isProf ? '3b82f6' : isSpecialCategory ? '10b981' : 'ef4444'}(${lon},${lat})/${lon},${lat},15,0/600x300@2x?access_token=${MAPBOX_TOKEN}`}
                      alt="Mappa posizione" className="w-full h-[200px] object-cover" loading="lazy" />
                  </div>
                  <Button variant="outline" className="w-full"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank')}>
                    <Navigation className="w-4 h-4 mr-2" /> Portami qui
                  </Button>
                </div>
              ) : isSpecialCategory ? (
                <div className="bg-card border rounded-xl p-5">
                  <h2 className="font-heading font-bold text-foreground mb-3">📍 Posizione</h2>
                  <p className="text-sm text-muted-foreground">Posizione non disponibile per questa attività.</p>
                </div>
              ) : null}

              {/* Reviews section */}
              {isSpecialCategory && (
                <div className="bg-card border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-heading font-bold text-foreground">⭐ Recensioni {recensioni.length > 0 ? `(${recensioni.length})` : ''}</h2>
                    {user && annuncio.user_id !== user?.id && !userReview && (
                      <Button size="sm" variant="outline" onClick={() => setShowReviewForm(true)}>
                        <Star className="w-4 h-4 mr-1" /> Recensisci
                      </Button>
                    )}
                  </div>

                  {/* Review form */}
                  {showReviewForm && (
                    <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Voto</label>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <button key={s} onClick={() => setReviewVoto(s + 1)} className="focus:outline-none">
                              <Star className={`w-6 h-6 transition-colors ${s < reviewVoto ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <Textarea placeholder="Scrivi un commento (opzionale)..." value={reviewCommento} onChange={(e) => setReviewCommento(e.target.value)} rows={3} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSubmitReview} disabled={reviewSending}>
                          {reviewSending ? "Invio..." : "Invia recensione"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowReviewForm(false)}>Annulla</Button>
                      </div>
                    </div>
                  )}

                  {recensioni.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Ancora nessuna recensione. Sii il primo!</p>
                  ) : (
                    <div className="space-y-4">
                      {recensioni.map((r: any) => (
                        <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Avatar className="w-7 h-7">
                              {r.profilo?.avatar_url && <AvatarImage src={r.profilo.avatar_url} />}
                              <AvatarFallback><User className="w-3 h-3" /></AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">
                              {r.profilo?.nome || "Utente"} {r.profilo?.cognome ? r.profilo.cognome.charAt(0) + '.' : ''}
                            </span>
                            <div className="flex items-center gap-0.5 ml-auto">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star key={s} className={`w-3 h-3 ${s < r.voto ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                              ))}
                            </div>
                            {/* Admin actions on reviews */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 ml-2">
                                <button onClick={() => { setEditingReview(r); setEditReviewVoto(r.voto); setEditReviewCommento(r.commento || ""); }}
                                  className="text-muted-foreground hover:text-primary transition-colors" title="Modifica">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeletingReviewId(r.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors" title="Elimina">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {r.commento && <p className="text-sm text-foreground/80 ml-9">{r.commento}</p>}
                          <p className="text-xs text-muted-foreground ml-9 mt-1">{format(new Date(r.created_at), "d MMM yyyy", { locale: it })}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar - clean, minimal */}
            <div className="space-y-6">
              {/* Author card */}
              {autore && (
                <div className="bg-card border rounded-xl p-5">
                  <h3 className="font-heading font-bold text-foreground mb-4">Pubblicato da</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12">
                      {autore.avatar_url && <AvatarImage src={autore.avatar_url} />}
                      <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {autore.nome || "Utente"} {autore.cognome ? autore.cognome.charAt(0) + "." : ""}
                      </p>
                      {autore.nome_attivita && <p className="text-sm font-medium text-primary">{autore.nome_attivita}</p>}
                      {autore.quartiere && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {autore.quartiere}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Membro dal {format(new Date(autore.created_at), "MMMM yyyy", { locale: it })}
                  </p>

                  {/* Contact info */}
                  <div className="space-y-2 border-t pt-3">
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
                        <a href="/login" className="underline hover:text-primary">Accedi</a> per vedere i contatti.
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                            <div className="w-full h-full flex items-center justify-center"><CatIcon className="w-5 h-5 text-muted-foreground/40" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{a.titolo}</p>
                          {a.prezzo != null && <p className="text-sm font-bold text-primary">€{a.prezzo.toFixed(2)}</p>}
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
          {images.length > 1 && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">{currentImage + 1} / {images.length}</div>}
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

      {/* Admin edit review dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifica recensione</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Voto</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, s) => (
                  <button key={s} onClick={() => setEditReviewVoto(s + 1)} className="focus:outline-none">
                    <Star className={`w-6 h-6 transition-colors ${s < editReviewVoto ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Commento..." value={editReviewCommento} onChange={(e) => setEditReviewCommento(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>Annulla</Button>
            <Button onClick={handleEditReview}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin delete review confirmation */}
      <Dialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina recensione</DialogTitle>
            <DialogDescription>Sei sicuro di voler eliminare questa recensione? L'azione è irreversibile.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingReviewId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteReview}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
