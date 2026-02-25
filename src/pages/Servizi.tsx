import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Briefcase, ImageIcon, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AuthLayout from "@/components/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const Servizi = () => {
  const { user } = useAuth();
  const [filterCat, setFilterCat] = useState("");
  const [filterQuartiere, setFilterQuartiere] = useState("");

  const { data: categorie } = useQuery({
    queryKey: ["categorie-servizi"],
    queryFn: async () => {
      const { data } = await supabase.from("categorie").select("id, nome").eq("attiva", true).order("ordine");
      return data || [];
    },
  });

  const { data: servizi, isLoading } = useQuery({
    queryKey: ["servizi-pubblici", filterCat, filterQuartiere],
    queryFn: async () => {
      let q = supabase
        .from("servizi")
        .select("id, titolo, descrizione, stato, created_at, categoria_id, operatore_id, quartiere, prezzo, immagini")
        .eq("stato", "attivo")
        .order("created_at", { ascending: false });
      if (filterCat) q = q.eq("categoria_id", filterCat);
      if (filterQuartiere) q = q.eq("quartiere", filterQuartiere);
      const { data } = await q;
      if (!data || data.length === 0) return [];

      const opIds = [...new Set(data.map((s) => s.operatore_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, nome, cognome, quartiere").in("user_id", opIds);
      const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const catIds = [...new Set(data.map((s) => s.categoria_id).filter(Boolean))] as string[];
      const { data: cats } = catIds.length > 0 ? await supabase.from("categorie").select("id, nome").in("id", catIds) : { data: [] };
      const catMap = new Map((cats || []).map((c) => [c.id, c.nome]));

      return data.map((s) => ({
        ...s,
        operatore_nome: profMap.get(s.operatore_id)?.nome || "Utente",
        operatore_cognome: profMap.get(s.operatore_id)?.cognome || "",
        categoria_nome: s.categoria_id ? catMap.get(s.categoria_id) || null : null,
      }));
    },
    enabled: !!user,
  });

  // Get unique quartieri from servizi for filter
  const quartieriList = [...new Set((servizi || []).map((s) => s.quartiere).filter(Boolean))] as string[];

  return (
    <AuthLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold text-foreground">Servizi</h1>
          <Button asChild>
            <Link to="/nuovo-servizio" className="gap-2">
              <Plus className="w-4 h-4" /> Offri un servizio
            </Link>
          </Button>
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {(categorie || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterQuartiere} onValueChange={(v) => setFilterQuartiere(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Quartiere" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i quartieri</SelectItem>
              {quartieriList.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /></div>
              </Card>
            ))}
          </div>
        ) : (servizi || []).length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nessun servizio disponibile</p>
            <Button variant="default" size="sm" className="mt-4" asChild>
              <Link to="/nuovo-servizio">Offri un servizio</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(servizi || []).map((s, i) => {
              const coverImage = s.immagini && s.immagini.length > 0 ? s.immagini[0] : null;
              const timeAgo = formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: it });
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <Link to={`/servizio/${s.id}`}>
                    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5 cursor-pointer h-full flex flex-col">
                      <div className="relative aspect-[4/3] bg-muted">
                        {coverImage ? (
                          <img src={coverImage} alt={s.titolo} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Briefcase className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                        )}
                        {s.categoria_nome && (
                          <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px]">{s.categoria_nome}</Badge>
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-1.5">
                        <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2 leading-tight">{s.titolo}</h3>
                        {s.prezzo != null && s.prezzo > 0 && (
                          <span className="font-heading font-bold text-primary text-base">€{Number(s.prezzo).toFixed(2)}</span>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{s.descrizione}</p>
                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span className="truncate">{s.operatore_nome} {s.operatore_cognome}</span>
                          {s.quartiere && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />{s.quartiere}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default Servizi;
