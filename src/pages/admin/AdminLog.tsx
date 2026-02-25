import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, AlertCircle } from "lucide-react";

interface LogEntry {
  id: string;
  user_id: string | null;
  azione: string;
  dettagli: string | null;
  created_at: string;
}

const AdminLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = () => {
    setLoading(true);
    setError(null);
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          return;
        }
        setLogs((data as LogEntry[]) ?? []);
      })
      .then(undefined, (e: unknown) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Errore di caricamento");
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCSV = () => {
    const header = "ID,User ID,Azione,Dettagli,Data\n";
    const rows = logs.map((l) =>
      `"${l.id}","${l.user_id ?? ""}","${l.azione}","${l.dettagli ?? ""}","${l.created_at}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log_attivita_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Log Attività</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Esporta CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">Errore: {error}</p>
              <Button variant="outline" onClick={fetchLogs} className="mt-4">
                Riprova
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead>Dettagli</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Caricamento log...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nessun log trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("it-IT")}
                      </TableCell>
                      <TableCell className="font-medium">{l.azione}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {l.dettagli ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {l.user_id?.slice(0, 8) ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminLog;