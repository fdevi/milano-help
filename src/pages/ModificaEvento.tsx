import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import AuthLayout from "@/components/AuthLayout";

const CATEGORIE_EVENTI = ["Musica", "Cibo", "Sport", "Cultura", "Sociale", "Mercatino", "Volontariato", "Workshop"];

const ModificaEvento = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingEvento, setLoadingEvento] = useState(true);
  const [date, setDate] = useState<Date>();
  const [form, setForm] = useState({
    titolo: "",
    descrizione: "",
    categoria: "",
    luogo: "",
    prezzo: "",
    gratuito: false,
    max_partecipanti: "",
  });

  // Carica i dati dell'evento
  useEffect(() => {
    const fetchEvento = async () => {
      const { data, error } = await (supabase as any)
        .from('eventi')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast({
          title: "Errore",
          description: "Evento non trovato",
          variant: "destructive",
        });
        navigate("/eventi");
        return;
      }

      // Verifica permessi
      if (!isAdmin && data.organizzatore_id !== user?.id) {
        toast({
          title: "Accesso negato",
          description: "Non hai i permessi per modificare questo evento",
          variant: "destructive",
        });
        navigate("/eventi");
        return;
      }

      setForm({
        titolo: data.titolo,
        descrizione: data.descrizione || "",
        categoria: data.categoria || "",
        luogo: data.luogo,
        prezzo: data.prezzo?.toString() || "",
        gratuito: data.gratuito || false,
        max_partecipanti: data.max_partecipanti?.toString() || "",
      });
      setDate(new Date(data.data));
      setLoadingEvento(false);
    };

    fetchEvento();
  }, [id, user, isAdmin, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.titolo || !date || !form.luogo) {
      toast({
        title: "Campi obbligatori",
        description: "Compila tutti i campi richiesti.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
          titolo: form.titolo,
          descrizione: form.descrizione,
          categoria: form.categoria,
          data: date.toISOString(),
          luogo: form.luogo,
          prezzo: form.gratuito ? 0 : parseFloat(form.prezzo) || null,
          gratuito: form.gratuito,
          max_partecipanti: form.max_partecipanti
            ? parseInt(form.max_partecipanti)
            : null,
        };

      // If not admin, send back to moderation after edit
      if (!isAdmin) {
        updateData.stato = "in_moderazione";
      }

      const { error } = await (supabase as any)
        .from('eventi')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Evento aggiornato!",
        description: "Le modifiche sono state salvate.",
      });
      navigate("/eventi");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'evento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvento) {
    return (
      <AuthLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Caricamento evento...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Modifica evento</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stessi campi del form di creazione */}
          <div>
            <Label htmlFor="titolo">Titolo *</Label>
            <Input
              id="titolo"
              value={form.titolo}
              onChange={(e) => setForm({ ...form, titolo: e.target.value })}
              placeholder="Es. Concerto in piazza"
              required
            />
          </div>

          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              placeholder="Descrivi il tuo evento..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) => setForm({ ...form, categoria: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona una categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIE_EVENTI.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data e ora *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP HH:mm", { locale: it }) : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
                <div className="p-3 border-t">
                  <Input
                    type="time"
                    value={date ? format(date, "HH:mm") : ""}
                    onChange={(e) => {
                      if (date) {
                        const [hours, minutes] = e.target.value.split(":");
                        const newDate = new Date(date);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setDate(newDate);
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="luogo">Luogo *</Label>
            <Input
              id="luogo"
              value={form.luogo}
              onChange={(e) => setForm({ ...form, luogo: e.target.value })}
              placeholder="Es. Piazza Duomo, Milano"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gratuito"
                checked={form.gratuito}
                onChange={(e) => setForm({ ...form, gratuito: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="gratuito">Evento gratuito</Label>
            </div>
            
            {!form.gratuito && (
              <div>
                <Label htmlFor="prezzo">Prezzo (€)</Label>
                <Input
                  id="prezzo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.prezzo}
                  onChange={(e) => setForm({ ...form, prezzo: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="max_partecipanti">Numero massimo partecipanti</Label>
            <Input
              id="max_partecipanti"
              type="number"
              min="1"
              value={form.max_partecipanti}
              onChange={(e) => setForm({ ...form, max_partecipanti: e.target.value })}
              placeholder="Lasciare vuoto per nessun limite"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio in corso...
              </>
            ) : (
              "Salva modifiche"
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default ModificaEvento;