import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Wrench, Search, ShoppingBag, Gift, GraduationCap, HeartHandshake,
  Building2, Store, Baby, CalendarDays, MessageCircle, HandCoins,
  Plus, Bell, User, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const categories = [
  { icon: Wrench, title: "Offro Servizio", color: "#1a9068", count: 24 },
  { icon: Search, title: "Cerco", color: "#3b82f6", count: 18 },
  { icon: ShoppingBag, title: "In Vendita", color: "#8b5cf6", count: 42 },
  { icon: Gift, title: "Regalo", color: "#ec4899", count: 12 },
  { icon: GraduationCap, title: "Studenti e Insegnanti", color: "#f59e0b", count: 8 },
  { icon: HeartHandshake, title: "Aiuto Anziani", color: "#ef4444", count: 15 },
  { icon: Building2, title: "Immobili", color: "#06b6d4", count: 31 },
  { icon: Store, title: "Negozi di Quartiere", color: "#84cc16", count: 19 },
  { icon: Baby, title: "Bambini", color: "#f97316", count: 7 },
  { icon: CalendarDays, title: "Eventi", color: "#6366f1", count: 5 },
  { icon: MessageCircle, title: "Chat", color: "#14b8a6", count: 3 },
  { icon: HandCoins, title: "Donazioni", color: "#e11d48", count: 0 },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-extrabold text-lg text-foreground">
              MILANO <span className="text-gradient-primary">HELP</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
            </button>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <User className="w-5 h-5 text-muted-foreground" />
            </button>
            <Link to="/">
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-4">
        <div className="container mx-auto">
          {/* Welcome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-heading font-extrabold text-2xl md:text-3xl text-foreground mb-2">
              Ciao, benvenuto! 👋
            </h1>
            <p className="text-muted-foreground">Quartiere: <span className="font-semibold text-foreground">Navigli</span></p>
          </motion.div>

          {/* Quick action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Button variant="hero" size="lg" className="gap-2">
              <Plus className="w-5 h-5" /> Pubblica un annuncio
            </Button>
          </motion.div>

          {/* Categories grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ y: -2 }}
                className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer border group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: cat.color + "18", color: cat.color }}
                >
                  <cat.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground mb-1">{cat.title}</h3>
                <p className="text-xs text-muted-foreground">{cat.count} annunci</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
