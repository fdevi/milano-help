import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Categoria {
  id: string;
  nome: string;
  icona: string;
  ordine: number;
  attiva: boolean;
}

const AdminCategorie = () => {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState({ nome: "", icona: "Circle", ordine: 0 });
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase.from("categorie").select("*").order("ordine");
    setCategorie((data as Categoria[]) ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const openNew = () => { setEditing(null); setForm({ nome: "", icona: "Circle", ordine: categorie.length + 1 }); setOpen(true); };
  const openEdit = (c: Categoria) => { setEditing(c); setForm({ nome: c.nome, icona: c.icona, ordine: c.ordine }); setOpen(true); };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Inserisci un nome", variant: "destructive" }); return; }
    if (editing) {
      const { error } = await supabase.from("categorie").update({ nome: form.nome, icona: form.icona, ordine: form.ordine }).eq("id", editing.id);
      if (error) { toast({ title: "Errore aggiornamento", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Categoria aggiornata" });
    } else {
      const { error } = await supabase.from("categorie").insert({ nome: form.nome, icona: form.icona, ordine: form.ordine });
      if (error) { toast({ title: "Errore creazione", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Categoria creata" });
    }
    setOpen(false);
    await fetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categorie").delete().eq("id", id);
    if (error) { toast({ title: "Errore eliminazione", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Categoria eliminata" });
    await fetch();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Gestione Categorie</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nuova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifica Categoria" : "Nuova Categoria"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>Icona (nome Lucide)</Label>
                <Input value={form.icona} onChange={(e) => setForm({ ...form, icona: e.target.value })} />
              </div>
              <div>
                <Label>Ordine</Label>
                <Input type="number" value={form.ordine} onChange={(e) => setForm({ ...form, ordine: parseInt(e.target.value) || 0 })} />
              </div>
              <Button onClick={handleSave} className="w-full">Salva</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordine</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Icona</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorie.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.ordine}</TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.icona}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCategorie;
