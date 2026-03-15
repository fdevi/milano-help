import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { icons, LucideIcon, ImageOff, SlidersHorizontal, X, Calendar, MapPin, Clock, Search, Filter, ArrowUpDown, CalendarDays, Star, Building2, Store, Phone, Mail } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useQuartieri } from "@/hooks/useQuartieri";
import { getCategoryStyle, getAutoDescription } from "@/lib/eventCategoryUtils";

type SortOption = "data_desc" | "prezzo_asc" | "prezzo_desc";

const isEventCategory = (nome?: string) => nome === "evento";
const isProfCategory = (nome?: string) => nome === "Professionisti";
const isNegoziCategory = (nome?: string) => nome === "negozi_di_quartiere";
const isSpecialCategory = (nome?: string) => isProfCategory(nome) || isNegoziCategory(nome);

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
    enabled: !!nome && !isEvento && !isSpecial,
  });

  // Fetch profiles for special categories (Professionisti / Negozi)
  const { data: specialProfiles = [], isLoading: loadingSpecial } = useQuery({
    queryKey: ["special_profiles", nome],
    queryFn: async () => {
      const tipoAccount = isProf ? "professionista" : "negoziante";
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, nome_attivita, quartiere, avatar_url, telefono, email, mostra_telefono, mostra_email")
        .eq("tipo_account", tipoAccount)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isSpecial,
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

  // Fetch annunci attivi per questa categoria
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
    enabled: !!categoria?.id && !isEvento,
    staleTime: 30_000,
  });

  const isLoading = isSpecial ? loadingSpecial : isEvento ? loadingEventi : loadingAnnunci;

  // Filter special profiles
  const filteredSpecialProfiles = useMemo(() => {
    if (!isSpecial) return [];
    let results = [...specialProfiles];
    const q = specialSearch.toLowerCase().trim();
    if (q) {
      results = results.filter((p: any) => 
        (p.nome_attivita || '').toLowerCase().includes(q) ||
        (p.nome || '').toLowerCase().includes(q) ||
        (p.cognome || '').toLowerCase().includes(q) ||
        (p.quartiere || '').toLowerCase().includes(q)
      );
    }
    if (specialQuartiere !== "tutti") {
      results = results.filter((p: any) => p.quartiere === specialQuartiere);
    }
    return results;
  }, [specialProfiles, specialSearch, specialQuartiere, isSpecial]);

  const specialQuartieriList = useMemo(() => {
    const set = new Set<string>();
    specialProfiles.forEach((p: any) => { if (p.quartiere) set.add(p.quartiere); });
    return Array.from(set).sort();
  }, [specialProfiles]);

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
    if (isEvento) return [];
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
  }, [annunci, selectedQuartieri, prezzoMin, prezzoMax, sortBy, isEvento]);

  const Icon = categoria
    ? (icons as Record<string, LucideIcon>)[categoria.icona] || icons.Circle
    : icons.Circle;

  const toggleQuartiere = (q: string) => {
    setSelectedQuartieri((prev) => prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]);
  };

  const hasActiveFilters = selectedQuartieri.length > 0 || prezzoMin || prezzoMax;

  if (errorCat && !isEvento && !isSpecial) {
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
                    {isLoading ? "Caricamento..." : `${filteredSpecialProfiles.length} ${isProf ? 'professionisti' : 'negozi'} registrati`}
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

        {/* SPECIAL CATEGORIES: Search & Grid */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border overflow-hidden">
                    <div className="flex gap-4 p-5">
                      <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSpecialProfiles.length === 0 ? (
              <div className="text-center py-16">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isProf ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'}`}>
                  {isProf ? <Building2 className="w-8 h-8 text-blue-500" /> : <Store className="w-8 h-8 text-emerald-500" />}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  Nessun {isProf ? 'professionista' : 'negozio'} trovato
                </h3>
                <p className="text-muted-foreground">
                  {specialSearch || specialQuartiere !== 'tutti' ? 'Prova a modificare i filtri di ricerca.' : `Non ci sono ancora ${isProf ? 'professionisti' : 'negozi'} registrati.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSpecialProfiles.map((profile: any, i: number) => {
                  const fakeRating = (3.5 + (profile.nome_attivita?.length || 5) % 15 / 10).toFixed(1);
                  const fakeReviews = 2 + (profile.nome_attivita?.length || 3) % 20;
                  return (
                    <motion.div key={profile.user_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}>
                      <div className={`group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border-2 ${
                        isProf ? 'border-blue-200 dark:border-blue-800 hover:border-blue-400' : 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'
                      }`}>
                        <div className="p-5 flex gap-4">
                          {/* Avatar */}
                          <div className={`w-20 h-20 rounded-xl shrink-0 overflow-hidden flex items-center justify-center ${
                            isProf ? 'bg-blue-100 dark:bg-blue-900' : 'bg-emerald-100 dark:bg-emerald-900'
                          }`}>
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.nome_attivita || ''} className="w-full h-full object-cover" />
                            ) : (
                              isProf ? <Building2 className="w-8 h-8 text-blue-500" /> : <Store className="w-8 h-8 text-emerald-500" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-foreground text-lg truncate">
                              {profile.nome_attivita || `${profile.nome || ''} ${profile.cognome || ''}`.trim() || 'Attività'}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {profile.nome && profile.cognome ? `${profile.nome} ${profile.cognome}` : ''}
                            </p>
                            
                            {/* Rating */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, s) => (
                                  <Star key={s} className={`w-3.5 h-3.5 ${s < Math.round(Number(fakeRating)) ? (isProf ? 'text-blue-500 fill-blue-500' : 'text-emerald-500 fill-emerald-500') : 'text-muted-foreground/30'}`} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">{fakeRating} ({fakeReviews} recensioni)</span>
                            </div>
                            
                            {/* Quartiere */}
                            {profile.quartiere && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{profile.quartiere}</span>
                              </div>
                            )}

                            {/* Contact */}
                            <div className="flex items-center gap-3 mt-2">
                              {profile.mostra_telefono && profile.telefono && (
                                <a href={`tel:${profile.telefono}`} className={`text-xs flex items-center gap-1 ${isProf ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                                  <Phone className="w-3 h-3" /> Chiama
                                </a>
                              )}
                              {profile.mostra_email && profile.email && (
                                <a href={`mailto:${profile.email}`} className={`text-xs flex items-center gap-1 ${isProf ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                                  <Mail className="w-3 h-3" /> Email
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Prezzo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i prezzi</SelectItem>
                  <SelectItem value="gratuito">🆓 Gratuito</SelectItem>
                  <SelectItem value="pagamento">💰 A pagamento</SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventSortBy} onValueChange={setEventSortBy}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Ordina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data">Data più vicina</SelectItem>
                  <SelectItem value="rilevanza">Rilevanza ricerca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* ANNUNCI: Filters toolbar */}
        {!isEvento && !isSpecial && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Ordina per" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_desc">Più recenti</SelectItem>
                  <SelectItem value="prezzo_asc">Prezzo crescente</SelectItem>
                  <SelectItem value="prezzo_desc">Prezzo decrescente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="w-4 h-4 mr-1" /> Filtri
                {hasActiveFilters && <Badge variant="secondary" className="ml-2 text-xs">{selectedQuartieri.length + (prezzoMin ? 1 : 0) + (prezzoMax ? 1 : 0)}</Badge>}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={() => { setSelectedQuartieri([]); setPrezzoMin(""); setPrezzoMax(""); }}>
                  <X className="w-4 h-4 mr-1" /> Rimuovi filtri
                </Button>
              )}
            </div>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card border rounded-xl p-4 mb-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Fascia di prezzo</label>
                  <div className="flex gap-3 items-center">
                    <Input type="number" placeholder="Min €" value={prezzoMin} onChange={(e) => setPrezzoMin(e.target.value)} className="w-32" />
                    <span className="text-muted-foreground">—</span>
                    <Input type="number" placeholder="Max €" value={prezzoMax} onChange={(e) => setPrezzoMax(e.target.value)} className="w-32" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Quartiere</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {quartieri.map((q) => (
                      <Badge key={q.nome} variant={selectedQuartieri.includes(q.nome) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleQuartiere(q.nome)}>
                        {q.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Grid (skip for special categories - they render above) */}
        {isSpecial ? null : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : isEvento ? (
          filteredEventi.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">Nessun evento trovato</h3>
              <p className="text-muted-foreground">Prova a cambiare i filtri di ricerca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEventi.map((evento: any, i: number) => {
                const style = getCategoryStyle(evento.categoria);
                const autoDesc = getAutoDescription(evento);
                return (
                  <motion.div key={evento.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                    <Link to={`/evento/${evento.id}`}>
                      <div className="group bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Cover */}
                        <div className="relative h-48 bg-muted overflow-hidden">
                          {evento.immagine ? (
                            <img src={evento.immagine} alt={evento.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className={`flex items-center justify-center h-full ${style.bg}`}>
                              <span className="text-6xl">{style.emoji}</span>
                            </div>
                          )}
                          {/* Date badge */}
                          <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center shadow-sm">
                            <p className="text-xs font-bold text-primary leading-tight">{new Date(evento.data).toLocaleDateString("it", { month: "short" }).toUpperCase()}</p>
                            <p className="text-lg font-heading font-bold text-foreground leading-tight">{new Date(evento.data).getDate()}</p>
                          </div>
                          {/* Price badge */}
                          <Badge className={`absolute top-3 right-3 ${evento.gratuito ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {evento.gratuito ? "Gratuito" : evento.prezzo != null ? `€${evento.prezzo}` : ""}
                          </Badge>
                          {/* Status badges */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                            <EventStatusBadge dataInizio={evento.data} dataFine={evento.fine} />
                            {evento.fonte_esterna && (
                              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">⭐ Ufficiale</Badge>
                            )}
                          </div>
                          {/* Category badge */}
                          {evento.categoria && (
                            <Badge variant="outline" className="absolute bottom-3 right-3 bg-card/80 backdrop-blur-sm text-[10px]">
                              {style.emoji} {evento.categoria}
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {evento.fine
                                ? `Dal ${formatEventDate(evento.data)} al ${formatEventDate(evento.fine)}`
                                : formatEventDate(evento.data)}
                            </span>
                          </div>
                          <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {evento.titolo}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{autoDesc}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{evento.luogo}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : filteredAnnunci.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ImageOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">Nessun annuncio trovato</h3>
            <p className="text-muted-foreground">{hasActiveFilters ? "Prova a modificare i filtri di ricerca." : "Non ci sono ancora annunci in questa categoria."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnunci.map((annuncio, i) => {
              const firstImage = annuncio.immagini?.[0];
              return (
                <motion.div key={annuncio.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`/annuncio/${annuncio.id}`}>
                    <div className="group bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
                        {firstImage ? (
                          <img src={firstImage} alt={annuncio.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        ) : (
                          <Icon className="w-12 h-12 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">{annuncio.titolo}</h3>
                        {annuncio.prezzo != null && <p className="text-lg font-bold text-primary mb-1">€{annuncio.prezzo.toFixed(2)}</p>}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          {annuncio.quartiere && <span>{annuncio.quartiere}</span>}
                          <span>{formatDistanceToNow(new Date(annuncio.created_at), { addSuffix: true, locale: it })}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CategoriaPage;
