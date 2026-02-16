import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck } from "lucide-react";

interface UserRow {
  id: string;
  user_id: string;
  nome: string | null;
  cognome: string | null;
  email: string | null;
  quartiere: string | null;
  tipo_account: string | null;
  created_at: string;
  bloccato: boolean | null;
}

const AdminUtenti = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [filterQuartiere, setFilterQuartiere] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, nome, cognome, email, quartiere, tipo_account, created_at, bloccato")
      .order("created_at", { ascending: false });
    setUsers((data as UserRow[]) ?? []);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, string> = {};
    data?.forEach((r: any) => { map[r.user_id] = r.role; });
    setRoles(map);
  };

  useEffect(() => { fetchUsers(); fetchRoles(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const existing = roles[userId];
    if (existing) {
      await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
    }
    toast({ title: "Ruolo aggiornato" });
    fetchRoles();
  };

  const handleBlock = async (userId: string, block: boolean) => {
    await supabase.from("profiles").update({ bloccato: block }).eq("user_id", userId);
    toast({ title: block ? "Utente bloccato" : "Utente sbloccato" });
    fetchUsers();
  };

  const filtered = users.filter((u) => {
    if (filterQuartiere && u.quartiere !== filterQuartiere) return false;
    if (filterTipo && u.tipo_account !== filterTipo) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !(u.nome?.toLowerCase().includes(s) ||
          u.cognome?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s))
      ) return false;
    }
    return true;
  });

  const quartieri = [...new Set(users.map((u) => u.quartiere).filter(Boolean))];
  const tipi = [...new Set(users.map((u) => u.tipo_account).filter(Boolean))];

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Gestione Utenti</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cerca per nome o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterQuartiere} onValueChange={(v) => setFilterQuartiere(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Quartiere" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i quartieri</SelectItem>
                {quartieri.map((q) => <SelectItem key={q!} value={q!}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo account" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                {tipi.map((t) => <SelectItem key={t!} value={t!}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Quartiere</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Registrato</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className={u.bloccato ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{u.nome} {u.cognome}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.quartiere ?? "—"}</TableCell>
                    <TableCell className="text-sm capitalize">{u.tipo_account ?? "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell>
                      <Select value={roles[u.user_id] ?? "user"} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={u.bloccato ? "outline" : "destructive"}
                        onClick={() => handleBlock(u.user_id, !u.bloccato)}
                        className="gap-1"
                      >
                        {u.bloccato ? <ShieldCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        {u.bloccato ? "Sblocca" : "Blocca"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nessun utente trovato</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminUtenti;
