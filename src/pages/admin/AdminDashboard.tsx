import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, CalendarCheck, MessageCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  utenti: number;
  servizi: number;
  prenotazioni: number;
  messaggiNonLetti: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ utenti: 0, servizi: 0, prenotazioni: 0, messaggiNonLetti: 0 });
  const [chartData, setChartData] = useState<{ giorno: string; registrazioni: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [profiles, servizi, prenotazioni, messaggi] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("servizi").select("id", { count: "exact", head: true }).eq("stato", "attivo"),
        supabase.from("prenotazioni").select("id", { count: "exact", head: true }),
        supabase.from("messaggi").select("id", { count: "exact", head: true }).eq("letto", false),
      ]);
      setStats({
        utenti: profiles.count ?? 0,
        servizi: servizi.count ?? 0,
        prenotazioni: prenotazioni.count ?? 0,
        messaggiNonLetti: messaggi.count ?? 0,
      });
    };

    const fetchChart = async () => {
      const days: { giorno: string; registrazioni: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
        days.push({
          giorno: d.toLocaleDateString("it-IT", { weekday: "short" }),
          registrazioni: count ?? 0,
        });
      }
      setChartData(days);
    };

    const fetchRecent = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome, cognome, email, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentActivity(data ?? []);
    };

    fetchStats();
    fetchChart();
    fetchRecent();
  }, []);

  const statCards = [
    { label: "Utenti totali", value: stats.utenti, icon: Users, color: "text-primary" },
    { label: "Servizi attivi", value: stats.servizi, icon: Briefcase, color: "text-secondary" },
    { label: "Prenotazioni", value: stats.prenotazioni, icon: CalendarCheck, color: "text-accent" },
    { label: "Messaggi non letti", value: stats.messaggiNonLetti, icon: MessageCircle, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Dashboard Admin</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registrazioni settimanali</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="giorno" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="registrazioni" fill="hsl(158 64% 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultime registrazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{u.nome} {u.cognome}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("it-IT")}
                  </span>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nessuna attività recente</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
