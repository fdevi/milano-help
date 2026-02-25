import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

interface LogEntry {
  id: string;
  user_id: string | null;
  azione: string;
  dettagli: string | null;
  created_at: string;
}

const AdminLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        console.log("AdminLog fetch:", { data, error });
        if (error) console.error("AdminLog error:", error);
        setLogs((data as LogEntry[]) ?? []);
      });
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
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </TableCell>
                  <TableCell className="font-medium">{l.azione}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{l.dettagli ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{l.user_id?.slice(0, 8) ?? "—"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nessun log trovato</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminLog;
