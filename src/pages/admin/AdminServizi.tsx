import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Trash2 } from "lucide-react";

interface Servizio {
  id: string;
  titolo: string;
  descrizione: string | null;
  stato: string;
  created_at: string;
  categoria_id: string | null;
  operatore_id: string;
}

const statusColors: Record<string, string> = {
  attivo: "bg-primary/10 text-primary",
  in_attesa: "bg-secondary/10 text-secondary",
  rifiutato: "bg-destructive/10 text-destructive",
  disattivato: "bg-muted text-muted-foreground",
};

const AdminServizi = () => {
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [categorie, setCategorie] = useState<{ id: string; nome: string }[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [filterStato, setFilterStato] = useState("");
  const { toast } = useToast();

  const fetchAll = async () => {
    const [s, c] = await Promise.all([
      supabase.from("servizi").select("*").order("created_at", { ascending: false }),
      supabase.from("categorie").select("id, nome"),
    ]);
    setServizi((s.data as Servizio[]) ?? []);
    setCategorie(c.data ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStato = async (id: string, stato: string) => {
    await supabase.from("servizi").update({ stato }).eq("id", id);
    toast({ title: `Servizio ${stato}` });
    fetchAll();
  };

  const deleteServizio = async (id: string) => {
    await supabase.from("servizi").delete().eq("id", id);
    toast({ title: "Servizio eliminato" });
    fetchAll();
  };

  const catName = (id: string | null) => categorie.find((c) => c.id === id)?.nome ?? "—";

  const filtered = servizi.filter((s) => {
    if (filterCat && s.categoria_id !== filterCat) return false;
    if (filterStato && s.stato !== filterStato) return false;
    return true;
  });

  return (
    <AdminLayout>
      <h1 className="font-heading font-extrabold text-2xl mb-6">Gestione Servizi</h1>

      <div className="flex gap-3 mb-4">
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStato} onValueChange={(v) => setFilterStato(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Stato" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="attivo">Attivo</SelectItem>
            <SelectItem value="in_attesa">In attesa</SelectItem>
            <SelectItem value="rifiutato">Rifiutato</SelectItem>
            <SelectItem value="disattivato">Disattivato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.titolo}</TableCell>
                  <TableCell className="text-sm">{catName(s.categoria_id)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[s.stato]}>{s.stato.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("it-IT")}</TableCell>
                  <TableCell className="flex gap-1">
                    {s.stato === "in_attesa" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStato(s.id, "attivo")} className="gap-1">
                          <Check className="w-3 h-3" /> Approva
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStato(s.id, "rifiutato")} className="gap-1">
                          <X className="w-3 h-3" /> Rifiuta
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteServizio(s.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessun servizio trovato</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminServizi;
