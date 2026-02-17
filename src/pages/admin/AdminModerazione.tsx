import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminModerazione = () => {
  const [stats, setStats] = useState({ inAttesa: 0, segnalazioniAperte: 0, utentiBloccati: 0 });
  const [chartData, setChartData] = useState<{ giorno: string; segnalazioni: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [annunci, segnalazioni, bloccati] = await Promise.all([
        supabase.from("annunci").select("id", { count: "exact", head: true }).eq("stato", "in_moderazione"),
        supabase.from("segnalazioni").select("id", { count: "exact", head: true }).eq("stato", "aperta"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("bloccato", true),
      ]);
      setStats({
        inAttesa: annunci.count ?? 0,
        segnalazioniAperte: segnalazioni.count ?? 0,
        utentiBloccati: bloccati.count ?? 0,
      });
    };

    const fetchChart = async () => {
      const days: { giorno: string; segnalazioni: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const { count } = await supabase
          .from("segnalazioni")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
        days.push({
          giorno: d.toLocaleDateString("it-IT", { weekday: "short" }),
          segnalazioni: count ?? 0,
        });
      }
      setChartData(days);
    };

    fetch();
    fetchChart();
  }, []);

  const statCards = [
    { label: "Annunci in attesa", value: stats.inAttesa, icon: Clock, color: "text-secondary", link: "/admin/moderazione/annunci" },
    { label: "Segnalazioni aperte", value: stats.segnalazioniAperte, icon: AlertTriangle, color: "text-destructive", link: "/admin/moderazione/segnalazioni" },
    { label: "Utenti bloccati", value: stats.utentiBloccati, icon: ShieldAlert, color: "text-accent", link: "/admin/utenti" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Moderazione</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((s) => (
          <Link key={s.label} to={s.link}>
            <Card className="hover:shadow-card-hover transition-shadow cursor-pointer">
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
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Segnalazioni settimanali</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="giorno" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="segnalazioni" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Azioni rapide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/moderazione/annunci">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Clock className="w-4 h-4" /> Modera annunci in attesa
              </Button>
            </Link>
            <Link to="/admin/moderazione/segnalazioni">
              <Button variant="outline" className="w-full justify-start gap-2">
                <AlertTriangle className="w-4 h-4" /> Gestisci segnalazioni
              </Button>
            </Link>
            <Link to="/admin/moderazione/storico">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ShieldAlert className="w-4 h-4" /> Storico moderazione
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminModerazione;
