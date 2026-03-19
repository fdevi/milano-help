import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, CheckCircle, Mail } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

interface CategoriaAnnuncio {
  id: string;
  nome: string;
  label: string;
  icona: string;
  ordine: number;
  approvazione_automatica: boolean;
}

interface NotificheConfig {
  attivo: boolean;
  frequenza: string;
  ultimo_invio: string | null;
}

const FREQUENZE = [
  { value: "realtime", label: "Tempo reale (ogni minuto)" },
  { value: "30m", label: "Ogni 30 minuti" },
  { value: "1h", label: "Ogni 1 ora" },
  { value: "3h", label: "Ogni 3 ore" },
  { value: "5h", label: "Ogni 5 ore" },
  { value: "12h", label: "Ogni 12 ore" },
  { value: "24h", label: "Ogni 24 ore" },
];

const AdminApprovazioneCategorie = () => {
  const { toast } = useToast();
  const [categorie, setCategorie] = useState<CategoriaAnnuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modified, setModified] = useState<Record<string, boolean>>({});

  // Notifiche state
  const [notificheConfig, setNotificheConfig] = useState<NotificheConfig>({
    attivo: false,
    frequenza: "30m",
    ultimo_invio: null,
  });
  const [notificheModified, setNotificheModified] = useState(false);
  const [savingNotifiche, setSavingNotifiche] = useState(false);

  useEffect(() => {
    fetchCategorie();
    fetchNotificheConfig();
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

  const fetchNotificheConfig = async () => {
    const { data, error } = await (supabase as any)
      .from("notifiche_approvazione")
      .select("attivo, frequenza, ultimo_invio")
      .eq("id", 1)
      .single();

    if (data && !error) {
      setNotificheConfig({
        attivo: data.attivo,
        frequenza: data.frequenza,
        ultimo_invio: data.ultimo_invio,
      });
    }
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

  const handleSaveNotifiche = async () => {
    setSavingNotifiche(true);
    const { error } = await (supabase as any)
      .from("notifiche_approvazione")
      .update({
        attivo: notificheConfig.attivo,
        frequenza: notificheConfig.frequenza,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      toast({ title: "Errore", description: "Impossibile salvare le impostazioni notifiche.", variant: "destructive" });
    } else {
      toast({ title: "Salvato!", description: "Le impostazioni di notifica sono state aggiornate." });
      setNotificheModified(false);
    }
    setSavingNotifiche(false);
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

            {/* Sezione Notifiche Approvazioni */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-5 mt-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-heading font-semibold text-foreground">📧 Notifiche approvazioni</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Ricevi un'email a <strong>info@milanohelp.it</strong> quando ci sono elementi in attesa di approvazione.
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Invia email quando ci sono elementi in attesa</p>
                  <p className="text-xs text-muted-foreground">Annunci ed eventi in moderazione</p>
                </div>
                <Switch
                  checked={notificheConfig.attivo}
                  onCheckedChange={(val) => {
                    setNotificheConfig((prev) => ({ ...prev, attivo: val }));
                    setNotificheModified(true);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Frequenza di invio</label>
                <Select
                  value={notificheConfig.frequenza}
                  onValueChange={(val) => {
                    setNotificheConfig((prev) => ({ ...prev, frequenza: val }));
                    setNotificheModified(true);
                  }}
                  disabled={!notificheConfig.attivo}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENZE.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {notificheConfig.ultimo_invio && (
                <p className="text-xs text-muted-foreground">
                  Ultima email inviata: {new Date(notificheConfig.ultimo_invio).toLocaleString("it-IT")}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveNotifiche} disabled={!notificheModified || savingNotifiche}>
                  {savingNotifiche ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salva impostazioni
                </Button>
                {!notificheModified && !savingNotifiche && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Nessuna modifica
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminApprovazioneCategorie;
