import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AuthLayout from "@/components/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuartieri } from "@/hooks/useQuartieri";

const NuovoServizio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { quartieri, aree } = useQuartieri();

  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [quartiere, setQuartiere] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categorie } = useQuery({
    queryKey: ["categorie-servizi"],
    queryFn: async () => {
      const { data } = await supabase.from("categorie").select("id, nome").eq("attiva", true).order("ordine");
      return data || [];
    },
  });

  const { data: autoApprove } = useQuery({
    queryKey: ["impostazione-servizi-auto"],
    queryFn: async () => {
      const { data } = await supabase.from("impostazioni").select("valore").eq("chiave", "servizi_approvazione_automatica").single();
      return data?.valore === "true";
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !titolo.trim()) return;

    setSaving(true);
    const stato = autoApprove ? "attivo" : "in_attesa";

    const { error } = await supabase.from("servizi").insert({
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      categoria_id: categoriaId || null,
      operatore_id: user.id,
      quartiere: quartiere || null,
      prezzo: prezzo ? parseFloat(prezzo) : null,
      stato,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: stato === "attivo" ? "Servizio pubblicato!" : "Servizio inviato!",
        description: stato === "attivo" ? "Il tuo servizio è ora visibile." : "Il tuo servizio è in attesa di approvazione.",
      });
      navigate("/miei-servizi");
    }
  };

  // Group quartieri by area
  const groupedQuartieri = aree.map((area) => ({
    area,
    items: quartieri.filter((q) => q.area === area),
  }));

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Offri un nuovo servizio</h1>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titolo">Titolo *</Label>
                <Input id="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Lezioni di inglese" maxLength={100} required />
              </div>

              <div>
                <Label htmlFor="descrizione">Descrizione</Label>
                <Textarea id="descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Descrivi il servizio che offri..." maxLength={2000} rows={5} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoriaId} onValueChange={setCategoriaId}>
                    <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
                    <SelectContent>
                      {(categorie || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quartiere</Label>
                  <Select value={quartiere} onValueChange={setQuartiere}>
                    <SelectTrigger><SelectValue placeholder="Seleziona quartiere" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {groupedQuartieri.map((g) => (
                        <div key={g.area}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{g.area}</div>
                          {g.items.map((q) => (
                            <SelectItem key={q.nome} value={q.nome}>{q.nome}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="prezzo">Prezzo (€) — opzionale</Label>
                <Input id="prezzo" type="number" min="0" step="0.01" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="0.00" />
              </div>

              <Button type="submit" disabled={saving || !titolo.trim()} className="w-full">
                {saving ? "Salvataggio..." : "Pubblica servizio"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
};

export default NuovoServizio;
