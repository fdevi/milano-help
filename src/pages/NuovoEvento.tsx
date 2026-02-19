import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
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

const NuovoEvento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
      const { error } = await supabase.from("eventi").insert({
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
        organizzatore_id: user.id,
        stato: "in_moderazione", // ← AGGIUNTO: stato di default
      });

      if (error) throw error;

      toast({
        title: "Evento creato!",
        description: "Il tuo evento è stato inviato e sarà visibile dopo l'approvazione dell'admin.",
      });
      navigate("/eventi");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'evento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        {/* Bottone Indietro */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4 -ml-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        <h1 className="text-2xl font-bold mb-6">Crea un nuovo evento</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titolo */}
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

          {/* Descrizione */}
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

          {/* Categoria */}
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

          {/* Data */}
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

          {/* Luogo */}
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

          {/* Prezzo */}
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

          {/* Max partecipanti */}
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

          {/* Nota moderazione */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-medium mb-1">📋 Nota sulla moderazione</p>
            <p>Gli eventi vengono pubblicati solo dopo l'approvazione dell'admin. Riceverai una notifica quando l'evento sarà approvato.</p>
          </div>

          {/* Bottone submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Invio in corso...
              </>
            ) : (
              "Crea evento"
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default NuovoEvento;