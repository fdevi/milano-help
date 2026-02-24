import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  ArrowLeft,
  Loader2,
  X,
  Image as ImageIcon,
  AlertCircle,
  MapPin,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Link } from "react-router-dom";

const MAX_IMAGES = 5;

const NuovoAnnuncio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categoriaId, setCategoriaId] = useState("");
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [mostraEmail, setMostraEmail] = useState(false);
  const [mostraTelefono, setMostraTelefono] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const { data: categorie = [] } = useQuery({
    queryKey: ["categorie_annunci"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("id, nome, label, icona, richiede_prezzo")
        .neq("nome", "evento")
        .order("ordine");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const selectedCat = categorie.find((c) => c.id === categoriaId);
  const richiedePrezzo = selectedCat?.richiede_prezzo ?? false;

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
    if (!categoriaId || !titolo.trim()) {
      toast({ title: "Compila i campi obbligatori", variant: "destructive" });
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

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        user_id: user.id,
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        categoria_id: categoriaId,
        quartiere: userQuartiere,
        stato: "in_moderazione",
        prezzo: richiedePrezzo && prezzo ? parseFloat(prezzo) : null,
        mostra_email: mostraEmail,
        mostra_telefono: mostraTelefono,
      };

      const { data: annuncio, error } = await (supabase as any)
        .from("annunci")
        .insert([payload])
        .select("id")
        .single();
      if (error) throw error;

      if (images.length > 0) {
        const urls = await uploadImages(annuncio.id);
        await supabase.from("annunci").update({ immagini: urls }).eq("id", annuncio.id);
      }

      await queryClient.invalidateQueries({ queryKey: ["categorie_annunci"] });
      await queryClient.invalidateQueries({ queryKey: ["annunci"] });

      toast({
        title: "Annuncio inviato!",
        description: "Il tuo annuncio è in fase di moderazione.",
      });
      navigate("/miei-annunci");
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Impossibile creare l'annuncio.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

        <h1 className="text-2xl font-bold mb-6">Crea un nuovo annuncio</h1>

        {/* Zona info banner */}
        {userQuartiere ? (
          <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>L'annuncio verrà pubblicato nella zona: <strong className="text-foreground">{userQuartiere}</strong></span>
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
          {/* Categoria */}
          <div>
            <Label htmlFor="categoria">Categoria *</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Seleziona una categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorie.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titolo */}
          <div>
            <Label htmlFor="titolo">Titolo *</Label>
            <Input
              id="titolo"
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder="Es. Offro lezioni di italiano"
              maxLength={100}
              required
            />
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Descrivi il tuo annuncio..."
              rows={4}
            />
          </div>

          {/* Prezzo (condizionale) */}
          {richiedePrezzo && (
            <div>
              <Label htmlFor="prezzo">Prezzo (€)</Label>
              <Input
                id="prezzo"
                type="number"
                step="0.01"
                min="0"
                value={prezzo}
                onChange={(e) => setPrezzo(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Contatti */}
          <div className="space-y-2">
            <Label>Contatti visibili nell'annuncio</Label>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mostraEmail" checked={mostraEmail} onChange={(e) => setMostraEmail(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="mostraEmail" className="text-sm font-normal">Mostra la mia email</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mostraTelefono" checked={mostraTelefono} onChange={(e) => setMostraTelefono(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="mostraTelefono" className="text-sm font-normal">Mostra il mio telefono</Label>
            </div>
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
          </div>

          <Button type="submit" className="w-full" disabled={submitting || !userQuartiere}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Invio in corso...</>
            ) : (
              "Pubblica annuncio"
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default NuovoAnnuncio;
