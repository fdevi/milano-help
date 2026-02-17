import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Ban, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

interface Segnalazione {
  id: string;
  annuncio_id: string;
  utente_id: string;
  motivo: string;
  note: string | null;
  stato: string;
  created_at: string;
  annuncio?: { titolo: string; user_id: string; stato: string } | null;
}

const motivoLabels: Record<string, string> = {
  inappropriato: "Contenuto inappropriato",
  spam: "Spam",
  falso: "Annuncio falso",
  altro: "Altro",
};

const AdminSegnalazioni = () => {
  const { user } = useAuth();
  const [segnalazioni, setSegnalazioni] = useState<Segnalazione[]>([]);
  const [detailModal, setDetailModal] = useState<Segnalazione | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSegnalazioni = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("segnalazioni")
      .select("*, annuncio:annunci(titolo, user_id, stato)")
      .eq("stato", "aperta")
      .order("created_at", { ascending: true });
    setSegnalazioni((data as Segnalazione[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSegnalazioni(); }, []);

  const eliminaAnnuncio = async (s: Segnalazione) => {
    if (!s.annuncio) return;
    await supabase.from("annunci").update({ stato: "eliminato" }).eq("id", s.annuncio_id);
    await supabase.from("segnalazioni").update({ stato: "risolta", gestita_da: user?.id }).eq("id", s.id);
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      azione: "annuncio_eliminato_segnalazione",
      dettagli: `Annuncio "${s.annuncio.titolo}" eliminato per segnalazione ${s.id}`,
    });
    toast.success("Annuncio eliminato");
    fetchSegnalazioni();
  };

  const bloccaAutore = async (s: Segnalazione) => {
    if (!s.annuncio) return;
    await supabase.from("profiles").update({ bloccato: true }).eq("user_id", s.annuncio.user_id);
    await supabase.from("segnalazioni").update({ stato: "risolta", gestita_da: user?.id }).eq("id", s.id);
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      azione: "utente_bloccato_segnalazione",
      dettagli: `Utente ${s.annuncio.user_id} bloccato per segnalazione ${s.id}`,
    });
    toast.success("Autore bloccato");
    fetchSegnalazioni();
  };

  const ignoraSegnalazione = async (s: Segnalazione) => {
    await supabase.from("segnalazioni").update({ stato: "ignorata", gestita_da: user?.id }).eq("id", s.id);
    await supabase.from("activity_logs").insert({
      user_id: user?.id,
      azione: "segnalazione_ignorata",
      dettagli: `Segnalazione ${s.id} ignorata`,
    });
    toast.success("Segnalazione ignorata");
    fetchSegnalazioni();
  };

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Gestione Segnalazioni</h1>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Annuncio</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segnalazioni.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {(s.annuncio as any)?.titolo ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">{motivoLabels[s.motivo] ?? s.motivo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {s.note ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString("it-IT")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setDetailModal(s)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => eliminaAnnuncio(s)} className="gap-1">
                      <Trash2 className="w-4 h-4" /> Elimina
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bloccaAutore(s)} className="gap-1">
                      <Ban className="w-4 h-4" /> Blocca
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => ignoraSegnalazione(s)} className="gap-1">
                      <XCircle className="w-4 h-4" /> Ignora
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && segnalazioni.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nessuna segnalazione aperta
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dettaglio segnalazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p><strong>Annuncio:</strong> {(detailModal?.annuncio as any)?.titolo}</p>
            <p><strong>Motivo:</strong> {motivoLabels[detailModal?.motivo ?? ""] ?? detailModal?.motivo}</p>
            <p><strong>Note:</strong> {detailModal?.note ?? "Nessuna"}</p>
            <p><strong>Segnalato da:</strong> {detailModal?.utente_id.slice(0, 8)}...</p>
            <p><strong>Data:</strong> {detailModal && new Date(detailModal.created_at).toLocaleString("it-IT")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModal(null)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSegnalazioni;
