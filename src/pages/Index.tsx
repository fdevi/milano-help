import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Users, MapPin, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import CategoryCard, { CATEGORY_COLORS } from "@/components/CategoryCard";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const steps = [
  { icon: Users, title: "Registrati", description: "Crea il tuo profilo in pochi minuti" },
  { icon: MapPin, title: "Trova il quartiere", description: "Localizza la tua zona di Milano" },
  { icon: Shield, title: "Inizia subito", description: "Pubblica annunci e connettiti con i vicini" },
];

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: categorie = [], isLoading: loading } = useQuery({
    queryKey: ["categorie_annunci_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("id, icona, label, nome, ordine")
        .order("ordine");
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const handleCategoryClick = (_cat: { nome: string; label: string }) => {
    // Navigation handled by Link wrapper
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Milano community" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-heading font-extrabold text-4xl md:text-6xl lg:text-7xl text-background mb-6 leading-tight">
              La tua community<br />
              <span className="text-secondary">di quartiere</span>
            </h1>
            <p className="text-lg md:text-xl text-background/80 max-w-2xl mx-auto mb-10">
              Connetti, aiuta e cresci insieme ai tuoi vicini a Milano. Offri servizi, cerca aiuto, vendi e regala — tutto nel tuo quartiere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registrati">
                <Button variant="hero" size="lg" className="text-base px-8 py-6">
                  Unisciti alla community <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <a href="#categorie">
                <Button variant="outline" size="lg" className="text-base px-8 py-6 bg-background/10 border-background/30 text-background hover:bg-background/20">
                  Scopri le sezioni
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section id="categorie" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-heading font-extrabold text-3xl md:text-4xl text-foreground mb-4">
              Esplora le <span className="text-gradient-primary">Sezioni</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tutto quello di cui hai bisogno nel tuo quartiere, a portata di mano.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-6 border">
                    <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                    <Skeleton className="h-5 w-2/3 mb-2" />
                  </div>
                ))
              : categorie.length === 0
              ? <p className="col-span-full text-center text-muted-foreground">Nessuna categoria disponibile.</p>
              : categorie.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    iconName={cat.icona}
                    title={cat.label}
                    color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    delay={i * 0.05}
                    onClick={() => navigate(`/categoria/${cat.nome}`)}
                  />
                ))
            }
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="come-funziona" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="font-heading font-extrabold text-3xl md:text-4xl text-foreground mb-4">
              Come <span className="text-gradient-warm">Funziona</span>
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="font-heading font-bold text-sm text-primary mb-2">Passo {i + 1}</div>
                <h3 className="font-heading font-bold text-xl text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading font-extrabold text-3xl md:text-4xl text-primary-foreground mb-4">
              Entra nel tuo quartiere
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Unisciti a migliaia di milanesi che si aiutano ogni giorno.
            </p>
            <Link to="/registrati">
              <Button variant="warm" size="lg" className="text-base px-10 py-6">
                Registrati Gratis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
