import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthLayout from "@/components/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  confermata: "bg-primary/10 text-primary",
  completata: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
};

const MieiServiziPrenotati = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: prenotazioni, isLoading } = useQuery({
    queryKey: ["miei-servizi-prenotati", user?.id],
    queryFn: async () => {
      // Get my servizi ids
      const { data: servizi } = await supabase.from("servizi").select("id, titolo").eq("operatore_id", user!.id);
      if (!servizi || servizi.length === 0) return [];

      const servIds = servizi.map((s) => s.id);
      const servMap = new Map(servizi.map((s) => [s.id, s.titolo]));

      const { data } = await supabase
        .from("prenotazioni")
        .select("id, servizio_id, utente_id, stato, data_prenotazione, note")
        .in("servizio_id", servIds)
        .order("data_prenotazione", { ascending: false });
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((p) => p.utente_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, nome, cognome, email").in("user_id", userIds);
      const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return data.map((p) => ({
        ...p,
        titolo_servizio: servMap.get(p.servizio_id) || "—",
        cliente: profMap.get(p.utente_id),
      }));
    },
    enabled: !!user,
  });

  const updateStato = async (id: string, stato: string) => {
    const { error } = await supabase.from("prenotazioni").update({ stato }).eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Prenotazione ${stato}` });
      qc.invalidateQueries({ queryKey: ["miei-servizi-prenotati"] });
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Prenotazioni ricevute</h1>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Caricamento...</CardContent></Card>
        ) : (prenotazioni || []).length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nessuna prenotazione ricevuta</p>
          </Card>
        ) : (
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
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prenotazioni || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.titolo_servizio}</TableCell>
                      <TableCell className="text-sm">
                        {p.cliente ? `${p.cliente.nome || ""} ${p.cliente.cognome || ""}`.trim() || p.cliente.email : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(p.data_prenotazione).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[p.stato] || ""}>{p.stato}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{p.note || "—"}</TableCell>
                      <TableCell>
                        <Select value={p.stato} onValueChange={(v) => updateStato(p.id, v)}>
                          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confermata">Confermata</SelectItem>
                            <SelectItem value="completata">Completata</SelectItem>
                            <SelectItem value="cancellata">Cancellata</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default MieiServiziPrenotati;
