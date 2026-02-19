import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, Search, ShoppingBag, Gift, GraduationCap, Heart, 
  Home, Store, Baby, Calendar, MessageCircle, DollarSign,
  Loader2
} from "lucide-react";
import Navbar from "@/components/Navbar";

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
          // Per la categoria evento, conta gli eventi veri
          const { count } = await (supabase as any)
            .from("eventi")
            .select("*", { count: "exact", head: true });
          counts[cat.nome] = count || 0;
        } else {
          // Per le altre categorie, conta gli annunci attivi
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
              Connetti, aiuta e cresci insieme ai tuoi vicini a Milano. 
              Offri servizi, cerca aiuto, vendi e regala — tutto nel tuo quartiere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registrati">
                <Button size="lg" variant="hero" className="gap-2">
                  Unisciti alla community
                </Button>
              </Link>
              <Link to="/come-funziona">
                <Button size="lg" variant="outline">
                  Scopri le sezioni
                </Button>
              </Link>
            </div>
          </motion.div>
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
                    {/* Link condizionale: evento → /eventi, altre categorie → /categoria/nome */}
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
    </div>
  );
};

export default Index;