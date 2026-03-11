import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const ModificaAnnuncio = () => {
  const { id } = useParams<{ id: string }>();
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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [condizione, setCondizione] = useState("");
  const [tipoOperazione, setTipoOperazione] = useState("");

  // Fetch annuncio data
  const { data: annuncio, isLoading: loadingAnnuncio } = useQuery({
    queryKey: ["annuncio-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annunci")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Populate form when annuncio loads
  useEffect(() => {
    if (annuncio && !loaded) {
      setTitolo(annuncio.titolo || "");
      setDescrizione(annuncio.descrizione || "");
      setCategoriaId(annuncio.categoria_id || "");
      setPrezzo(annuncio.prezzo != null ? String(annuncio.prezzo) : "");
      setMostraEmail(annuncio.mostra_email ?? false);
      setMostraTelefono(annuncio.mostra_telefono ?? false);
      setExistingImages((annuncio.immagini as string[])?.filter(Boolean) || []);
      setCondizione((annuncio as any).condizione || "");
      setTipoOperazione((annuncio as any).tipo_operazione || "");
      setLoaded(true);
    }
  }, [annuncio, loaded]);

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

  const totalImages = existingImages.length + newImages.length;

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - totalImages;
    const toAdd = files.slice(0, remaining);
    setNewImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file);
      setNewPreviews((prev) => [...prev, url]);
    });
    e.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newPreviews[index]);
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (annuncioId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newImages) {
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
    if (!user || !id) return;
    if (!categoriaId || !titolo.trim()) {
      toast({ title: "Compila i campi obbligatori", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let allImages = [...existingImages];
      if (newImages.length > 0) {
        const uploadedUrls = await uploadImages(id);
        allImages = [...allImages, ...uploadedUrls];
      }

      const payload: Record<string, any> = {
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        categoria_id: categoriaId,
        prezzo: richiedePrezzo && prezzo ? parseFloat(prezzo) : null,
        mostra_email: mostraEmail,
        mostra_telefono: mostraTelefono,
        immagini: allImages,
        stato: "in_moderazione",
      };

      const { error } = await (supabase as any)
        .from("annunci")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["annunci"] });
      await queryClient.invalidateQueries({ queryKey: ["annuncio-edit", id] });

      toast({
        title: "Annuncio aggiornato!",
        description: "Le modifiche sono state inviate per la moderazione.",
      });
      navigate("/miei-annunci");
    } catch (err: any) {
      toast({
        title: "Errore",
        description: err.message || "Impossibile aggiornare l'annuncio.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAnnuncio) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!annuncio) {
    return (
      <AuthLayout>
        <div className="text-center py-20 text-muted-foreground">
          Annuncio non trovato.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/miei-annunci")}
          className="mb-4 -ml-2 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        <h1 className="text-2xl font-bold mb-6">Modifica annuncio</h1>

        {userQuartiere && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>Zona: <strong className="text-foreground">{userQuartiere}</strong></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <Label>Foto (max {MAX_IMAGES})</Label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={src} alt={`Nuova ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {totalImages < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-xs">Aggiungi</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</>
            ) : (
              "Salva modifiche"
            )}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default ModificaAnnuncio;
