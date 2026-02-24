import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, Eye, MoreHorizontal, Trash2, PauseCircle } from "lucide-react";
import { toast } from "sonner";

interface Annuncio {
  id: string;
  titolo: string;
  descrizione: string | null;
  prezzo: number | null;
  quartiere: string | null;
  stato: string;
  created_at: string;
  user_id: string;
  categoria_id: string | null;
  immagini: string[];
  motivo_rifiuto: string | null;
  categoria?: { label: string } | null;
  profilo?: { nome: string | null; cognome: string | null; email: string | null } | null;
}

interface CategoriaAnnuncio {
  id: string;
  label: string;
}

const AdminModAnnunci = () => {
  const { user } = useAuth();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [categorie, setCategorie] = useState<CategoriaAnnuncio[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [filtroStato, setFiltroStato] = useState("in_moderazione");
  const [rifiutoModal, setRifiutoModal] = useState<string | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState("");
  const [detailModal, setDetailModal] = useState<Annuncio | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnnunci = async () => {
    setLoading(true);
    let query = supabase
      .from("annunci")
      .select("*, categoria:categorie_annunci(label)")
      .order("created_at", { ascending: true });

    if (filtroStato !== "all") {
      query = query.eq("stato", filtroStato);
    }
    if (filtroCategoria !== "all") {
      query = query.eq("categoria_id", filtroCategoria);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) ?? []);
      const enriched = data.map(a => ({
        ...a,
        profilo: profileMap.get(a.user_id) ?? null,
      }));
      setAnnunci(enriched as Annuncio[]);
    } else {
      setAnnunci([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.from("categorie_annunci").select("id, label").order("ordine").then(({ data }) => {
      setCategorie((data as CategoriaAnnuncio[]) ?? []);
    });
  }, []);

  useEffect(() => {
    fetchAnnunci();
  }, [filtroCategoria, filtroStato]);

  const approva = async (id: string) => {
    const annuncio = annunci.find(a => a.id === id);
    const { error } = await supabase
      .from("annunci")
      .update({ stato: "attivo", moderato_da: user?.id, moderato_il: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "annuncio_approvato", dettagli: `Annuncio ${id} approvato` });
    // Notify author
    if (annuncio) {
      await supabase.from("notifiche").insert({
        user_id: annuncio.user_id,
        tipo: "approvato",
        titolo: "Annuncio approvato",
        messaggio: `Il tuo annuncio "${annuncio.titolo}" è stato approvato`,
        link: `/annuncio/${id}`,
        riferimento_id: id,
        mittente_id: user?.id,
      } as any);
    }
    toast.success("Annuncio approvato");
    fetchAnnunci();
  };

  const rifiuta = async () => {
    if (!rifiutoModal || !motivoRifiuto.trim()) return;
    const annuncio = annunci.find(a => a.id === rifiutoModal);
    const { error } = await supabase
      .from("annunci")
      .update({ stato: "rifiutato", motivo_rifiuto: motivoRifiuto, moderato_da: user?.id, moderato_il: new Date().toISOString() })
      .eq("id", rifiutoModal);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "annuncio_rifiutato", dettagli: `Annuncio ${rifiutoModal} rifiutato: ${motivoRifiuto}` });
    // Notify author
    if (annuncio) {
      await supabase.from("notifiche").insert({
        user_id: annuncio.user_id,
        tipo: "rifiutato",
        titolo: "Annuncio rifiutato",
        messaggio: `Il tuo annuncio "${annuncio.titolo}" è stato rifiutato. Motivo: ${motivoRifiuto}`,
        link: `/annuncio/${rifiutoModal}`,
        riferimento_id: rifiutoModal,
        mittente_id: user?.id,
      } as any);
    }
    toast.success("Annuncio rifiutato");
    setRifiutoModal(null);
    setMotivoRifiuto("");
    fetchAnnunci();
  };

  const mettiInModerazione = async (id: string) => {
    const { error } = await supabase
      .from("annunci")
      .update({ stato: "in_moderazione" })
      .eq("id", id);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    toast.success("Annuncio rimesso in moderazione");
    fetchAnnunci();
  };

  const elimina = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo annuncio?")) return;
    const { error } = await supabase
      .from("annunci")
      .delete()
      .eq("id", id);
    if (error) { toast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "annuncio_eliminato", dettagli: `Annuncio ${id} eliminato` });
    toast.success("Annuncio eliminato");
    fetchAnnunci();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="font-heading font-extrabold text-2xl">Moderazione Annunci</h1>
        <div className="flex gap-2">
          <Select value={filtroStato} onValueChange={setFiltroStato}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="in_moderazione">In moderazione</SelectItem>
              <SelectItem value="attivo">Attivo</SelectItem>
              <SelectItem value="rifiutato">Rifiutato</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tutte le categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categorie.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Autore</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annunci.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{a.titolo}</TableCell>
                  <TableCell className="text-sm">
                    {a.profilo ? `${a.profilo.nome ?? ""} ${a.profilo.cognome ?? ""}`.trim() || a.profilo.email : a.user_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(a.categoria as any)?.label ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.stato === "attivo" ? "default" : a.stato === "rifiutato" ? "destructive" : "secondary"}>
                      {a.stato === "in_moderazione" ? "In moderazione" : a.stato === "attivo" ? "Attivo" : a.stato === "rifiutato" ? "Rifiutato" : a.stato}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString("it-IT")}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailModal(a)}>
                          <Eye className="w-4 h-4 mr-2" /> Dettagli
                        </DropdownMenuItem>
                        {a.stato === "in_moderazione" && (
                          <>
                            <DropdownMenuItem onClick={() => approva(a.id)}>
                              <Check className="w-4 h-4 mr-2 text-green-600" /> Approva
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setRifiutoModal(a.id); setMotivoRifiuto(""); }}>
                              <X className="w-4 h-4 mr-2 text-red-600" /> Rifiuta
                            </DropdownMenuItem>
                          </>
                        )}
                        {a.stato === "attivo" && (
                          <DropdownMenuItem onClick={() => mettiInModerazione(a.id)}>
                            <PauseCircle className="w-4 h-4 mr-2 text-yellow-600" /> Metti in moderazione
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => elimina(a.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && annunci.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nessun annuncio trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reject modal */}
      <Dialog open={!!rifiutoModal} onOpenChange={() => { setRifiutoModal(null); setMotivoRifiuto(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo del rifiuto</DialogTitle></DialogHeader>
          <Textarea placeholder="Spiega il motivo del rifiuto..." value={motivoRifiuto} onChange={(e) => setMotivoRifiuto(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRifiutoModal(null)}>Annulla</Button>
            <Button variant="destructive" onClick={rifiuta} disabled={!motivoRifiuto.trim()}>Rifiuta annuncio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailModal?.titolo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{detailModal?.descrizione ?? "Nessuna descrizione"}</p>
            {detailModal?.prezzo != null && <p className="text-sm font-medium">Prezzo: €{detailModal.prezzo}</p>}
            {detailModal?.quartiere && <p className="text-sm">Quartiere: {detailModal.quartiere}</p>}
            {detailModal?.motivo_rifiuto && <p className="text-sm text-destructive">Motivo rifiuto: {detailModal.motivo_rifiuto}</p>}
            {detailModal?.immagini && detailModal.immagini.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {detailModal.immagini.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg border" />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminModAnnunci;
