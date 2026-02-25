import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AuthLayout from "@/components/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  confermata: "bg-primary/10 text-primary",
  completata: "bg-muted text-muted-foreground",
  cancellata: "bg-destructive/10 text-destructive",
};

const MieiPrenotazioni = () => {
  const { user } = useAuth();

  const { data: prenotazioni, isLoading } = useQuery({
    queryKey: ["miei-prenotazioni", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("prenotazioni")
        .select("id, servizio_id, stato, data_prenotazione, note")
        .eq("utente_id", user!.id)
        .order("data_prenotazione", { ascending: false });
      if (!data || data.length === 0) return [];

      const servIds = [...new Set(data.map((p) => p.servizio_id))];
      const { data: servizi } = await supabase.from("servizi").select("id, titolo").in("id", servIds);
      const servMap = new Map((servizi || []).map((s) => [s.id, s.titolo]));

      return data.map((p) => ({ ...p, titolo_servizio: servMap.get(p.servizio_id) || "Servizio rimosso" }));
    },
    enabled: !!user,
  });

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Le mie prenotazioni</h1>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Caricamento...</CardContent></Card>
        ) : (prenotazioni || []).length === 0 ? (
          <Card className="p-8 text-center">
            <CalendarCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Non hai ancora effettuato prenotazioni</p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servizio</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prenotazioni || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link to={`/servizio/${p.servizio_id}`} className="hover:underline">{p.titolo_servizio}</Link>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(p.data_prenotazione).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[p.stato] || ""}>{p.stato}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{p.note || "—"}</TableCell>
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

export default MieiPrenotazioni;
