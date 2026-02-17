import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

interface LogEntry {
  id: string;
  user_id: string | null;
  azione: string;
  dettagli: string | null;
  created_at: string;
}

const MODERATION_ACTIONS = [
  "annuncio_approvato",
  "annuncio_rifiutato",
  "annuncio_eliminato_segnalazione",
  "utente_bloccato_segnalazione",
  "segnalazione_ignorata",
];

const azioneLabels: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  annuncio_approvato: { label: "Approvato", variant: "default" },
  annuncio_rifiutato: { label: "Rifiutato", variant: "destructive" },
  annuncio_eliminato_segnalazione: { label: "Eliminato", variant: "destructive" },
  utente_bloccato_segnalazione: { label: "Utente bloccato", variant: "destructive" },
  segnalazione_ignorata: { label: "Ignorata", variant: "secondary" },
};

const AdminModStorico = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    supabase
      .from("activity_logs")
      .select("*")
      .in("azione", MODERATION_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setLogs((data as LogEntry[]) ?? []));
  }, []);

  const exportCSV = () => {
    const header = "ID,Admin ID,Azione,Dettagli,Data\n";
    const rows = logs.map((l) =>
      `"${l.id}","${l.user_id ?? ""}","${l.azione}","${l.dettagli ?? ""}","${l.created_at}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storico_moderazione_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Storico Moderazione</h1>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Esporta CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Azione</TableHead>
                <TableHead>Dettagli</TableHead>
                <TableHead>Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                const info = azioneLabels[l.azione] ?? { label: l.azione, variant: "outline" as const };
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("it-IT")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={info.variant}>{info.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {l.dettagli ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{l.user_id?.slice(0, 8) ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nessuna azione di moderazione trovata
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminModStorico;
