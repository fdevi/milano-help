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
import { Users, Plus, MapPin, Lock, Globe, Search, UserPlus, Shield } from "lucide-react";
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
  const [joiningGruppoId, setJoiningGruppoId] = useState<string | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [immagine, setImmagine] = useState("");
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

      // Fetch member counts and creator profiles in parallel
      const gruppiWithExtra = await Promise.all(
        (data || []).map(async (gruppo) => {
          const [countResult, creatorResult] = await Promise.all([
            supabase.rpc("count_group_members", { _gruppo_id: gruppo.id }),
            supabase
              .from("profiles")
              .select("nome, cognome")
              .eq("user_id", gruppo.creatore_id)
              .single(),
          ]);
          return {
            ...gruppo,
            membri_count: countResult.data ?? 0,
            creatore_nome: creatorResult.data
              ? `${creatorResult.data.nome || ""} ${creatorResult.data.cognome || ""}`.trim()
              : null,
          };
        })
      );
      return gruppiWithExtra;
    },
  });

  // Current user's memberships (to show Admin badge and Unisciti button)
  const { data: myMemberships = [] } = useQuery({
    queryKey: ["my_gruppi_memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id, stato, ruolo")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });
  const myMembershipByGruppo = Object.fromEntries((myMemberships as any[]).map((m) => [m.gruppo_id, m]));
  const isMemberOf = (gruppoId: string) => myMembershipByGruppo[gruppoId]?.stato === "approvato";
  const isPendingIn = (gruppoId: string) => myMembershipByGruppo[gruppoId]?.stato === "in_attesa";

  // memberCounts and creator info are now embedded in gruppi query

  const createGruppo = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Devi effettuare l'accesso per creare un gruppo.");
      }
      const { data, error } = await supabase
        .from("gruppi")
        .insert({
          nome: nome.trim(),
          descrizione: descrizione?.trim() || null,
          immagine: immagine?.trim() || null,
          tipo,
          categoria: categoria?.trim() || null,
          quartiere: quartiere?.trim() || null,
          creatore_id: user.id,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      // Il creatore diventa automaticamente membro con ruolo admin
      const { error: errMembro } = await supabase.from("gruppi_membri").insert({
        gruppo_id: data.id,
        user_id: user.id,
        ruolo: "admin",
        stato: "approvato",
      } as any);
      if (errMembro) {
        console.error("[createGruppo] Errore inserimento creatore in gruppi_membri:", errMembro);
        throw errMembro;
      }
      console.log("[createGruppo] Gruppo creato e creatore aggiunto come admin, gruppo_id:", data.id);
      return data;
    },
    onSuccess: (data) => {
      setShowCreate(false);
      setNome(""); setDescrizione(""); setImmagine(""); setTipo("pubblico"); setCategoria(""); setQuartiere("");
      queryClient.invalidateQueries({ queryKey: ["gruppi"] });
      queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["gruppo_membri", data.id] });
      queryClient.invalidateQueries({ queryKey: ["gruppo", data.id] });
      toast({ title: "Gruppo creato! Sei stato aggiunto come amministratore." });
      navigate(`/gruppo/${data.id}`);
    },
    onError: (err: any) => {
      console.error("Errore creazione gruppo:", err);
      toast({ title: "Errore", description: err?.message || "Impossibile creare il gruppo.", variant: "destructive" });
    },
  });

  const uniscitiAlGruppo = useMutation({
    mutationFn: async ({ gruppoId, tipo }: { gruppoId: string; tipo: string }) => {
      if (!user) {
        const msg = "Devi effettuare l'accesso per unirti a un gruppo.";
        console.error("[uniscitiAlGruppo] Utente non loggato");
        throw new Error(msg);
      }
      const stato = tipo === "privato" ? "in_attesa" : "approvato";
      const payload = {
        gruppo_id: gruppoId,
        user_id: user.id,
        ruolo: "membro",
        stato,
      };
      console.log("[uniscitiAlGruppo] Insert gruppi_membri:", payload);
      const { data, error } = await supabase
        .from("gruppi_membri")
        .insert(payload as any)
        .select("id")
        .single();
      if (error) {
        console.error("[uniscitiAlGruppo] Errore Supabase:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      console.log("[uniscitiAlGruppo] Inserimento riuscito, id:", data?.id);
      return data;
    },
    onMutate: ({ gruppoId }) => {
      setJoiningGruppoId(gruppoId);
    },
    onSuccess: (_data, { tipo }) => {
      setJoiningGruppoId(null);
      queryClient.invalidateQueries({ queryKey: ["my_gruppi_memberships"] });
      queryClient.invalidateQueries({ queryKey: ["gruppi_member_counts"] });
      queryClient.invalidateQueries({ queryKey: ["gruppi"] });
      toast({
        title: tipo === "privato" ? "Richiesta inviata!" : "Ti sei unito al gruppo!",
        description: tipo === "privato" ? "Attendi l'approvazione di un amministratore." : undefined,
      });
    },
    onError: (err: any) => {
      setJoiningGruppoId(null);
      const message = err?.message || "Impossibile unirsi al gruppo.";
      const code = err?.code;
      const isDuplicate = code === "23505";
      const friendlyMessage = isDuplicate
        ? "Sei già membro o hai già inviato una richiesta per questo gruppo."
        : message;
      console.error("[uniscitiAlGruppo] onError:", { message, code, err });
      toast({
        title: "Errore",
        description: friendlyMessage,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setJoiningGruppoId(null);
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
          {user ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crea gruppo
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/login">Accedi per creare un gruppo</Link>
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
              <Card key={g.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                <Link to={`/gruppo/${g.id}`} className="block flex-1">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">{g.nome}</CardTitle>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {user?.id === g.creatore_id && (
                          <Badge variant="default" className="gap-1 text-xs">
                            <Shield className="w-3 h-3" /> Admin
                          </Badge>
                        )}
                        {g.tipo === "privato" ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                      </div>
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
                        <Users className="w-3 h-3" /> {g.membri_count ?? 0}
                      </Badge>
                    </div>
                    {g.creatore_nome && (
                      <p className="text-xs text-muted-foreground mt-2">Creato da {g.creatore_nome}</p>
                    )}
                  </CardContent>
                </Link>
                {user && !isMemberOf(g.id) && !isPendingIn(g.id) && (
                  <div className="px-6 pb-4 pt-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        uniscitiAlGruppo.mutate({ gruppoId: g.id, tipo: g.tipo ?? "pubblico" });
                      }}
                      disabled={uniscitiAlGruppo.isPending && joiningGruppoId === g.id}
                    >
                      {joiningGruppoId === g.id ? (
                        <>Unisco...</>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" /> Unisciti
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>
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
            <Textarea placeholder="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} rows={3} />
            <Input placeholder="URL immagine (opzionale)" value={immagine} onChange={(e) => setImmagine(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pubblico">Pubblico</SelectItem>
                  <SelectItem value="privato">Privato</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoria || "_nessuna"} onValueChange={(v) => setCategoria(v === "_nessuna" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_nessuna">Nessuna</SelectItem>
                  {CATEGORIE_GRUPPI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={quartiere || "_nessuno"} onValueChange={(v) => setQuartiere(v === "_nessuno" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Quartiere (opzionale)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_nessuno">Nessuno</SelectItem>
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
