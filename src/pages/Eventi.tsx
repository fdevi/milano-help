import { useToast } from "@/hooks/use-toast";
import EventStatusBadge from "@/components/EventStatusBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  Filter,
  Clock,
  Ticket,
  MoreHorizontal,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/AuthLayout";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { getCategoryStyle, getAutoDescription } from "@/lib/eventCategoryUtils";

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
  const day = dayNames[d.getDay()];
  const date = d.getDate();
  const month = monthNames[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${date} ${month}, ${hours}:${mins}`;
}

const EventCard = ({ event, isParticipating, onDelete }: { 
  event: any; 
  isParticipating: boolean;
  onDelete: (id: string) => void;
}) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  
  const orgInitials = event.organizzatore_nome?.split(" ").map((w: string) => w[0]).join("").toUpperCase() || "?";

  // Determina se l'utente corrente può modificare/eliminare questo evento
  const canEdit = isAdmin || event.organizzatore_id === user?.id;

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group relative">
      {/* Menu azioni (visibile solo se può modificare) */}
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/modifica-evento/${event.id}`)}>
              <Edit className="w-4 h-4 mr-2" /> Modifica
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(event.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Cover */}
      <div className="relative h-40 bg-muted">
        {event.immagine ? (
          <img src={event.immagine} alt={event.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          (() => {
            const style = getCategoryStyle(event.categoria);
            return (
              <div className={`flex items-center justify-center h-full ${style.bg}`}>
                <span className="text-5xl">{style.emoji}</span>
              </div>
            );
          })()
        )}
        {/* Date badge */}
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center shadow-sm">
          <p className="text-xs font-bold text-primary leading-tight">{new Date(event.data).toLocaleDateString("it", { month: "short" }).toUpperCase()}</p>
          <p className="text-lg font-heading font-bold text-foreground leading-tight">{new Date(event.data).getDate()}</p>
        </div>
        {/* Price badge */}
        <Badge className={`absolute top-3 right-3 ${event.gratuito ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          {event.gratuito ? "Gratuito" : `€${event.prezzo}`}
        </Badge>
        {/* Status badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <EventStatusBadge dataInizio={event.data} dataFine={event.fine} />
          {event.fonte_esterna && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
              ⭐ Ufficiale
            </Badge>
          )}
        </div>
        {isParticipating && (
          <Badge className="absolute bottom-3 right-3 bg-primary/90 text-primary-foreground text-xs">
            Partecipi
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            <span>
              {event.fine
                ? `Dal ${formatEventDate(event.data)} al ${formatEventDate(event.fine)}`
                : formatEventDate(event.data)}
            </span>
          </div>
          <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors">{event.titolo}</h3>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{getAutoDescription(event)}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{event.luogo}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={event.organizzatore_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{orgInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{event.organizzatore_nome || "Utente"}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {event.partecipanti || 0}
          </span>
        </div>
      </div>
    </Card>
  );
};

const Eventi = () => {
  const { user } = useAuth();
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [dateFilter, setDateFilter] = useState("tutti");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("tutti"); // tutti | gratuito | pagamento
  const [sortBy, setSortBy] = useState("data"); // data | rilevanza
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Carica eventi reali dal database
  const { data: eventiReali = [], isLoading } = useQuery({
    queryKey: ['eventi'],
    queryFn: async () => {
      console.log("🔍 Inizio caricamento eventi...");
      
      const { data, error } = await (supabase as any)
        .from('eventi')
        .select('*')
        .order('data', { ascending: true });
      
      if (error) {
        console.error("❌ Errore caricamento eventi:", error);
        throw error;
      }
      
      console.log("📊 Eventi dal DB (grezzi):", data);
      console.log("📊 Numero eventi:", data?.length || 0);

      // Per ogni evento, carica i dati dell'organizzatore
      const eventiConOrganizzatore = await Promise.all(
        (data as any[]).map(async (evento: any) => {
          console.log("👤 Carico profilo per organizzatore:", evento.organizzatore_id);
          
          const { data: profilo } = await supabase
            .from('profiles')
            .select('nome, cognome, avatar_url')
            .eq('user_id', evento.organizzatore_id)
            .single();
          
          const isExternal = !!evento.fonte_esterna;
          return {
            ...evento,
            organizzatore_nome: isExternal ? 'Milano Help' : (profilo ? `${profilo.nome || ''} ${profilo.cognome || ''}`.trim() || 'Utente' : 'Utente'),
            organizzatore_avatar: isExternal ? null : profilo?.avatar_url
          };
        })
      );
      
      console.log("✅ Eventi con organizzatore:", eventiConOrganizzatore);
      return eventiConOrganizzatore;
    },
  });

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo evento?")) return;
    
    try {
      const { error } = await (supabase as any)
        .from('eventi')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['eventi'] });
      
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato rimosso con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'evento.",
        variant: "destructive",
      });
    }
  };

  // Extract unique categories from DB data
  const dbCategories = useMemo(() => {
    const cats = new Set<string>();
    eventiReali.forEach((e) => {
      if (e.categoria) cats.add(e.categoria);
    });
    return Array.from(cats).sort();
  }, [eventiReali]);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = searchQuery.toLowerCase().trim();

    let results = eventiReali.filter((e) => {
      if (showMyEvents && user?.id && e.organizzatore_id !== user.id) return false;
      if (selectedCategory && (e.categoria == null || String(e.categoria).toLowerCase() !== selectedCategory.toLowerCase())) return false;

      // Search filter
      if (q) {
        const inTitle = e.titolo?.toLowerCase().includes(q);
        const inDesc = e.descrizione?.toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }

      // Price filter
      if (priceFilter === "gratuito" && !e.gratuito) return false;
      if (priceFilter === "pagamento" && e.gratuito) return false;

      // Date filter
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

    // Sorting
    if (sortBy === "rilevanza" && q) {
      results.sort((a, b) => {
        const aTitle = a.titolo?.toLowerCase().includes(q) ? 0 : 1;
        const bTitle = b.titolo?.toLowerCase().includes(q) ? 0 : 1;
        return aTitle - bTitle;
      });
    } else {
      results.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    }

    return results;
  }, [eventiReali, showMyEvents, user?.id, selectedCategory, searchQuery, priceFilter, dateFilter, sortBy]);

  const upcomingMy = eventiReali
    .filter((e) => e.organizzatore_id === user?.id)
    .slice(0, 3);

  return (
    <AuthLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Eventi nel tuo quartiere</h1>
            <p className="text-sm text-muted-foreground mt-1">Scopri cosa succede vicino a te</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showMyEvents ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMyEvents(!showMyEvents)}
              className="gap-1.5"
            >
              <Ticket className="w-4 h-4" /> I tuoi eventi
            </Button>
            <Link to="/nuovo-evento">
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Crea evento
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca eventi per titolo o descrizione..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter pills */}
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
            {/* Category dropdown */}
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedCategory || "tutte"}
              onValueChange={(v) => setSelectedCategory(v === "tutte" ? null : v)}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutte">Tutte le categorie</SelectItem>
                {dbCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {getCategoryStyle(c).emoji} {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price filter */}
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Prezzo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i prezzi</SelectItem>
                <SelectItem value="gratuito">🆓 Gratuito</SelectItem>
                <SelectItem value="pagamento">💰 A pagamento</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
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

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} eventi trovati
        </p>

        {/* Main content */}
        <div className="flex gap-6">
          {/* Grid */}
          <div className="flex-1">
            {isLoading ? (
              <Card className="p-8 text-center">
                <p>Caricamento eventi...</p>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nessun evento trovato</p>
                <p className="text-sm text-muted-foreground mt-1">Prova a cambiare i filtri o crea un nuovo evento!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <EventCard 
                      event={event} 
                      isParticipating={event.organizzatore_id === user?.id}
                      onDelete={handleDeleteEvent}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar — desktop only */}
          <div className="hidden lg:block w-72 shrink-0 space-y-4">
            {/* My upcoming */}
            <Card className="p-4 shadow-card">
              <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" /> Prossimi eventi
              </h3>
              {upcomingMy.length === 0 ? (
                <p className="text-xs text-muted-foreground">Non partecipi ancora a nessun evento.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingMy.map((e) => (
                    <div key={e.id} className="flex items-start gap-2.5 group cursor-pointer">
                      <div className="bg-primary/10 rounded-md px-2 py-1 text-center shrink-0">
                        <p className="text-[10px] font-bold text-primary leading-tight">
                          {new Date(e.data).toLocaleDateString("it", { month: "short" }).toUpperCase()}
                        </p>
                        <p className="text-sm font-heading font-bold text-foreground leading-tight">
                          {new Date(e.data).getDate()}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{e.titolo}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.luogo}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Eventi;