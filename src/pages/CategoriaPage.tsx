import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { icons, LucideIcon, ImageOff, SlidersHorizontal, X, Calendar, MapPin, Clock, Search, Filter, ArrowUpDown, CalendarDays, Star, Building2, Store, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import EventStatusBadge from "@/components/EventStatusBadge";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuartieri } from "@/hooks/useQuartieri";
import { getCategoryStyle, getAutoDescription } from "@/lib/eventCategoryUtils";

type SortOption = "data_desc" | "prezzo_asc" | "prezzo_desc";

const isEventCategory = (nome?: string) => nome === "evento";
const isProfCategory = (nome?: string) => nome === "Professionisti";
const isNegoziCategory = (nome?: string) => nome === "negozi_di_quartiere";
const isSpecialCategory = (nome?: string) => isProfCategory(nome) || isNegoziCategory(nome);

const BUSINESS_CATEGORY_COLORS: Record<string, string> = {
  "Alimentari": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Panetteria": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Ristorante": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  "Bar / Caffetteria": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  "Parrucchiere": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "Estetista": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  "Abbigliamento": "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  "Elettronica": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  "Farmacia": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Studio Legale": "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  "Commercialista": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  "Idraulico": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Elettricista": "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  "Artigiano": "bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200",
  "Medico": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "Dentista": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  "Veterinario": "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  "Palestra / Fitness": "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  "Ferramenta": "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
  "Libreria": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Altro": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const DATE_FILTERS = [
  { label: "Tutti", value: "tutti" },
  { label: "Oggi", value: "oggi" },
  { label: "Weekend", value: "weekend" },
  { label: "Prossimi 7 gg", value: "settimana" },
  { label: "Mese", value: "mese" },
];

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}, ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

const CategoriaPage = () => {
  const { nome } = useParams<{ nome: string }>();
  const { quartieri } = useQuartieri();
  const isEvento = isEventCategory(nome);
  const isProf = isProfCategory(nome);
  const isNegozi = isNegoziCategory(nome);
  const isSpecial = isSpecialCategory(nome);

  // Annunci state
  const [sortBy, setSortBy] = useState<SortOption>("data_desc");
  const [selectedQuartieri, setSelectedQuartieri] = useState<string[]>([]);
  const [prezzoMin, setPrezzoMin] = useState("");
  const [prezzoMax, setPrezzoMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Special categories state
  const [specialSearch, setSpecialSearch] = useState("");
  const [specialQuartiere, setSpecialQuartiere] = useState("tutti");

  // Eventi state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("tutti");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState("tutti");
  const [eventSortBy, setEventSortBy] = useState("data");

  // Fetch categoria
  const { data: categoria, isLoading: loadingCat, error: errorCat } = useQuery({
    queryKey: ["categoria", nome],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("*")
        .eq("nome", nome!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!nome && !isEvento,
  });

  // Fetch annunci for special categories
  const { data: specialAnnunci = [], isLoading: loadingSpecial } = useQuery({
    queryKey: ["special_annunci", categoria?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci")
        .select("id, titolo, descrizione, prezzo, quartiere, immagini, created_at, categoria_id, user_id, mi_piace, visualizzazioni, mostra_email, mostra_telefono, contenuto_speciale, via, civico, citta, cap, lat, lon, sito_web, orari_apertura, categoria_attivita")
        .eq("stato", "attivo")
        .eq("categoria_id", categoria!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (annuncio: any) => {
          const { data: profilo } = await supabase
            .from("profiles")
            .select("nome, cognome, nome_attivita, quartiere, avatar_url, telefono, email, mostra_telefono, mostra_email")
            .eq("user_id", annuncio.user_id)
            .single();
          return { ...annuncio, profilo };
        })
      );
      return enriched;
    },
    enabled: isSpecial && !!categoria?.id,
    staleTime: 30_000,
  });

  // Fetch eventi attivi con profilo organizzatore
  const { data: eventi = [], isLoading: loadingEventi } = useQuery({
    queryKey: ["eventi_categoria_pubblici"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventi")
        .select("*")
        .eq("stato", "attivo")
        .order("data", { ascending: true });
      if (error) throw error;

      const eventiConOrg = await Promise.all(
        (data || []).map(async (evento: any) => {
          const { data: profilo } = await supabase
            .from("profiles")
            .select("nome, cognome, avatar_url")
            .eq("user_id", evento.organizzatore_id)
            .single();
          const isExternal = !!evento.fonte_esterna;
          return {
            ...evento,
            organizzatore_nome: isExternal ? "Milano Help" : (profilo ? `${profilo.nome || ""} ${profilo.cognome || ""}`.trim() || "Utente" : "Utente"),
            organizzatore_avatar: isExternal ? null : profilo?.avatar_url,
          };
        })
      );
      return eventiConOrg;
    },
    enabled: isEvento,
    staleTime: 30_000,
  });

  // Fetch annunci attivi per questa categoria (standard, non-special)
  const { data: annunci = [], isLoading: loadingAnnunci } = useQuery({
    queryKey: ["annunci_categoria", categoria?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci")
        .select("id, titolo, descrizione, prezzo, quartiere, immagini, created_at, categoria_id")
        .eq("stato", "attivo")
        .eq("categoria_id", categoria!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoria?.id && !isEvento && !isSpecial,
    staleTime: 30_000,
  });

  const isLoading = isSpecial ? (loadingCat || loadingSpecial) : isEvento ? loadingEventi : loadingAnnunci;

  // Filter special annunci
  const filteredSpecialAnnunci = useMemo(() => {
    if (!isSpecial) return [];
    let results = [...specialAnnunci];
    const q = specialSearch.toLowerCase().trim();
    if (q) {
      results = results.filter((a: any) =>
        (a.titolo || '').toLowerCase().includes(q) ||
        (a.profilo?.nome_attivita || '').toLowerCase().includes(q) ||
        (a.profilo?.nome || '').toLowerCase().includes(q) ||
        (a.quartiere || '').toLowerCase().includes(q) ||
        (a.categoria_attivita || '').toLowerCase().includes(q)
      );
    }
    if (specialQuartiere !== "tutti") {
      results = results.filter((a: any) => a.quartiere === specialQuartiere);
    }
    return results;
  }, [specialAnnunci, specialSearch, specialQuartiere, isSpecial]);

  const specialQuartieriList = useMemo(() => {
    const set = new Set<string>();
    specialAnnunci.forEach((a: any) => { if (a.quartiere) set.add(a.quartiere); });
    return Array.from(set).sort();
  }, [specialAnnunci]);

  // Extract unique event categories
  const dbCategories = useMemo(() => {
    const cats = new Set<string>();
    eventi.forEach((e: any) => { if (e.categoria) cats.add(e.categoria); });
    return Array.from(cats).sort();
  }, [eventi]);

  // Filter & sort events
  const filteredEventi = useMemo(() => {
    if (!isEvento) return [];
    const now = new Date();
    const q = searchQuery.toLowerCase().trim();

    let results = eventi.filter((e: any) => {
      if (selectedCategory && (e.categoria == null || String(e.categoria).toLowerCase() !== selectedCategory.toLowerCase())) return false;
      if (q) {
        const inTitle = e.titolo?.toLowerCase().includes(q);
        const inDesc = e.descrizione?.toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      if (priceFilter === "gratuito" && !e.gratuito) return false;
      if (priceFilter === "pagamento" && e.gratuito) return false;

      if (dateFilter !== "tutti") {
        const eventDate = new Date(e.data);
        if (dateFilter === "oggi") {
          if (eventDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "weekend") {
          const dayOfWeek = now.getDay();
          const saturday = new Date(now);
          saturday.setDate(now.getDate() + (6 - dayOfWeek));
          saturday.setHours(0, 0, 0, 0);
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          sunday.setHours(23, 59, 59, 999);
          if (eventDate < saturday || eventDate > sunday) return false;
        } else if (dateFilter === "settimana") {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() + 7);
          if (eventDate < now || eventDate > weekEnd) return false;
        } else if (dateFilter === "mese") {
          const monthEnd = new Date(now);
          monthEnd.setDate(now.getDate() + 30);
          if (eventDate < now || eventDate > monthEnd) return false;
        }
      }
      return true;
    });

    if (eventSortBy === "rilevanza" && q) {
      results.sort((a: any, b: any) => {
        const aTitle = a.titolo?.toLowerCase().includes(q) ? 0 : 1;
        const bTitle = b.titolo?.toLowerCase().includes(q) ? 0 : 1;
        return aTitle - bTitle;
      });
    } else {
      results.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }
    return results;
  }, [eventi, selectedCategory, searchQuery, priceFilter, dateFilter, eventSortBy, isEvento]);

  // Filter & sort annunci
  const filteredAnnunci = useMemo(() => {
    if (isEvento || isSpecial) return [];
    let result = [...annunci];
    if (selectedQuartieri.length > 0) {
      result = result.filter((a) => a.quartiere && selectedQuartieri.includes(a.quartiere));
    }
    if (prezzoMin) result = result.filter((a) => a.prezzo != null && a.prezzo >= Number(prezzoMin));
    if (prezzoMax) result = result.filter((a) => a.prezzo != null && a.prezzo <= Number(prezzoMax));
    switch (sortBy) {
      case "prezzo_asc": result.sort((a, b) => (a.prezzo ?? 0) - (b.prezzo ?? 0)); break;
      case "prezzo_desc": result.sort((a, b) => (b.prezzo ?? 0) - (a.prezzo ?? 0)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [annunci, selectedQuartieri, prezzoMin, prezzoMax, sortBy, isEvento, isSpecial]);

  const Icon = categoria
    ? (icons as Record<string, LucideIcon>)[categoria.icona] || icons.Circle
    : icons.Circle;

  const toggleQuartiere = (q: string) => {
    setSelectedQuartieri((prev) => prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]);
  };

  const hasActiveFilters = selectedQuartieri.length > 0 || prezzoMin || prezzoMax;

  if (errorCat && !isEvento) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Categoria non trovata</h1>
          <p className="text-muted-foreground mb-6">La categoria "{nome}" non esiste o è stata rimossa.</p>
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
        {/* Header */}
        {isSpecial ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className={`rounded-2xl p-6 md:p-8 ${isProf ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isProf ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  {isProf ? <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" /> : <Store className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div>
                  <h1 className="font-heading text-3xl font-extrabold text-foreground">
                    {isProf ? "Professionisti" : "Negozi di Quartiere"}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {isLoading ? "Caricamento..." : `${filteredSpecialAnnunci.length} attività in vetrina`}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-2xl">
                {isProf
                  ? "Scopri i professionisti del tuo quartiere: artigiani, consulenti, tecnici e molto altro. Servizi di qualità, vicino a te."
                  : "Esplora i negozi e le attività commerciali del tuo quartiere. Supporta il commercio locale!"}
              </p>
            </div>
          </motion.div>
        ) : isEvento ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="font-heading text-3xl font-extrabold text-foreground">🎉 Eventi a Milano</h1>
            <p className="text-muted-foreground mt-1">
              {isLoading ? "Caricamento..." : `${filteredEventi.length} eventi trovati`}
            </p>
          </motion.div>
        ) : loadingCat ? (
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-5 w-32" /></div>
          </div>
        ) : categoria ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground">{categoria.label}</h1>
              <p className="text-muted-foreground">{isLoading ? "Caricamento..." : `${annunci.length} annunci attivi`}</p>
            </div>
          </motion.div>
        ) : null}

        {/* SPECIAL CATEGORIES: Search & Vetrina Grid */}
        {isSpecial && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Cerca ${isProf ? 'professionisti' : 'negozi'}...`}
                  value={specialSearch}
                  onChange={(e) => setSpecialSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={specialQuartiere} onValueChange={setSpecialQuartiere}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Quartiere" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i quartieri</SelectItem>
                  {specialQuartieriList.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4 bg-card rounded-xl border p-0 h-[140px]">
                    <Skeleton className="w-[120px] h-[140px] rounded-l-xl shrink-0" />
                    <div className="flex-1 space-y-2 py-4 pr-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></div>
                  </div>
                ))}
              </div>
            ) : filteredSpecialAnnunci.length === 0 ? (
              <div className="text-center py-16">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isProf ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  {isProf ? <Building2 className="w-8 h-8 text-blue-500" /> : <Store className="w-8 h-8 text-emerald-500" />}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">Nessuna attività trovata</h3>
                <p className="text-muted-foreground">
                  {specialSearch || specialQuartiere !== 'tutti' ? 'Prova a modificare i filtri di ricerca.' : 'Non ci sono ancora attività in questa sezione.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSpecialAnnunci.map((annuncio: any, i: number) => {
                  const firstImage = annuncio.immagini?.[0];
                  const profilo = annuncio.profilo;
                  const nomeAttivita = annuncio.titolo || profilo?.nome_attivita || "Attività";
                  const fakeRating = (3.5 + (annuncio.titolo?.length || 5) % 15 / 10).toFixed(1);
                  const fakeReviews = 2 + (annuncio.titolo?.length || 3) % 20;
                  const accentColor = isProf ? 'blue' : 'emerald';
                  const catAttivita = annuncio.categoria_attivita;
                  const badgeColor = catAttivita ? (BUSINESS_CATEGORY_COLORS[catAttivita] || BUSINESS_CATEGORY_COLORS["Altro"]) : "";

                  return (
                    <motion.div key={annuncio.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2) }}>
                      <Link to={`/annuncio/${annuncio.id}`} className="block">
                        <div className={`group flex bg-card rounded-xl overflow-hidden border-2 hover:shadow-lg transition-all duration-300 h-[140px] ${
                          isProf ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400' : 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                        }`}>
                          {/* Photo left - fixed 120x120 square */}
                          <div className="w-[120px] h-[140px] shrink-0 relative overflow-hidden">
                            {firstImage ? (
                              <img src={firstImage} alt={nomeAttivita} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <div className={`flex items-center justify-center w-full h-full ${isProf ? 'bg-blue-50 dark:bg-blue-950' : 'bg-emerald-50 dark:bg-emerald-950'}`}>
                                {isProf ? <Building2 className="w-10 h-10 text-blue-300" /> : <Store className="w-10 h-10 text-emerald-300" />}
                              </div>
                            )}
                          </div>

                          {/* Content right */}
                          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0 overflow-hidden">
                            <h3 className="font-heading font-bold text-foreground text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                              {nomeAttivita}
                            </h3>

                            {/* Category badge */}
                            {catAttivita && (
                              <div className="mt-1">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
                                  {catAttivita}
                                </span>
                              </div>
                            )}

                            {/* Rating */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, s) => (
                                  <Star key={s} className={`w-3 h-3 ${s < Math.round(Number(fakeRating)) ? (isProf ? 'text-blue-500 fill-blue-500' : 'text-emerald-500 fill-emerald-500') : 'text-muted-foreground/30'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{fakeRating} ({fakeReviews})</span>
                            </div>

                            {/* Location */}
                            {(annuncio.quartiere || annuncio.citta) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{annuncio.via ? `${annuncio.via}${annuncio.civico ? ` ${annuncio.civico}` : ''}, ` : ''}{annuncio.quartiere || annuncio.citta}</span>
                              </div>
                            )}

                            {/* Contact icons */}
                            <div className="flex items-center gap-3 mt-1.5" onClick={(e) => e.preventDefault()}>
                              {profilo?.mostra_telefono && profilo?.telefono && (
                                <a href={`tel:${profilo.telefono}`} onClick={(e) => e.stopPropagation()} className={`${isProf ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'} transition-colors`}>
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                              {profilo?.mostra_email && profilo?.email && (
                                <a href={`mailto:${profilo.email}`} onClick={(e) => e.stopPropagation()} className={`${isProf ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'} transition-colors`}>
                                  <Mail className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* EVENTI: Search & Filters */}
        {isEvento && (
          <div className="space-y-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca eventi per titolo o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              {DATE_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant={dateFilter === f.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs rounded-full"
                  onClick={() => setDateFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={selectedCategory || "tutte"} onValueChange={(v) => setSelectedCategory(v === "tutte" ? null : v)}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutte">Tutte le categorie</SelectItem>
                  {dbCategories.map((c) => (
                    <SelectItem key={c} value={c}>{getCategoryStyle(c).emoji} {c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i prezzi</SelectItem>
                  <SelectItem value="gratuito">Gratuiti</SelectItem>
                  <SelectItem value="pagamento">A pagamento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventSortBy} onValueChange={setEventSortBy}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">Per data</SelectItem>
                  <SelectItem value="rilevanza">Rilevanza</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* EVENTI: Grid */}
        {isEvento && (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : filteredEventi.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">Nessun evento trovato</h3>
              <p className="text-muted-foreground">Prova a modificare i filtri di ricerca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEventi.map((evento: any) => {
                const style = getCategoryStyle(evento.categoria);
                return (
                  <Link key={evento.id} to={`/evento/${evento.id}`}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all group h-full flex flex-col">
                      {evento.immagine ? (
                        <div className="relative h-44 overflow-hidden">
                          <img src={evento.immagine} alt={evento.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          {evento.categoria && (
                            <div className="absolute top-3 left-3">
                      <Badge className={`${style.bg} border-0 text-xs`}>
                                {style.emoji} {evento.categoria.charAt(0).toUpperCase() + evento.categoria.slice(1)}
                              </Badge>
                            </div>
                          )}
                          {evento.gratuito && (
                            <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0 text-xs">Gratuito</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="relative h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-primary/30" />
                          {evento.categoria && (
                            <div className="absolute top-3 left-3">
                              <Badge className={`${style.bg} border-0 text-xs`}>
                                {style.emoji} {evento.categoria.charAt(0).toUpperCase() + evento.categoria.slice(1)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-heading font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {evento.titolo}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                          <Calendar className="w-4 h-4 shrink-0" />
                          {formatEventDate(evento.data)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate">{evento.luogo}</span>
                        </div>
                        {evento.prezzo != null && !evento.gratuito && (
                          <p className="text-sm font-bold text-primary mt-2">€{evento.prezzo.toFixed(2)}</p>
                        )}
                        <div className="mt-auto pt-3 flex items-center gap-2 text-xs text-muted-foreground border-t">
                          <span>👤 {evento.organizzatore_nome}</span>
                          <EventStatusBadge dataInizio={evento.data} dataFine={evento.fine} />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* ANNUNCI STANDARD: Filters & Grid */}
        {!isEvento && !isSpecial && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_desc">Più recenti</SelectItem>
                    <SelectItem value="prezzo_asc">Prezzo crescente</SelectItem>
                    <SelectItem value="prezzo_desc">Prezzo decrescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
                className={`gap-1.5 ${hasActiveFilters ? "border-primary text-primary" : ""}`}>
                <SlidersHorizontal className="w-4 h-4" /> Filtri {hasActiveFilters && "(attivi)"}
              </Button>
            </div>

            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mb-6 bg-card border rounded-xl p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Quartiere</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(quartieri.length > 0 ? quartieri : ["Brera", "Isola", "Navigli", "Porta Romana"]).map((q) => (
                      <Button key={q} variant={selectedQuartieri.includes(q) ? "default" : "outline"} size="sm"
                        className="h-7 text-xs rounded-full" onClick={() => toggleQuartiere(q)}>
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className="text-sm text-muted-foreground">Min €</label><Input type="number" value={prezzoMin} onChange={(e) => setPrezzoMin(e.target.value)} placeholder="0" /></div>
                  <div className="flex-1"><label className="text-sm text-muted-foreground">Max €</label><Input type="number" value={prezzoMax} onChange={(e) => setPrezzoMax(e.target.value)} placeholder="∞" /></div>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedQuartieri([]); setPrezzoMin(""); setPrezzoMax(""); }}>
                    <X className="w-3 h-3 mr-1" /> Resetta filtri
                  </Button>
                )}
              </motion.div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : filteredAnnunci.length === 0 ? (
              <div className="text-center py-16">
                <ImageOff className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">Nessun annuncio trovato</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "Prova a modificare i filtri." : "Non ci sono ancora annunci in questa categoria."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnnunci.map((annuncio) => (
                  <Link key={annuncio.id} to={`/annuncio/${annuncio.id}`}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-xl overflow-hidden border hover:shadow-lg transition-all group">
                      <div className="h-44 bg-muted overflow-hidden">
                        {annuncio.immagini?.[0] ? (
                          <img src={annuncio.immagini[0]} alt={annuncio.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {annuncio.titolo}
                        </h3>
                        {annuncio.prezzo != null && (
                          <p className="text-lg font-bold text-primary mt-1">€{annuncio.prezzo.toFixed(2)}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          {annuncio.quartiere && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {annuncio.quartiere}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(annuncio.created_at), "d MMM", { locale: it })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CategoriaPage;
