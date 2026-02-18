import { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, MapPin, Users, Plus, Filter, Clock,
  ImageIcon, Ticket, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AuthLayout from "@/components/AuthLayout";
import { Link } from "react-router-dom";

// ── Mock data ──
const MOCK_EVENTS = [
  {
    id: "1",
    titolo: "Aperitivo di Quartiere",
    descrizione: "Un aperitivo informale per conoscere i vicini del quartiere Isola. Portate buon umore!",
    data: "2026-02-21T18:30:00",
    luogo: "Bar Rattazzo, Via Borsieri 32",
    quartiere: "Isola",
    immagine: null,
    organizzatore: { nome: "Marco R.", avatar: null },
    partecipanti: 24,
    gratuito: true,
    prezzo: null,
    categoria: "Social",
  },
  {
    id: "2",
    titolo: "Corso di Giardinaggio Urbano",
    descrizione: "Impara a creare il tuo orto sul balcone con i consigli di esperti del verde.",
    data: "2026-02-22T10:00:00",
    luogo: "Giardini Pubblici di Porta Venezia",
    quartiere: "Porta Venezia",
    immagine: null,
    organizzatore: { nome: "Laura B.", avatar: null },
    partecipanti: 15,
    gratuito: false,
    prezzo: 10,
    categoria: "Workshop",
  },
  {
    id: "3",
    titolo: "Mercatino del Riuso",
    descrizione: "Vendi e scambia oggetti usati. Sostenibilità e risparmio per tutti!",
    data: "2026-02-23T09:00:00",
    luogo: "Piazza Wagner",
    quartiere: "Wagner",
    immagine: null,
    organizzatore: { nome: "Associazione EcoMilano", avatar: null },
    partecipanti: 89,
    gratuito: true,
    prezzo: null,
    categoria: "Mercatino",
  },
  {
    id: "4",
    titolo: "Yoga al Parco",
    descrizione: "Sessione di yoga all'aperto per tutti i livelli. Porta il tuo tappetino!",
    data: "2026-02-24T07:30:00",
    luogo: "Parco Sempione, ingresso Arco della Pace",
    quartiere: "Sempione",
    immagine: null,
    organizzatore: { nome: "Giulia T.", avatar: null },
    partecipanti: 32,
    gratuito: true,
    prezzo: null,
    categoria: "Sport",
  },
  {
    id: "5",
    titolo: "Cineforum di Quartiere",
    descrizione: "Proiezione del film 'La Grande Bellezza' seguita da dibattito aperto.",
    data: "2026-02-25T20:30:00",
    luogo: "Centro Culturale, Via Padova 36",
    quartiere: "NoLo",
    immagine: null,
    organizzatore: { nome: "Davide M.", avatar: null },
    partecipanti: 18,
    gratuito: true,
    prezzo: null,
    categoria: "Cultura",
  },
  {
    id: "6",
    titolo: "Pulizia del Naviglio",
    descrizione: "Giornata di volontariato per pulire le sponde del Naviglio Grande.",
    data: "2026-02-28T09:00:00",
    luogo: "Alzaia Naviglio Grande, Darsena",
    quartiere: "Navigli",
    immagine: null,
    organizzatore: { nome: "Milano Pulita", avatar: null },
    partecipanti: 45,
    gratuito: true,
    prezzo: null,
    categoria: "Volontariato",
  },
];

const MY_EVENTS_IDS = ["1", "4"];

const DATE_FILTERS = [
  { label: "Tutti", value: "tutti" },
  { label: "Oggi", value: "oggi" },
  { label: "Weekend", value: "weekend" },
  { label: "Settimana", value: "settimana" },
  { label: "Mese", value: "mese" },
];

const CATEGORIES = ["Social", "Workshop", "Mercatino", "Sport", "Cultura", "Volontariato"];

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

const EventCard = ({ event, isParticipating }: { event: typeof MOCK_EVENTS[0]; isParticipating: boolean }) => {
  const orgInitials = event.organizzatore.nome.split(" ").map((w) => w[0]).join("").toUpperCase();

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow group cursor-pointer">
      {/* Cover */}
      <div className="relative h-40 bg-muted">
        {event.immagine ? (
          <img src={event.immagine} alt={event.titolo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-primary/5">
            <CalendarDays className="w-12 h-12 text-primary/30" />
          </div>
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
            <span>{formatEventDate(event.data)}</span>
          </div>
          <h3 className="font-heading font-bold text-foreground group-hover:text-primary transition-colors">{event.titolo}</h3>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{event.descrizione}</p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{event.luogo}</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={event.organizzatore.avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{orgInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{event.organizzatore.nome}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {event.partecipanti}
          </span>
        </div>
      </div>
    </Card>
  );
};

const Eventi = () => {
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [dateFilter, setDateFilter] = useState("tutti");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = MOCK_EVENTS.filter((e) => {
    if (showMyEvents && !MY_EVENTS_IDS.includes(e.id)) return false;
    if (selectedCategory && e.categoria !== selectedCategory) return false;
    return true;
  });

  const upcomingMy = MOCK_EVENTS.filter((e) => MY_EVENTS_IDS.includes(e.id)).slice(0, 3);

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

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Date filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
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
          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setSelectedCategory(null)}
            >
              Tutte
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                variant={selectedCategory === c ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full"
                onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex gap-6">
          {/* Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
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
                    <EventCard event={event} isParticipating={MY_EVENTS_IDS.includes(event.id)} />
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

            {/* Suggested */}
            <Card className="p-4 shadow-card">
              <h3 className="font-heading font-bold text-sm text-foreground mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-secondary" /> Suggeriti per te
              </h3>
              <div className="space-y-3">
                {MOCK_EVENTS.filter((e) => !MY_EVENTS_IDS.includes(e.id)).slice(0, 3).map((e) => (
                  <div key={e.id} className="flex items-start gap-2.5 group cursor-pointer">
                    <div className="bg-secondary/10 rounded-md px-2 py-1 text-center shrink-0">
                      <p className="text-[10px] font-bold text-secondary leading-tight">
                        {new Date(e.data).toLocaleDateString("it", { month: "short" }).toUpperCase()}
                      </p>
                      <p className="text-sm font-heading font-bold text-foreground leading-tight">
                        {new Date(e.data).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{e.titolo}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {e.partecipanti} partecipanti
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Eventi;
