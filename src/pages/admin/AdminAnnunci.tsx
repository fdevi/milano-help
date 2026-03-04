import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Eye, Pencil, PauseCircle, Search, Trash2, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";

type Annuncio = {
  id: string;
  titolo: string;
  descrizione: string | null;
  prezzo: number | null;
  stato: string;
  created_at: string;
  immagini: string[] | null;
  quartiere: string | null;
  categoria_id: string | null;
  user_id: string;
  mostra_email: boolean;
  mostra_telefono: boolean;
  profiles: { nome: string | null; cognome: string | null; email: string | null; username: string | null } | null;
  categorie_annunci: { label: string } | null;
};

const statoBadge = (stato: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    attivo: { label: "Approvato", variant: "default" },
    in_moderazione: { label: "In moderazione", variant: "secondary" },
    sospeso: { label: "Sospeso", variant: "outline" },
    rifiutato: { label: "Rifiutato", variant: "destructive" },
    chiuso: { label: "Chiuso", variant: "outline" },
  };
  const s = map[stato] || { label: stato, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
};

const AdminAnnunci = () => {
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState("tutti");
  const [filtroCategoria, setFiltroCategoria] = useState("tutte");
  const [categorie, setCategorie] = useState<{ id: string; label: string }[]>([]);

  // Detail dialog
  const [detailAnnuncio, setDetailAnnuncio] = useState<Annuncio | null>(null);

  // Edit dialog
  const [editAnnuncio, setEditAnnuncio] = useState<Annuncio | null>(null);
  const [editTitolo, setEditTitolo] = useState("");
  const [editDescrizione, setEditDescrizione] = useState("");
  const [editPrezzo, setEditPrezzo] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Reject dialog
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState("");

  const fetchAnnunci = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("annunci")
      .select("*, profiles!annunci_user_id_fkey(nome, cognome, email, username), categorie_annunci(label)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAnnunci(data as unknown as Annuncio[]);
    }
    setLoading(false);
  };

  const fetchCategorie = async () => {
    const { data } = await supabase.from("categorie_annunci").select("id, label").order("ordine");
    if (data) setCategorie(data);
  };

  useEffect(() => {
    fetchAnnunci();
    fetchCategorie();
  }, []);

  const changeStato = async (id: string, newStato: string, motivo?: string) => {
    const update: Record<string, unknown> = { stato: newStato };
    if (motivo) update.motivo_rifiuto = motivo;
    const { error } = await supabase.from("annunci").update(update).eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Stato aggiornato", description: `Annuncio impostato come "${newStato}"` });
      fetchAnnunci();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("annunci").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Annuncio eliminato" });
      fetchAnnunci();
    }
    setDeleteId(null);
  };

  const handleSaveEdit = async () => {
    if (!editAnnuncio) return;
    const { error } = await supabase.from("annunci").update({
      titolo: editTitolo,
      descrizione: editDescrizione,
      prezzo: editPrezzo ? parseFloat(editPrezzo) : null,
    }).eq("id", editAnnuncio.id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Annuncio aggiornato" });
      setEditAnnuncio(null);
      fetchAnnunci();
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    await changeStato(rejectId, "rifiutato", motivoRifiuto);
    setRejectId(null);
    setMotivoRifiuto("");
  };

  const filtered = annunci.filter((a) => {
    if (filtroStato !== "tutti" && a.stato !== filtroStato) return false;
    if (filtroCategoria !== "tutte" && a.categoria_id !== filtroCategoria) return false;
    if (search) {
      const s = search.toLowerCase();
      const autore = `${a.profiles?.nome || ""} ${a.profiles?.cognome || ""} ${a.profiles?.email || ""}`.toLowerCase();
      if (!a.titolo.toLowerCase().includes(s) && !autore.includes(s)) return false;
    }
    return true;
  });

  const authorName = (a: Annuncio) => {
    if (a.profiles?.nome || a.profiles?.cognome)
      return `${a.profiles.nome || ""} ${a.profiles.cognome || ""}`.trim();
    return a.profiles?.username || a.profiles?.email || "—";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Gestione Annunci</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per titolo o autore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroStato} onValueChange={setFiltroStato}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti gli stati</SelectItem>
              <SelectItem value="attivo">Approvato</SelectItem>
              <SelectItem value="in_moderazione">In moderazione</SelectItem>
              <SelectItem value="sospeso">Sospeso</SelectItem>
              <SelectItem value="rifiutato">Rifiutato</SelectItem>
              <SelectItem value="chiuso">Chiuso</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutte">Tutte le categorie</SelectItem>
              {categorie.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          {filtered.length} annunci trovati
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Autore</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun annuncio trovato</TableCell></TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.titolo}</TableCell>
                    <TableCell className="text-sm">{authorName(a)}</TableCell>
                    <TableCell className="text-sm">{a.categorie_annunci?.label || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(a.created_at), "dd MMM yyyy", { locale: it })}</TableCell>
                    <TableCell>{statoBadge(a.stato)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Dettagli" onClick={() => setDetailAnnuncio(a)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Modifica" onClick={() => {
                          setEditAnnuncio(a);
                          setEditTitolo(a.titolo);
                          setEditDescrizione(a.descrizione || "");
                          setEditPrezzo(a.prezzo?.toString() || "");
                        }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {a.stato === "in_moderazione" && (
                          <>
                            <Button size="icon" variant="ghost" title="Approva" onClick={() => changeStato(a.id, "attivo")} className="text-green-600 hover:text-green-700">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Rifiuta" onClick={() => { setRejectId(a.id); setMotivoRifiuto(""); }} className="text-destructive">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {a.stato === "attivo" && (
                          <Button size="icon" variant="ghost" title="Sospendi" onClick={() => changeStato(a.id, "sospeso")}>
                            <PauseCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {(a.stato === "sospeso" || a.stato === "rifiutato") && (
                          <Button size="icon" variant="ghost" title="Rimetti in moderazione" onClick={() => changeStato(a.id, "in_moderazione")}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" title="Elimina" onClick={() => setDeleteId(a.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailAnnuncio} onOpenChange={() => setDetailAnnuncio(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailAnnuncio?.titolo}</DialogTitle>
            <DialogDescription>Dettagli annuncio</DialogDescription>
          </DialogHeader>
          {detailAnnuncio && (
            <div className="space-y-4">
              {detailAnnuncio.immagini && detailAnnuncio.immagini.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {detailAnnuncio.immagini.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-32 h-32 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Autore:</span> {authorName(detailAnnuncio)}</div>
                <div><span className="text-muted-foreground">Categoria:</span> {detailAnnuncio.categorie_annunci?.label || "—"}</div>
                <div><span className="text-muted-foreground">Prezzo:</span> {detailAnnuncio.prezzo != null ? `€${detailAnnuncio.prezzo}` : "—"}</div>
                <div><span className="text-muted-foreground">Stato:</span> {statoBadge(detailAnnuncio.stato)}</div>
                <div><span className="text-muted-foreground">Quartiere:</span> {detailAnnuncio.quartiere || "—"}</div>
                <div><span className="text-muted-foreground">Data:</span> {format(new Date(detailAnnuncio.created_at), "dd/MM/yyyy HH:mm", { locale: it })}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Descrizione:</span>
                <p className="mt-1 text-sm whitespace-pre-wrap">{detailAnnuncio.descrizione || "Nessuna descrizione"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAnnuncio} onOpenChange={() => setEditAnnuncio(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Annuncio</DialogTitle>
            <DialogDescription>Modifica i dettagli dell'annuncio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titolo</label>
              <Input value={editTitolo} onChange={(e) => setEditTitolo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea value={editDescrizione} onChange={(e) => setEditDescrizione(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium">Prezzo (€)</label>
              <Input type="number" value={editPrezzo} onChange={(e) => setEditPrezzo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAnnuncio(null)}>Annulla</Button>
            <Button onClick={handleSaveEdit}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Annuncio</DialogTitle>
            <DialogDescription>Inserisci il motivo del rifiuto</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo del rifiuto..."
            value={motivoRifiuto}
            onChange={(e) => setMotivoRifiuto(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!motivoRifiuto.trim()}>Rifiuta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo annuncio?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile. L'annuncio verrà eliminato definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminAnnunci;
