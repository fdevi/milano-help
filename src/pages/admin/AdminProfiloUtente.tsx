import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Building } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const AdminProfiloUtente = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ annunci: 0, eventi: 0, servizi: 0 });

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      const [profileRes, roleRes, annunciRes, eventiRes, serviziRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("annunci").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("eventi").select("id", { count: "exact", head: true }).eq("organizzatore_id", userId),
        supabase.from("servizi").select("id", { count: "exact", head: true }).eq("operatore_id", userId),
      ]);
      setProfile(profileRes.data);
      setRole(roleRes.data?.role ?? "user");
      setStats({
        annunci: annunciRes.count ?? 0,
        eventi: eventiRes.count ?? 0,
        servizi: serviziRes.count ?? 0,
      });
      setLoading(false);
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-20 text-muted-foreground">Utente non trovato</div>
      </AdminLayout>
    );
  }

  const roleBadgeVariant = role === "admin" ? "destructive" : role === "moderator" ? "default" : "secondary";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin/utenti">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="font-heading font-extrabold text-2xl">Profilo Utente</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Info card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {(profile.nome?.[0] ?? "").toUpperCase()}{(profile.cognome?.[0] ?? "").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-lg">{profile.nome} {profile.cognome}</h2>
                {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
              </div>
              <Badge variant={roleBadgeVariant} className="capitalize">{role}</Badge>
              {profile.bloccato && <Badge variant="destructive">Bloccato</Badge>}
            </CardContent>
          </Card>

          {/* Details card */}
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Dettagli</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow icon={Mail} label="Email" value={profile.email} />
                <InfoRow icon={Phone} label="Telefono" value={profile.telefono} />
                <InfoRow icon={MapPin} label="Quartiere" value={profile.quartiere} />
                <InfoRow icon={MapPin} label="Città" value={profile.citta} />
                <InfoRow icon={Building} label="Tipo account" value={profile.tipo_account} />
                <InfoRow icon={User} label="Nome attività" value={profile.nome_attivita} />
                <InfoRow icon={Calendar} label="Data nascita" value={profile.data_nascita ? format(new Date(profile.data_nascita), "d MMMM yyyy", { locale: it }) : null} />
                <InfoRow icon={Calendar} label="Registrato il" value={format(new Date(profile.created_at), "d MMMM yyyy", { locale: it })} />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Statistiche</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Annunci" value={stats.annunci} />
                  <StatCard label="Eventi" value={stats.eventi} />
                  <StatCard label="Servizi" value={stats.servizi} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  </div>
);

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="bg-muted/50 rounded-lg p-3 text-center">
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default AdminProfiloUtente;
