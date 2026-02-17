import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { icons, LucideIcon, ImageOff, SlidersHorizontal, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

type SortOption = "data_desc" | "prezzo_asc" | "prezzo_desc";

const CategoriaPage = () => {
  const { nome } = useParams<{ nome: string }>();
  const { quartieri } = useQuartieri();

  const [sortBy, setSortBy] = useState<SortOption>("data_desc");
  const [selectedQuartieri, setSelectedQuartieri] = useState<string[]>([]);
  const [prezzoMin, setPrezzoMin] = useState("");
  const [prezzoMax, setPrezzoMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    enabled: !!nome,
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
    enabled: !!categoria?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // Filtra e ordina
  const filteredAnnunci = useMemo(() => {
    let result = [...annunci];

    if (selectedQuartieri.length > 0) {
      result = result.filter((a) => a.quartiere && selectedQuartieri.includes(a.quartiere));
    }
    if (prezzoMin) {
      result = result.filter((a) => a.prezzo != null && a.prezzo >= Number(prezzoMin));
    }
    if (prezzoMax) {
      result = result.filter((a) => a.prezzo != null && a.prezzo <= Number(prezzoMax));
    }

    switch (sortBy) {
      case "prezzo_asc":
        result.sort((a, b) => (a.prezzo ?? 0) - (b.prezzo ?? 0));
        break;
      case "prezzo_desc":
        result.sort((a, b) => (b.prezzo ?? 0) - (a.prezzo ?? 0));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [annunci, selectedQuartieri, prezzoMin, prezzoMax, sortBy]);

  const Icon = categoria
    ? (icons as Record<string, LucideIcon>)[categoria.icona] || icons.Circle
    : icons.Circle;

  const toggleQuartiere = (q: string) => {
    setSelectedQuartieri((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  };

  const hasActiveFilters = selectedQuartieri.length > 0 || prezzoMin || prezzoMax;

  // Error state
  if (errorCat) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Categoria non trovata</h1>
          <p className="text-muted-foreground mb-6">La categoria "{nome}" non esiste o è stata rimossa.</p>
          <Link to="/">
            <Button>Torna alla home</Button>
          </Link>
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
        {loadingCat ? (
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ) : categoria ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-extrabold text-foreground">{categoria.label}</h1>
              <p className="text-muted-foreground">
                {loadingAnnunci ? "Caricamento..." : `${annunci.length} annunci attivi`}
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* Filters toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Ordina per" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_desc">Più recenti</SelectItem>
              <SelectItem value="prezzo_asc">Prezzo crescente</SelectItem>
              <SelectItem value="prezzo_desc">Prezzo decrescente</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Filtri
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {selectedQuartieri.length + (prezzoMin ? 1 : 0) + (prezzoMax ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedQuartieri([]);
                setPrezzoMin("");
                setPrezzoMax("");
              }}
            >
              <X className="w-4 h-4 mr-1" /> Rimuovi filtri
            </Button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border rounded-xl p-4 mb-6 space-y-4"
          >
            {/* Prezzo */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Fascia di prezzo</label>
              <div className="flex gap-3 items-center">
                <Input
                  type="number"
                  placeholder="Min €"
                  value={prezzoMin}
                  onChange={(e) => setPrezzoMin(e.target.value)}
                  className="w-32"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="number"
                  placeholder="Max €"
                  value={prezzoMax}
                  onChange={(e) => setPrezzoMax(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>

            {/* Quartieri */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Quartiere</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {quartieri.map((q) => (
                  <Badge
                    key={q.nome}
                    variant={selectedQuartieri.includes(q.nome) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleQuartiere(q.nome)}
                  >
                    {q.nome}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Grid */}
        {loadingAnnunci ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAnnunci.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ImageOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground mb-2">
              Nessun annuncio trovato
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "Prova a modificare i filtri di ricerca."
                : "Non ci sono ancora annunci in questa categoria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnunci.map((annuncio, i) => {
              const firstImage = annuncio.immagini?.[0];
              return (
                <motion.div
                  key={annuncio.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link to={`/annuncio/${annuncio.id}`}>
                    <div className="group bg-card rounded-xl border overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
                      {/* Image */}
                      <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={annuncio.titolo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <Icon className="w-12 h-12 text-muted-foreground/40" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-heading font-bold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {annuncio.titolo}
                        </h3>
                        {annuncio.prezzo != null && (
                          <p className="text-lg font-bold text-primary mb-1">
                            €{annuncio.prezzo.toFixed(2)}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          {annuncio.quartiere && <span>{annuncio.quartiere}</span>}
                          <span>
                            {formatDistanceToNow(new Date(annuncio.created_at), {
                              addSuffix: true,
                              locale: it,
                            })}
                          </span>
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
