import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, Search, ShoppingBag, Gift, GraduationCap, Heart, 
  Home, Store, Baby, Calendar, MessageCircle, DollarSign,
  Loader2, ArrowRight, MapPin, Users, Shield, Award, Building2, Sprout, Briefcase
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Mappa delle icone per ogni categoria
const iconMap: Record<string, any> = {
  offro_servizio: Wrench,
  cerco: Search,
  in_vendita: ShoppingBag,
  regalo: Gift,
  studenti_e_insegnanti: GraduationCap,
  aiuto_anziani: Heart,
  immobili: Home,
  negozi_di_quartiere: Store,
  bambini: Baby,
  evento: Calendar,
  chat: MessageCircle,
  donazioni: DollarSign,
};

// Descrizioni per ogni categoria
const categoryDescriptions: Record<string, string> = {
  offro_servizio: "Trova professionisti e servizi nel tuo quartiere",
  cerco: "Chiedi aiuto o cerca qualcosa di specifico",
  in_vendita: "Compra e vendi oggetti nuovi e usati",
  regalo: "Offri o ricevi oggetti gratuitamente",
  studenti_e_insegnanti: "Lezioni, ripetizioni e aiuto compiti",
  aiuto_anziani: "Supporto e compagnia per anziani",
  immobili: "Case in vendita e affitto vicino a te",
  negozi_di_quartiere: "Scopri i negozi e le attività locali",
  bambini: "Servizi per bambini e famiglie",
  evento: "Eventi e iniziative di quartiere",
  chat: "Discussioni e conversazioni tra vicini",
  donazioni: "Sostieni cause e raccolte fondi locali",
};

// Statistiche per la sezione "Come funziona"
const stats = [
  { number: "50.000+", label: "Utenti attivi", icon: Users },
  { number: "12", label: "Categorie", icon: Search },
  { number: "200+", label: "Quartieri", icon: MapPin },
  { number: "98%", label: "Recensioni positive", icon: Heart },
];

// Aree coperte
const areas = [
  {
    name: "Milano città",
    description: "Tutti i quartieri di Milano, dal centro alla periferia",
    icon: Building2,
    zones: [
      "Duomo, Brera, Navigli, Isola, Porta Venezia",
      "Bicocca, Niguarda, Bovisa, QT8, San Siro",
      "Loreto, Città Studi, NoLo, Precotto, Gorla"
    ]
  },
  {
    name: "Hinterland milanese",
    description: "Comuni della cintura urbana di Milano",
    icon: Sprout,
    zones: [
      "Sesto San Giovanni, Cinisello Balsamo, Cologno Monzese",
      "Rho, Pero, Novate Milanese, Cormano",
      "Rozzano, Corsico, Assago, Buccinasco"
    ]
  },
  {
    name: "Monza e Brianza",
    description: "La provincia di Monza e della Brianza",
    icon: Award,
    zones: [
      "Monza, Lissone, Seregno, Desio",
      "Brugherio, Vimercate, Arcore, Villasanta",
      "Cesano Maderno, Limbiate, Meda"
    ]
  },
  {
    name: "Altri comuni",
    description: "Tutta la provincia di Milano",
    icon: Briefcase,
    zones: [
      "Legnano, Busto Garolfo, Magenta, Abbiategrasso",
      "Garbagnate Milanese, Bollate, Paderno Dugnano",
      "Pieve Emanuele, San Donato, San Giuliano"
    ]
  }
];

const Index = () => {
  const [categorie, setCategorie] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [annunciCount, setAnnunciCount] = useState<Record<string, number>>({});

  // Carica le categorie
  useEffect(() => {
    supabase
      .from("categorie_annunci")
      .select("id, nome, label, icona, ordine")
      .order("ordine")
      .then(({ data }) => {
        setCategorie(data || []);
        setLoading(false);
      });
  }, []);

  // Carica il conteggio degli annunci/eventi per ogni categoria
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const cat of categorie) {
        if (cat.nome === 'evento') {
          const { count } = await supabase
            .from("eventi")
            .select("*", { count: "exact", head: true });
          counts[cat.nome] = count || 0;
        } else {
          const { count } = await supabase
            .from("annunci")
            .select("*", { count: "exact", head: true })
            .eq("categoria_id", cat.id)
            .eq("stato", "attivo");
          counts[cat.nome] = count || 0;
        }
      }
      
      setAnnunciCount(counts);
    };

    if (categorie.length > 0) {
      fetchCounts();
    }
  }, [categorie]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-4">
              La tua community
              <span className="text-primary block">di quartiere</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connetti, aiuta e cresci insieme ai tuoi vicini a Milano, provincia e Monza Brianza. 
              Offri servizi, cerca aiuto, vendi e regala — tutto nel tuo quartiere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registrati">
                <Button size="lg" variant="hero" className="gap-2">
                  Unisciti alla community
                </Button>
              </Link>
              <Link to="/sezioni">
                <Button size="lg" variant="outline">
                  Esplora le sezioni
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-2">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
              Esplora le Sezioni
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tutto quello di cui hai bisogno nel tuo quartiere, a portata di mano.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {categorie.map((cat, index) => {
                const Icon = iconMap[cat.nome] || Search;
                const descrizione = categoryDescriptions[cat.nome] || "Esplora gli annunci di questa sezione";
                const annunciTotali = annunciCount[cat.nome] || 0;
                
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {cat.nome === 'evento' ? (
                      <Link to="/eventi">
                        <Card className="p-5 hover:shadow-lg transition-all group hover:-translate-y-1 cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-heading font-bold text-foreground truncate">
                                  {cat.label}
                                </h3>
                                <Badge variant="secondary" className="ml-2 shrink-0">
                                  {annunciTotali}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {descrizione}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ) : (
                      <Link to={`/categoria/${cat.nome}`}>
                        <Card className="p-5 hover:shadow-lg transition-all group hover:-translate-y-1 cursor-pointer">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform">
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-heading font-bold text-foreground truncate">
                                  {cat.label}
                                </h3>
                                <Badge variant="secondary" className="ml-2 shrink-0">
                                  {annunciTotali}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {descrizione}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Aree coperte */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
              Milano, provincia e Monza Brianza
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              La community è attiva in oltre 200 quartieri e comuni del territorio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {areas.map((area, index) => {
              const Icon = area.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full shadow-card hover:shadow-card-hover transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-lg mb-1">{area.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{area.description}</p>
                        <ul className="space-y-1">
                          {area.zones.map((zone, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{zone}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              Unisciti alla community del tuo quartiere
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Migliaia di persone si sono già connesse con i loro vicini. 
              Inizia anche tu a scoprire cosa succede nel tuo quartiere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registrati">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 gap-2">
                  Registrati gratis <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/sezioni">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
                  Esplora le sezioni
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;