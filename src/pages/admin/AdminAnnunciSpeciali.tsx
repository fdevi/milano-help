import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, Trash2, Eye, Building2, Store, Pencil, Heart } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "react-router-dom";

const AdminAnnunciSpeciali = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterTipo, setFilterTipo] = useState("tutti");
  const [filterStato, setFilterStato] = useState("tutti");
  const [search, setSearch] = useState("");
  const [rifiutaId, setRifiutaId] = useState<string | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState("");

  const { data: annunci = [], isLoading } = useQuery({
    queryKey: ["admin_annunci_speciali"],
    queryFn: async () => {
      const { data: cats } = await supabase
        .from("categorie_annunci")
        .select("id, nome, label")
        .in("nome", ["Professionisti", "negozi_di_quartiere"]);

      if (!cats || cats.length === 0) return [];
      const catIds = cats.map((c) => c.id);
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c]));

      const { data, error } = await supabase
        .from("annunci")
        .select("id, titolo, stato, created_at, user_id, categoria_id, quartiere, immagini, mi_piace, visualizzazioni")
        .in("categoria_id", catIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (a: any) => {
          const { data: profilo } = await supabase
            .from("profiles")
            .select("nome, cognome, nome_attivita, email, username")
            .eq("user_id", a.user_id)
            .single();
          return {
            ...a,
            categoria: catMap[a.categoria_id],
            profilo,
          };
        })
      );
      return enriched;
    },
  });

  const filtered = annunci.filter((a: any) => {
    if (filterTipo !== "tutti") {
      if (filterTipo === "professionisti" && a.categoria?.nome !== "Professionisti") return false;
      if (filterTipo === "negozianti" && a.categoria?.nome !== "negozi_di_quartiere") return false;
    }
    if (filterStato !== "tutti" && a.stato !== filterStato) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.titolo?.toLowerCase().includes(q) && !a.profilo?.nome_attivita?.toLowerCase().includes(q) && !a.profilo?.email?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleApprova = async (id: string) => {
    await supabase.from("annunci").update({ stato: "attivo", moderato_da: user?.id, moderato_il: new Date().toISOString() } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_annunci_speciali"] });
    toast({ title: "Annuncio approvato" });
  };

  const handleRifiuta = async () => {
    if (!rifiutaId) return;
    await supabase.from("annunci").update({ stato: "rifiutato", moderato_da: user?.id, moderato_il: new Date().toISOString(), motivo_rifiuto: motivoRifiuto || null } as any).eq("id", rifiutaId);
    queryClient.invalidateQueries({ queryKey: ["admin_annunci_speciali"] });
    setRifiutaId(null);
    setMotivoRifiuto("");
    toast({ title: "Annuncio rifiutato" });
  };

  const handleElimina = async (id: string) => {
    await supabase.from("annunci").update({ stato: "eliminato", moderato_da: user?.id } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin_annunci_speciali"] });
    toast({ title: "Annuncio eliminato" });
  };

  const statoBadge = (stato: string) => {
    switch (stato) {
      case "attivo": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Attivo</Badge>;
      case "in_moderazione": return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">In moderazione</Badge>;
      case "rifiutato": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rifiutato</Badge>;
      case "eliminato": return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Eliminato</Badge>;
      default: return <Badge variant="outline">{stato}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Annunci Speciali</h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cerca per titolo, attività o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i tipi</SelectItem>
            <SelectItem value="professionisti">Professionisti</SelectItem>
            <SelectItem value="negozianti">Negozianti</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="in_moderazione">In moderazione</SelectItem>
            <SelectItem value="attivo">Attivo</SelectItem>
            <SelectItem value="rifiutato">Rifiutato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nessun annuncio speciale trovato.</p>
      ) : (
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Titolo / Attività</th>
                <th className="text-left p-3 font-medium">Autore</th>
                <th className="text-left p-3 font-medium">Stato</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-center p-3 font-medium">👁️</th>
                <th className="text-center p-3 font-medium">❤️</th>
                <th className="text-right p-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a: any) => {
                const days = differenceInDays(new Date(), new Date(a.created_at));
                return (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      {a.categoria?.nome === "Professionisti" ? (
                        <span className="flex items-center gap-1.5 text-blue-600"><Building2 className="w-4 h-4" /> Prof.</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-600"><Store className="w-4 h-4" /> Negozio</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{a.titolo}</div>
                      {a.profilo?.nome_attivita && <div className="text-xs text-muted-foreground">{a.profilo.nome_attivita}</div>}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{a.profilo?.nome || a.profilo?.username || "—"} {a.profilo?.cognome || ""}</div>
                      <div className="text-xs text-muted-foreground">{a.profilo?.email || "—"}</div>
                    </td>
                    <td className="p-3">{statoBadge(a.stato)}</td>
                    <td className="p-3 text-muted-foreground">
                      <div>{format(new Date(a.created_at), "dd/MM/yyyy", { locale: it })}</div>
                      <div className="text-xs">{days}g pubblicato</div>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{a.visualizzazioni || 0}</td>
                    <td className="p-3 text-center text-muted-foreground">{a.mi_piace || 0}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/annuncio/${a.id}`} target="_blank"><Eye className="w-4 h-4" /></a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/modifica-annuncio/${a.id}`}><Pencil className="w-4 h-4" /></Link>
                        </Button>
                        {a.stato === "in_moderazione" && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleApprova(a.id)} title="Approva">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setRifiutaId(a.id)} title="Rifiuta">
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {a.stato !== "eliminato" && (
                          <Button variant="ghost" size="icon" onClick={() => handleElimina(a.id)} title="Elimina">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!rifiutaId} onOpenChange={() => setRifiutaId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rifiuta annuncio</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo del rifiuto (opzionale)" value={motivoRifiuto} onChange={(e) => setMotivoRifiuto(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRifiutaId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleRifiuta}>Rifiuta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAnnunciSpeciali;
