import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface CategoriaAnnuncio {
  id: string;
  nome: string;
  label: string;
  icona: string;
  ordine: number;
  approvazione_automatica: boolean;
}

const AdminApprovazioneCategorie = () => {
  const { toast } = useToast();
  const [categorie, setCategorie] = useState<CategoriaAnnuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCategorie();
  }, []);

  const fetchCategorie = async () => {
    const { data, error } = await (supabase as any)
      .from("categorie_annunci")
      .select("id, nome, label, icona, ordine, approvazione_automatica")
      .order("ordine", { ascending: true });

    if (error) {
      toast({ title: "Errore", description: "Impossibile caricare le categorie.", variant: "destructive" });
      return;
    }
    setCategorie(data || []);
    setLoading(false);
  };

  const handleToggle = (id: string, value: boolean) => {
    setCategorie((prev) =>
      prev.map((c) => (c.id === id ? { ...c, approvazione_automatica: value } : c))
    );
    setModified((prev) => ({ ...prev, [id]: true }));
  };

  const handleSave = async () => {
    setSaving(true);
    const toUpdate = categorie.filter((c) => modified[c.id]);

    for (const cat of toUpdate) {
      const { error } = await supabase
        .from("categorie_annunci")
        .update({ approvazione_automatica: cat.approvazione_automatica } as any)
        .eq("id", cat.id);

      if (error) {
        toast({ title: "Errore", description: `Errore per "${cat.label}": ${error.message}`, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setModified({});
    setSaving(false);
    toast({ title: "Salvato!", description: "Le impostazioni di approvazione automatica sono state aggiornate." });
  };

  const hasChanges = Object.keys(modified).length > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Approvazione Categorie</h1>
          <p className="text-muted-foreground mt-1">
            Configura quali categorie di annunci vengono approvate automaticamente senza moderazione.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card">
              <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-b border-border bg-muted/50 text-sm font-medium text-muted-foreground">
                <span>Categoria</span>
                <span>Auto-approvazione</span>
              </div>
              {categorie.map((cat) => (
                <div
                  key={cat.id}
                  className="grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3 border-b last:border-b-0 border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icona}</span>
                    <div>
                      <p className="font-medium text-foreground">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.nome}</p>
                    </div>
                  </div>
                  <Switch
                    checked={cat.approvazione_automatica}
                    onCheckedChange={(val) => handleToggle(cat.id, val)}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salva modifiche
              </Button>
              {!hasChanges && !saving && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Nessuna modifica in sospeso
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminApprovazioneCategorie;
