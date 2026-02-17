import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuartieri } from "@/hooks/useQuartieri";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, MapPin, Lock, Globe, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIE_GRUPPI = ["Generale", "Sport", "Cultura", "Volontariato", "Genitori", "Animali", "Cibo", "Altro"];

const Gruppi = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { quartieri } = useQuartieri();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("tutti");
  const [filterQuartiere, setFilterQuartiere] = useState("tutti");
  const [filterTipo, setFilterTipo] = useState("tutti");

  // Form state
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [tipo, setTipo] = useState("pubblico");
  const [categoria, setCategoria] = useState("");
  const [quartiere, setQuartiere] = useState("");

  const { data: gruppi = [], isLoading } = useQuery({
    queryKey: ["gruppi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gruppi")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch member counts
  const { data: memberCounts = {} } = useQuery({
    queryKey: ["gruppi_member_counts", gruppi.map((g: any) => g.id).join(",")],
    queryFn: async () => {
      if (gruppi.length === 0) return {};
      const { data } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id")
        .eq("stato", "approvato")
        .in("gruppo_id", gruppi.map((g: any) => g.id));
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => { counts[m.gruppo_id] = (counts[m.gruppo_id] || 0) + 1; });
      return counts;
    },
    enabled: gruppi.length > 0,
  });

  const createGruppo = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("gruppi")
        .insert({
          nome,
          descrizione: descrizione || null,
          tipo,
          categoria: categoria || null,
          quartiere: quartiere || null,
          creatore_id: user!.id,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      // Auto-join as admin
      await supabase.from("gruppi_membri").insert({
        gruppo_id: data.id,
        user_id: user!.id,
        ruolo: "admin",
        stato: "approvato",
      } as any);
      return data;
    },
    onSuccess: (data) => {
      setShowCreate(false);
      setNome(""); setDescrizione(""); setTipo("pubblico"); setCategoria(""); setQuartiere("");
      queryClient.invalidateQueries({ queryKey: ["gruppi"] });
      toast({ title: "Gruppo creato!" });
      navigate(`/gruppo/${data.id}`);
    },
    onError: (err: any) => {
      console.error("Errore creazione gruppo:", err);
      toast({ title: "Errore", description: err?.message || "Impossibile creare il gruppo.", variant: "destructive" });
    },
  });

  const filtered = gruppi.filter((g: any) => {
    if (search && !g.nome.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== "tutti" && g.categoria !== filterCat) return false;
    if (filterQuartiere !== "tutti" && g.quartiere !== filterQuartiere) return false;
    if (filterTipo !== "tutti" && g.tipo !== filterTipo) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Gruppi di discussione</h1>
          {user && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crea gruppo
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cerca gruppo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutte</SelectItem>
              {CATEGORIE_GRUPPI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterQuartiere} onValueChange={setFilterQuartiere}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Quartiere" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              {quartieri.map((q) => <SelectItem key={q.nome} value={q.nome}>{q.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="pubblico">Pubblico</SelectItem>
              <SelectItem value="privato">Privato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Nessun gruppo trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((g: any) => (
              <Link key={g.id} to={`/gruppo/${g.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg line-clamp-1">{g.nome}</CardTitle>
                      {g.tipo === "privato" ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {g.descrizione && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{g.descrizione}</p>}
                    <div className="flex flex-wrap gap-2">
                      {g.categoria && <Badge variant="secondary">{g.categoria}</Badge>}
                      {g.quartiere && (
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="w-3 h-3" /> {g.quartiere}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" /> {(memberCounts as any)[g.id] || 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea un nuovo gruppo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome del gruppo *" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Textarea placeholder="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pubblico">Pubblico</SelectItem>
                  <SelectItem value="privato">Privato</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIE_GRUPPI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={quartiere} onValueChange={setQuartiere}>
              <SelectTrigger><SelectValue placeholder="Quartiere (opzionale)" /></SelectTrigger>
              <SelectContent>
                {quartieri.map((q) => <SelectItem key={q.nome} value={q.nome}>{q.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
            <Button onClick={() => createGruppo.mutate()} disabled={!nome.trim() || createGruppo.isPending}>
              {createGruppo.isPending ? "Creazione..." : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Gruppi;
