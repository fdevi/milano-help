import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Sparkles, RefreshCw, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LogEntry {
  id: string;
  created_at: string;
  fonte: string;
  eventi_trovati: number;
  eventi_inseriti: number;
  eventi_scartati: number;
  dettaglio: any;
}

interface Stats {
  ticketmaster: number;
  seatgeek: number;
  totale: number;
}

const AdminImportazioni = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ ticketmaster: 0, seatgeek: 0, totale: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [logsRes, tmCount, sgCount] = await Promise.all([
      supabase.from("importazioni_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("eventi").select("id", { count: "exact", head: true }).eq("fonte_esterna", "ticketmaster"),
      supabase.from("eventi").select("id", { count: "exact", head: true }).eq("fonte_esterna", "seatgeek"),
    ]);

    setLogs((logsRes.data as LogEntry[]) || []);
    const tm = tmCount.count ?? 0;
    const sg = sgCount.count ?? 0;
    setStats({ ticketmaster: tm, seatgeek: sg, totale: tm + sg });

    // Build chart data from logs (last 7 days)
    const days: Record<string, { giorno: string; inseriti: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = { giorno: d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" }), inseriti: 0 };
    }
    for (const log of (logsRes.data as LogEntry[]) || []) {
      const key = log.created_at.split("T")[0];
      if (days[key]) days[key].inseriti += log.eventi_inseriti;
    }
    setChartData(Object.values(days));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-external-events");
      if (error) throw error;
      toast({ title: "Importazione completata", description: `Inseriti: ${data?.total_inserted ?? 0} eventi` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Errore importazione", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleEnhance = async () => {
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-existing-events", {
        body: { limit: 50, offset: 0 },
      });
      if (error) throw error;
      toast({ title: "Arricchimento completato", description: `Migliorati: ${data?.enhanced ?? 0} su ${data?.total ?? 0}` });
    } catch (e: any) {
      toast({ title: "Errore arricchimento", description: e.message, variant: "destructive" });
    } finally {
      setEnhancing(false);
    }
  };

  const fonteLabel = (f: string) => {
    if (f === "ticketmaster") return "🎫 Ticketmaster";
    if (f === "seatgeek") return "🎪 SeatGeek";
    return f;
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Importazioni Eventi</h1>
        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={importing} size="sm">
            {importing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Importa ora
          </Button>
          <Button onClick={handleEnhance} disabled={enhancing} variant="secondary" size="sm">
            {enhancing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Arricchisci AI
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-primary">{stats.ticketmaster}</p>
            <p className="text-sm text-muted-foreground">🎫 Ticketmaster</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-primary">{stats.seatgeek}</p>
            <p className="text-sm text-muted-foreground">🎪 SeatGeek</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{stats.totale}</p>
            <p className="text-sm text-muted-foreground">Totale eventi esterni</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Eventi importati (ultimi 7 giorni)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="giorno" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Bar dataKey="inseriti" fill="hsl(158 64% 36%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Log history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cronologia importazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nessuna importazione registrata</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fonte</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Trovati</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Inseriti</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Scartati</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-3">
                        {new Date(log.created_at).toLocaleString("it-IT", {
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-3">{fonteLabel(log.fonte)}</td>
                      <td className="py-2 px-3 text-right">{log.eventi_trovati}</td>
                      <td className="py-2 px-3 text-right font-medium text-primary">{log.eventi_inseriti}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{log.eventi_scartati}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminImportazioni;
