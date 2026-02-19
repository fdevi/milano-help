import { motion } from "framer-motion";
import { 
  MapPin, Heart, Users, Shield, MessageCircle, Calendar,
  Search, Award, Globe, Sparkles, ArrowRight, CheckCircle,
  Building2, Sprout, GraduationCap, Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const HowItWorks = () => {
  const stats = [
    { number: "50.000+", label: "Utenti attivi", icon: Users },
    { number: "12", label: "Categorie", icon: Search },
    { number: "200+", label: "Quartieri", icon: MapPin },
    { number: "98%", label: "Recensioni positive", icon: Heart },
  ];

  const steps = [
    {
      icon: Users,
      title: "Registrati gratis",
      description: "Crea il tuo account in pochi secondi. Puoi registrarti con email, Google o Apple.",
      color: "bg-blue-500"
    },
    {
      icon: Search,
      title: "Esplora le sezioni",
      description: "Sfoglia le categorie che ti interessano: Offro servizio, Cerco, In vendita, Eventi e molte altre.",
      color: "bg-green-500"
    },
    {
      icon: Heart,
      title: "Pubblica o rispondi",
      description: "Crea il tuo annuncio o contatta chi ha pubblicato qualcosa che ti interessa.",
      color: "bg-purple-500"
    },
    {
      icon: MessageCircle,
      title: "Chatta in tempo reale",
      description: "Comunica direttamente con gli altri utenti tramite la chat integrata.",
      color: "bg-amber-500"
    }
  ];

  const features = [
    {
      icon: MapPin,
      title: "Quartieri e zone",
      description: "Ogni annuncio è geolocalizzato nel quartiere di appartenenza. Trova persone e servizi vicino a te."
    },
    {
      icon: Shield,
      title: "Moderazione attiva",
      description: "Tutti gli annunci vengono moderati prima della pubblicazione per garantire un ambiente sicuro."
    },
    {
      icon: Calendar,
      title: "Eventi locali",
      description: "Scopri e partecipa a eventi nel tuo quartiere o crea i tuoi."
    },
    {
      icon: Award,
      title: "Affidabilità",
      description: "Sistema di recensioni e like per valutare l'affidabilità degli utenti."
    }
  ];

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
      icon: GraduationCap,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto max-w-5xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Badge className="mb-4 px-3 py-1 text-sm bg-primary/10 text-primary border-none">
              Milano Help
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-foreground mb-6">
              Come funziona la community
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Milano Help non è solo un'app, è una comunità di vicini che si aiutano. 
              <span className="block mt-2 font-semibold text-primary">
                Milano, provincia e Monza Brianza • Oltre 200 quartieri e comuni
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/registrati">
                <Button size="lg" variant="hero" className="gap-2">
                  Inizia gratuitamente <ArrowRight className="w-4 h-4" />
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

      {/* Steps Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
              In 4 semplici passi
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Entrare a far parte della community è semplice e veloce
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 text-center h-full shadow-card hover:shadow-card-hover transition-shadow">
                    <div className={`w-16 h-16 rounded-full ${step.color} bg-opacity-10 flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${step.color.replace('bg-', 'text-')}`} />
                    </div>
                    <h3 className="font-heading font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Areas Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <Badge className="mb-4 px-3 py-1 bg-primary/10 text-primary border-none">
              Dove siamo
            </Badge>
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
                              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
              Perché scegliere Milano Help
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Una piattaforma pensata per valorizzare le relazioni di vicinato
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 flex items-start gap-4 shadow-card hover:shadow-card-hover transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary text-white">
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

export default HowItWorks;