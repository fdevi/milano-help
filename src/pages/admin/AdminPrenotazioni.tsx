import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Prenotazione {
  id: string;
  servizio_id: string;
  utente_id: string;
  stato: string;
  data_prenotazione: string;
  note: string | null;
}

const statusColors: Record<string, string> = {
  confermata: "bg-primary/10 text-primary",
  completata: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
};

const AdminPrenotazioni = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [filterStato, setFilterStato] = useState("");
  const { toast } = useToast();

  const fetchAll = async () => {
    const { data } = await supabase
      .from("prenotazioni")
      .select("*")
      .order("data_prenotazione", { ascending: false });
    setPrenotazioni((data as Prenotazione[]) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStato = async (id: string, stato: string) => {
    await supabase.from("prenotazioni").update({ stato }).eq("id", id);
    toast({ title: `Prenotazione ${stato}` });
    fetchAll();
  };

  const filtered = prenotazioni.filter((p) => !filterStato || p.stato === filterStato);

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Gestione Prenotazioni</h1>

      <div className="flex gap-3 mb-4">
        <Select value={filterStato} onValueChange={(v) => setFilterStato(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="confermata">Confermata</SelectItem>
            <SelectItem value="completata">Completata</SelectItem>
            <SelectItem value="cancellata">Cancellata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Cambia Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-mono">{p.id.slice(0, 8)}...</TableCell>
                  <TableCell className="text-sm">{new Date(p.data_prenotazione).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[p.stato]}>{p.stato}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{p.note ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={p.stato} onValueChange={(v) => updateStato(p.id, v)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confermata">Confermata</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                        <SelectItem value="cancellata">Cancellata</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessuna prenotazione trovata</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminPrenotazioni;
