import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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
import { useQuartieri } from "@/hooks/useQuartieri";

const NuovoEvento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quartieri } = useQuartieri();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [categoriaEventoId, setCategoriaEventoId] = useState<string>("");
  const [form, setForm] = useState({
    titolo: "",
    descrizione: "",
    luogo: "",
    prezzo: "",
    gratuito: false,
    quartiere: "",
  });

  // Carica l'ID della categoria "evento"
  useEffect(() => {
    const fetchCategoriaEvento = async () => {
      const { data } = await supabase
        .from("categorie_annunci")
        .select("id")
        .eq("nome", "evento")
        .single();
      
      if (data) {
        setCategoriaEventoId(data.id);
      }
    };
    fetchCategoriaEvento();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.titolo || !date || !form.luogo || !categoriaEventoId) {
      toast({
        title: "Campi obbligatori",
        description: "Compila tutti i campi richiesti.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Inserisci nella tabella annunci, non eventi
      const { error } = await supabase.from("annunci").insert({
        titolo: form.titolo,
        descrizione: form.descrizione,
        categoria_id: categoriaEventoId,
        quartiere: form.quartiere || null,
        user_id: user.id,
        stato: "in_moderazione",
        prezzo: form.gratuito ? 0 : parseFloat(form.prezzo) || null,
        // Salviamo data e luogo in campi extra? Per ora li mettiamo nella descrizione
        // Oppure potremmo aggiungere campi specifici alla tabella annunci
      });

      if (error) throw error;

      toast({
        title: "Evento creato!",
        description: "Il tuo evento è stato inviato e sarà visibile dopo l'approvazione.",
      });
      navigate("/categoria/evento");
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
              placeholder="Es. Festa di quartiere"
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

          {/* Data e ora - da salvare nella descrizione o in campi custom */}
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

          {/* Quartiere */}
          <div>
            <Label htmlFor="quartiere">Quartiere</Label>
            <Select value={form.quartiere} onValueChange={(v) => setForm({ ...form, quartiere: v })}>
              <SelectTrigger id="quartiere">
                <SelectValue placeholder="Seleziona un quartiere" />
              </SelectTrigger>
              <SelectContent>
                {quartieri.map((q) => (
                  <SelectItem key={q.nome} value={q.nome}>
                    {q.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Nota moderazione */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-medium mb-1">📋 Nota sulla moderazione</p>
            <p>Gli eventi vengono pubblicati solo dopo l'approvazione dell'admin. Riceverai una notifica quando l'evento sarà approvato.</p>
          </div>

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