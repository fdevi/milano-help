import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQuartieri } from "@/hooks/useQuartieri";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, X, Loader2 } from "lucide-react";

const MAX_IMAGES = 5;

const NuovoAnnuncio = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { quartieri } = useQuartieri();

  const [categoriaId, setCategoriaId] = useState("");
  const [titolo, setTitolo] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [quartiere, setQuartiere] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: categorie = [] } = useQuery({
    queryKey: ["categorie_annunci"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("id, nome, label, icona, richiede_prezzo")
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
      const { error } = await supabase.storage
        .from("annunci-images")
        .upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("annunci-images")
        .getPublicUrl(path);
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

    setSubmitting(true);
    try {
      // Create annuncio first
      const payload: Record<string, unknown> = {
        user_id: user.id,
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        categoria_id: categoriaId,
        quartiere: quartiere || null,
        stato: "in_moderazione",
        prezzo: richiedePrezzo && prezzo ? parseFloat(prezzo) : null,
      };

      const { data: annuncio, error } = await supabase
        .from("annunci")
        .insert([payload as any])
        .select("id")
        .single();
      if (error) throw error;

      // Upload images
      if (images.length > 0) {
        const urls = await uploadImages(annuncio.id);
        await supabase
          .from("annunci")
          .update({ immagini: urls })
          .eq("id", annuncio.id);
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Nuovo annuncio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorie.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titolo */}
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="prezzo">Prezzo (€)</Label>
                  <Input
                    id="prezzo"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prezzo}
                    onChange={(e) => setPrezzo(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Quartiere */}
              <div className="space-y-2">
                <Label htmlFor="quartiere">Quartiere</Label>
                <Select value={quartiere} onValueChange={setQuartiere}>
                  <SelectTrigger id="quartiere">
                    <SelectValue placeholder="Seleziona quartiere" />
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

              {/* Upload foto */}
              <div className="space-y-2">
                <Label>Foto (max {MAX_IMAGES})</Label>
                <div className="flex flex-wrap gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1">Aggiungi</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageAdd}
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Pubblica annuncio"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default NuovoAnnuncio;
