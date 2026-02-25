import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface Prenotazione {
  id: string;
  servizio_id: string;
  utente_id: string;
  stato: string;
  data_prenotazione: string;
  note: string | null;
  titolo_servizio?: string;
  cliente_nome?: string;
  cliente_email?: string;
}

const statusColors: Record<string, string> = {
  confermata: "bg-primary/10 text-primary",
  completata: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
};

const AdminPrenotazioni = () => {
  const [prenotazioni, setPrenotazioni] = useState<Prenotazione[]>([]);
  const [filterStato, setFilterStato] = useState("");
  const [visibiliEntrambi, setVisibiliEntrambi] = useState(true);
  const { toast } = useToast();

  const fetchAll = async () => {
    const { data } = await supabase
      .from("prenotazioni")
      .select("*")
      .order("data_prenotazione", { ascending: false });
    const raw = (data || []) as any[];

    // Fetch servizi titles
    const servIds = [...new Set(raw.map((p) => p.servizio_id))];
    const { data: servizi } = servIds.length > 0
      ? await supabase.from("servizi").select("id, titolo").in("id", servIds)
      : { data: [] };
    const servMap = new Map((servizi || []).map((s) => [s.id, s.titolo]));

    // Fetch client profiles
    const userIds = [...new Set(raw.map((p) => p.utente_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, nome, cognome, email").in("user_id", userIds)
      : { data: [] };
    const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    setPrenotazioni(raw.map((p) => {
      const prof = profMap.get(p.utente_id);
      return {
        ...p,
        titolo_servizio: servMap.get(p.servizio_id) || "—",
        cliente_nome: prof ? `${prof.nome || ""} ${prof.cognome || ""}`.trim() : "—",
        cliente_email: prof?.email || "—",
      };
    }));
  };

  const fetchSetting = async () => {
    const { data } = await supabase.from("impostazioni").select("valore").eq("chiave", "prenotazioni_visibili_entrambi").single();
    setVisibiliEntrambi(data?.valore === "true");
  };

  useEffect(() => { fetchAll(); fetchSetting(); }, []);

  const toggleVisibili = async (checked: boolean) => {
    setVisibiliEntrambi(checked);
    await supabase.from("impostazioni").update({ valore: checked ? "true" : "false" }).eq("chiave", "prenotazioni_visibili_entrambi");
    toast({ title: checked ? "Prenotazioni visibili a entrambi" : "Prenotazioni visibili solo all'operatore" });
  };

  const updateStato = async (id: string, stato: string) => {
    await supabase.from("prenotazioni").update({ stato }).eq("id", id);
    toast({ title: `Prenotazione ${stato}` });
    fetchAll();
  };

  const deletePrenotazione = async (id: string) => {
    const { error } = await supabase.from("prenotazioni").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prenotazione eliminata" });
      fetchAll();
    }
  };

  const filtered = prenotazioni.filter((p) => !filterStato || p.stato === filterStato);

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Gestione Prenotazioni</h1>

      <Card className="mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <Switch id="visibili-entrambi" checked={visibiliEntrambi} onCheckedChange={toggleVisibili} />
          <Label htmlFor="visibili-entrambi" className="text-sm">
            Prenotazioni visibili sia al cliente che all'operatore
          </Label>
          <Badge variant="secondary" className="ml-2">{visibiliEntrambi ? "Entrambi" : "Solo operatore"}</Badge>
        </CardContent>
      </Card>

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
                <TableHead>Servizio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Cambia Stato</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.titolo_servizio}</TableCell>
                  <TableCell className="text-sm">
                    <div>{p.cliente_nome}</div>
                    <div className="text-xs text-muted-foreground">{p.cliente_email}</div>
                  </TableCell>
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
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deletePrenotazione(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nessuna prenotazione trovata</TableCell>
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
