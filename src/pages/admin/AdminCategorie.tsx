import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CategoriaAnnuncio {
  id: string;
  nome: string;
  label: string;
  icona: string;
  ordine: number;
  richiede_prezzo: boolean;
}

const AdminCategorie = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaAnnuncio | null>(null);
  const [form, setForm] = useState({ nome: "", label: "", icona: "Circle", ordine: 0, richiede_prezzo: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categorie = [], isLoading } = useQuery({
    queryKey: ["categorie_annunci"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorie_annunci").select("*").order("ordine");
      if (error) throw error;
      return (data as CategoriaAnnuncio[]) ?? [];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", label: "", icona: "Circle", ordine: categorie.length + 1, richiede_prezzo: false });
    setOpen(true);
  };

  const openEdit = (c: CategoriaAnnuncio) => {
    setEditing(c);
    setForm({ nome: c.nome, label: c.label, icona: c.icona, ordine: c.ordine, richiede_prezzo: c.richiede_prezzo });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.label.trim()) {
      toast({ title: "Inserisci nome e label", variant: "destructive" });
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      label: form.label.trim(),
      icona: form.icona.trim() || "Circle",
      ordine: form.ordine,
      richiede_prezzo: form.richiede_prezzo,
    };

    console.log("💾 AdminCategorie - salvataggio:", editing ? "UPDATE" : "INSERT", payload);

    if (editing) {
      const { data, error } = await supabase.from("categorie_annunci").update(payload).eq("id", editing.id).select();
      console.log("📊 UPDATE result:", { data, error });
      if (error) {
        toast({ title: "Errore aggiornamento", description: error.message, variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        toast({ title: "Errore", description: "Nessun record aggiornato. Verifica i permessi.", variant: "destructive" });
        return;
      }
      toast({ title: "Categoria aggiornata" });
    } else {
      const { data, error } = await supabase.from("categorie_annunci").insert(payload).select();
      console.log("📊 INSERT result:", { data, error });
      if (error) {
        toast({ title: "Errore creazione", description: error.message, variant: "destructive" });
        return;
      }
      if (!data || data.length === 0) {
        toast({ title: "Errore", description: "Nessun record creato. Verifica i permessi.", variant: "destructive" });
        return;
      }
      toast({ title: "Categoria creata" });
    }

    setOpen(false);
    await queryClient.invalidateQueries({ queryKey: ["categorie_annunci"] });
    await queryClient.invalidateQueries({ queryKey: ["categorie_annunci_home"] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categorie_annunci").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore eliminazione", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Categoria eliminata" });
    await queryClient.invalidateQueries({ queryKey: ["categorie_annunci"] });
    await queryClient.invalidateQueries({ queryKey: ["categorie_annunci_home"] });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-extrabold text-2xl">Gestione Categorie Annunci</h1>
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
                <Label>Nome (identificativo)</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="es. offro_servizio" />
              </div>
              <div>
                <Label>Label (testo visibile)</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="es. Offro servizio" />
              </div>
              <div>
                <Label>Icona (nome Lucide)</Label>
                <Input value={form.icona} onChange={(e) => setForm({ ...form, icona: e.target.value })} placeholder="es. Wrench" />
              </div>
              <div>
                <Label>Ordine</Label>
                <Input type="number" value={form.ordine} onChange={(e) => setForm({ ...form, ordine: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.richiede_prezzo} onCheckedChange={(v) => setForm({ ...form, richiede_prezzo: v })} />
                <Label>Richiede prezzo</Label>
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
                <TableHead>Label</TableHead>
                <TableHead>Icona</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Caricamento...</TableCell></TableRow>
              ) : categorie.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessuna categoria</TableCell></TableRow>
              ) : categorie.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.ordine}</TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.icona}</TableCell>
                  <TableCell>{c.richiede_prezzo ? "Sì" : "No"}</TableCell>
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
