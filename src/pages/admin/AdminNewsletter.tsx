import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Download, RefreshCw, Search, Mail } from "lucide-react";

interface Iscritto {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  email: string | null;
  created_at: string;
}

const AdminNewsletter = () => {
  const [iscritti, setIscritti] = useState<Iscritto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchIscritti = () => {
    setLoading(true);
    setError(null);
    supabase
      .from("profiles")
      .select("user_id, nome, cognome, email, created_at")
      .eq("newsletter", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          setError(error.message);
          return;
        }
        setIscritti((data as Iscritto[]) ?? []);
      })
      .then(undefined, (e: unknown) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Errore di caricamento");
      });
  };

  useEffect(() => {
    fetchIscritti();
  }, []);

  const exportCSV = () => {
    const header = "Nome,Cognome,Email,Iscritto dal\n";
    const rows = filtered.map((r) =>
      `"${(r.nome ?? "").replace(/"/g, '""')}","${(r.cognome ?? "").replace(/"/g, '""')}","${(r.email ?? "").replace(/"/g, '""')}","${r.created_at}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter_iscritti_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = iscritti.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.nome?.toLowerCase().includes(s) ||
        r.cognome?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s))
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Iscritti alla Newsletter</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchIscritti} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> Esporta CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nome, cognome o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive px-4">
              <p className="text-sm font-medium">Errore: {error}</p>
              <Button variant="outline" onClick={fetchIscritti} className="mt-4">
                Riprova
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cognome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Iscritto dal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Caricamento...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>Nessun iscritto alla newsletter.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">{r.nome ?? "—"}</TableCell>
                        <TableCell>{r.cognome ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("it-IT", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminNewsletter;
