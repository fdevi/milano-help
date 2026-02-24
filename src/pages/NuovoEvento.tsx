import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2, ArrowLeft, X, Image as ImageIcon, AlertCircle, MapPin } from "lucide-react";
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

const MAX_IMAGES = 5;

const NuovoEvento = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>();
  const [categoriaEventoId, setCategoriaEventoId] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState({
    titolo: "",
    descrizione: "",
    luogo: "",
    prezzo: "",
    gratuito: false,
  });

  // Fetch user profile to get quartiere
  const { data: userProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("quartiere")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const userQuartiere = userProfile?.quartiere || "";

  useEffect(() => {
    const fetchCategoriaEvento = async () => {
      const { data } = await supabase
        .from("categorie_annunci")
        .select("id")
        .eq("nome", "evento")
        .single();
      if (data) setCategoriaEventoId(data.id);
    };
    fetchCategoriaEvento();
  }, []);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    setImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => [...prev, url]);
    });
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (annuncioId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${annuncioId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("annunci-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("annunci-images").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.titolo || !date || !form.luogo || !categoriaEventoId) {
      toast({ title: "Campi obbligatori", description: "Compila tutti i campi richiesti.", variant: "destructive" });
      return;
    }
    if (!userQuartiere) {
      toast({
        title: "Zona non impostata",
        description: "Imposta la tua zona di appartenenza nel Profilo prima di pubblicare.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dataFormattata = date ? format(date, "dd/MM/yyyy HH:mm", { locale: it }) : "";
      const descrizioneCompleta = `${form.descrizione}\n\n📅 Data: ${dataFormattata}\n📍 Luogo: ${form.luogo}`;

      const { data: annuncio, error } = await supabase.from("annunci").insert({
        titolo: form.titolo,
        descrizione: descrizioneCompleta,
        categoria_id: categoriaEventoId,
        quartiere: userQuartiere,
        user_id: user.id,
        stato: "in_moderazione",
        prezzo: form.gratuito ? 0 : parseFloat(form.prezzo) || null,
      }).select("id").single();

      if (error) throw error;

      if (images.length > 0) {
        const urls = await uploadImages(annuncio.id);
        await supabase.from("annunci").update({ immagini: urls }).eq("id", annuncio.id);
      }

      toast({
        title: "Evento creato!",
        description: "Il tuo evento è stato inviato e sarà visibile dopo l'approvazione.",
      });
      navigate("/categoria/evento");
    } catch (error: any) {
      toast({ title: "Errore", description: error.message || "Impossibile creare l'evento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4 -ml-2 gap-1">
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        <h1 className="text-2xl font-bold mb-6">Crea un nuovo evento</h1>

        {/* Zona info banner */}
        {userQuartiere ? (
          <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>L'evento verrà pubblicato nella zona: <strong className="text-foreground">{userQuartiere}</strong></span>
            <Link to="/profilo" className="ml-auto text-primary underline text-xs whitespace-nowrap">Modifica</Link>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Devi impostare la tua zona di appartenenza prima di pubblicare.</span>
            <Link to="/profilo" className="ml-auto text-primary underline text-xs whitespace-nowrap">Vai al Profilo</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titolo */}
          <div>
            <Label htmlFor="titolo">Titolo *</Label>
            <Input id="titolo" value={form.titolo} onChange={(e) => setForm({ ...form, titolo: e.target.value })} placeholder="Es. Festa di quartiere" required />
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea id="descrizione" value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} placeholder="Descrivi il tuo evento..." rows={4} />
          </div>

          {/* Data e ora */}
          <div>
            <Label>Data e ora *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP HH:mm", { locale: it }) : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                <div className="p-3 border-t">
                  <Input type="time" onChange={(e) => {
                    if (date) {
                      const [hours, minutes] = e.target.value.split(":");
                      const newDate = new Date(date);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      setDate(newDate);
                    }
                  }} />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Luogo */}
          <div>
            <Label htmlFor="luogo">Luogo *</Label>
            <Input id="luogo" value={form.luogo} onChange={(e) => setForm({ ...form, luogo: e.target.value })} placeholder="Es. Piazza Duomo, Milano" required />
          </div>

          {/* Prezzo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="gratuito" checked={form.gratuito} onChange={(e) => setForm({ ...form, gratuito: e.target.checked })} className="rounded border-gray-300" />
              <Label htmlFor="gratuito">Evento gratuito</Label>
            </div>
            {!form.gratuito && (
              <div>
                <Label htmlFor="prezzo">Prezzo (€)</Label>
                <Input id="prezzo" type="number" step="0.01" min="0" value={form.prezzo} onChange={(e) => setForm({ ...form, prezzo: e.target.value })} placeholder="0.00" />
              </div>
            )}
          </div>

          {/* Upload foto */}
          <div>
            <Label>Foto (max {MAX_IMAGES})</Label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={src} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs">Aggiungi</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
            <p className="text-xs text-muted-foreground mt-1">Formati supportati: JPG, PNG, GIF. Max 5 foto.</p>
          </div>

          {/* Nota moderazione */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-medium mb-1">📋 Nota sulla moderazione</p>
            <p>Gli eventi vengono pubblicati solo dopo l'approvazione dell'admin. Riceverai una notifica quando l'evento sarà approvato.</p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !userQuartiere}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Invio in corso...</>
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
