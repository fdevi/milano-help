import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal, Eye, Edit, Trash2, Calendar, MapPin, Users, Search,
  CheckCircle, XCircle, Clock, PauseCircle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast as sonnerToast } from "sonner";

const AdminEventi = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rifiutoModal, setRifiutoModal] = useState<string | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState("");
  const [detailModal, setDetailModal] = useState<any | null>(null);

  // Carica eventi dalla tabella eventi
  const { data: eventi = [], isLoading } = useQuery({
    queryKey: ["admin-eventi"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eventi")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map((e: any) => e.organizzatore_id))] as string[];
      if (userIds.length === 0) return data || [];

      const { data: profili } = await supabase
        .from("profiles")
        .select("user_id, nome, cognome, email")
        .in("user_id", userIds);

      const profiliMap = new Map(profili?.map((p) => [p.user_id, p]) || []);

      return (data || []).map((evento: any) => ({
        ...evento,
        utente: profiliMap.get(evento.organizzatore_id) || { nome: "Utente", cognome: "", email: "n/a" },
      }));
    },
  });

  const approva = async (id: string) => {
    const { error } = await (supabase as any)
      .from("eventi")
      .update({ stato: "attivo" })
      .eq("id", id);
    if (error) { sonnerToast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "evento_approvato", dettagli: `Evento ${id} approvato` });
    sonnerToast.success("Evento approvato");
    queryClient.invalidateQueries({ queryKey: ["admin-eventi"] });
  };

  const rifiuta = async () => {
    if (!rifiutoModal || !motivoRifiuto.trim()) return;
    const { error } = await (supabase as any)
      .from("eventi")
      .update({ stato: "rifiutato", motivo_rifiuto: motivoRifiuto })
      .eq("id", rifiutoModal);
    if (error) { sonnerToast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "evento_rifiutato", dettagli: `Evento ${rifiutoModal} rifiutato: ${motivoRifiuto}` });
    sonnerToast.success("Evento rifiutato");
    setRifiutoModal(null);
    setMotivoRifiuto("");
    queryClient.invalidateQueries({ queryKey: ["admin-eventi"] });
  };

  const mettiInModerazione = async (id: string) => {
    const { error } = await (supabase as any)
      .from("eventi")
      .update({ stato: "in_moderazione" })
      .eq("id", id);
    if (error) { sonnerToast.error(`Errore: ${error.message}`); return; }
    sonnerToast.success("Evento rimesso in moderazione");
    queryClient.invalidateQueries({ queryKey: ["admin-eventi"] });
  };

  const elimina = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare definitivamente questo evento?")) return;
    const { error } = await (supabase as any)
      .from("eventi")
      .delete()
      .eq("id", id);
    if (error) { sonnerToast.error(`Errore: ${error.message}`); return; }
    await supabase.from("activity_logs").insert({ user_id: user?.id, azione: "evento_eliminato", dettagli: `Evento ${id} eliminato` });
    sonnerToast.success("Evento eliminato");
    queryClient.invalidateQueries({ queryKey: ["admin-eventi"] });
  };

  const getStatoBadge = (stato: string) => {
    switch (stato) {
      case "attivo": return <Badge className="bg-green-500">Attivo</Badge>;
      case "in_moderazione": return <Badge variant="secondary">In moderazione</Badge>;
      case "rifiutato": return <Badge variant="destructive">Rifiutato</Badge>;
      default: return <Badge variant="outline">{stato}</Badge>;
    }
  };

  const filteredEventi = eventi.filter((e: any) =>
    e.titolo.toLowerCase().includes(search.toLowerCase()) ||
    e.utente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.luogo?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totale: eventi.length,
    inModerazione: eventi.filter((e: any) => e.stato === "in_moderazione").length,
    attivi: eventi.filter((e: any) => e.stato === "attivo").length,
    rifiutati: eventi.filter((e: any) => e.stato === "rifiutato").length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Gestione Eventi</h1>
            <p className="text-sm text-muted-foreground">Gestisci gli eventi dalla tabella eventi</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="w-5 h-5 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Totale</p><p className="text-2xl font-bold">{stats.totale}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div><p className="text-sm text-muted-foreground">In moderazione</p><p className="text-2xl font-bold">{stats.inModerazione}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-muted-foreground">Attivi</p><p className="text-2xl font-bold">{stats.attivi}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-sm text-muted-foreground">Rifiutati</p><p className="text-2xl font-bold">{stats.rifiutati}</p></div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cerca eventi..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Organizzatore</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Luogo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-[100px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Caricamento...</TableCell></TableRow>
                ) : filteredEventi.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun evento</TableCell></TableRow>
                ) : (
                  filteredEventi.map((evento: any) => (
                    <TableRow key={evento.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{evento.titolo}</TableCell>
                      <TableCell>
                        {evento.utente?.nome || ""} {evento.utente?.cognome || ""}
                        <div className="text-xs text-muted-foreground">{evento.utente?.email}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {evento.data ? format(new Date(evento.data), "dd/MM/yyyy HH:mm", { locale: it }) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{evento.luogo || "—"}</TableCell>
                      <TableCell>{getStatoBadge(evento.stato)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailModal(evento)}>
                              <Eye className="w-4 h-4 mr-2" /> Dettagli
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/modifica-evento/${evento.id}`)}>
                              <Edit className="w-4 h-4 mr-2" /> Modifica
                            </DropdownMenuItem>
                            {evento.stato === "in_moderazione" && (
                              <>
                                <DropdownMenuItem onClick={() => approva(evento.id)}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approva
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setRifiutoModal(evento.id); setMotivoRifiuto(""); }}>
                                  <XCircle className="w-4 h-4 mr-2 text-red-600" /> Rifiuta
                                </DropdownMenuItem>
                              </>
                            )}
                            {evento.stato === "attivo" && (
                              <DropdownMenuItem onClick={() => mettiInModerazione(evento.id)}>
                                <PauseCircle className="w-4 h-4 mr-2 text-yellow-600" /> Metti in moderazione
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => elimina(evento.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Rifiuto modal */}
      <Dialog open={!!rifiutoModal} onOpenChange={() => { setRifiutoModal(null); setMotivoRifiuto(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo del rifiuto</DialogTitle></DialogHeader>
          <Textarea placeholder="Spiega il motivo del rifiuto..." value={motivoRifiuto} onChange={(e) => setMotivoRifiuto(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRifiutoModal(null)}>Annulla</Button>
            <Button variant="destructive" onClick={rifiuta} disabled={!motivoRifiuto.trim()}>Rifiuta evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detailModal?.titolo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{detailModal?.descrizione ?? "Nessuna descrizione"}</p>
            {detailModal?.data && <p className="text-sm"><Calendar className="w-4 h-4 inline mr-1" />{format(new Date(detailModal.data), "PPP HH:mm", { locale: it })}</p>}
            {detailModal?.luogo && <p className="text-sm"><MapPin className="w-4 h-4 inline mr-1" />{detailModal.luogo}</p>}
            {detailModal?.max_partecipanti && <p className="text-sm"><Users className="w-4 h-4 inline mr-1" />Max: {detailModal.max_partecipanti}</p>}
            {detailModal?.prezzo != null && <p className="text-sm font-medium">{detailModal.gratuito ? "Gratuito" : `€${detailModal.prezzo}`}</p>}
            {detailModal?.motivo_rifiuto && <p className="text-sm text-destructive">Motivo rifiuto: {detailModal.motivo_rifiuto}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEventi;
