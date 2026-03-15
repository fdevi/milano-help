import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTipoAccount } from "@/hooks/useTipoAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, X, Image as ImageIcon, MapPin } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

const MAX_IMAGES = 5;

const ModificaAnnuncio = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isProfessionista, isNegoziante } = useTipoAccount();

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
  const [contenutoSpeciale, setContenutoSpeciale] = useState("");
  const [via, setVia] = useState("");
  const [civico, setCivico] = useState("");
  const [citta, setCitta] = useState("");
  const [cap, setCap] = useState("");
  const [sitoWeb, setSitoWeb] = useState("");
  const [orariApertura, setOrariApertura] = useState("");

  const { data: annuncio, isLoading: loadingAnnuncio } = useQuery({
    queryKey: ["annuncio-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("annunci").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

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
      setContenutoSpeciale((annuncio as any).contenuto_speciale || "");
      setVia((annuncio as any).via || "");
      setCivico((annuncio as any).civico || "");
      setCitta((annuncio as any).citta || "");
      setCap((annuncio as any).cap || "");
      setSitoWeb((annuncio as any).sito_web || "");
      setOrariApertura((annuncio as any).orari_apertura || "");
      setLoaded(true);
    }
  }, [annuncio, loaded]);

  const { data: userProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("quartiere").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const userQuartiere = userProfile?.quartiere || "";

  const { data: categorie = [] } = useQuery({
    queryKey: ["categorie_annunci"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorie_annunci").select("id, nome, label, icona, richiede_prezzo").neq("nome", "evento").order("ordine");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const selectedCat = categorie.find((c) => c.id === categoriaId);
  const richiedePrezzo = selectedCat?.richiede_prezzo ?? false;
  const isInVendita = selectedCat?.nome === "in_vendita" || selectedCat?.label?.toLowerCase().includes("vendita");
  const isImmobili = selectedCat?.nome === "immobili" || selectedCat?.label?.toLowerCase().includes("immobil");
  const isSpecialCat = selectedCat?.nome === "Professionisti" || selectedCat?.nome === "negozi_di_quartiere";

  const filteredCategorie = categorie.filter((c) => {
    if (c.nome === "Professionisti") return isProfessionista;
    if (c.nome === "negozi_di_quartiere") return isNegoziante;
    return true;
  });

  const totalImages = existingImages.length + newImages.length;

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - totalImages;
    const toAdd = files.slice(0, remaining);
    setNewImages((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => { setNewPreviews((prev) => [...prev, URL.createObjectURL(file)]); });
    e.target.value = "";
  };

  const removeExistingImage = (index: number) => setExistingImages((prev) => prev.filter((_, i) => i !== index));
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

  const geocodeAddress = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    if (!via && !citta) return null;
    const query = `${via}${civico ? ` ${civico}` : ''}, ${citta}${cap ? ` ${cap}` : ''}, Italia`;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, { headers: { "Accept-Language": "it" } });
      const data = await response.json();
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) { console.error("Geocoding error:", e); }
    return null;
  }, [via, civico, citta, cap]);

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

      let coords: { lat: number; lon: number } | null = null;
      if (isSpecialCat) coords = await geocodeAddress();

      const payload: Record<string, any> = {
        titolo: titolo.trim(),
        descrizione: descrizione.trim() || null,
        categoria_id: categoriaId,
        prezzo: richiedePrezzo && prezzo ? parseFloat(prezzo) : null,
        mostra_email: mostraEmail,
        mostra_telefono: mostraTelefono,
        immagini: allImages,
        stato: "in_moderazione",
        condizione: isInVendita && condizione ? condizione : null,
        tipo_operazione: isImmobili && tipoOperazione ? tipoOperazione : null,
        contenuto_speciale: isSpecialCat && contenutoSpeciale.trim() ? contenutoSpeciale.trim() : null,
        via: isSpecialCat ? via.trim() || null : null,
        civico: isSpecialCat ? civico.trim() || null : null,
        citta: isSpecialCat ? citta.trim() || null : null,
        cap: isSpecialCat ? cap.trim() || null : null,
        sito_web: isSpecialCat && sitoWeb.trim() ? sitoWeb.trim() : null,
        orari_apertura: isSpecialCat && orariApertura.trim() ? orariApertura.trim() : null,
      };
      if (coords) { payload.lat = coords.lat; payload.lon = coords.lon; }

      const { error } = await (supabase as any).from("annunci").update(payload).eq("id", id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["annunci"] });
      await queryClient.invalidateQueries({ queryKey: ["annuncio-edit", id] });

      toast({ title: "Annuncio aggiornato!", description: "Le modifiche sono state inviate per la moderazione." });
      navigate("/miei-annunci");
    } catch (err: any) {
      toast({ title: "Errore", description: err.message || "Impossibile aggiornare l'annuncio.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAnnuncio) {
    return <AuthLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AuthLayout>;
  }

  if (!annuncio) {
    return <AuthLayout><div className="text-center py-20 text-muted-foreground">Annuncio non trovato.</div></AuthLayout>;
  }

  return (
    <AuthLayout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/miei-annunci")} className="mb-4 -ml-2 gap-1">
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        <h1 className="text-2xl font-bold mb-6">{isSpecialCat ? "🏪 Modifica vetrina" : "Modifica annuncio"}</h1>

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
              <SelectTrigger id="categoria"><SelectValue placeholder="Seleziona una categoria" /></SelectTrigger>
              <SelectContent>{filteredCategorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="titolo">{isSpecialCat ? "Nome attività *" : "Titolo *"}</Label>
            <Input id="titolo" value={titolo} onChange={(e) => setTitolo(e.target.value)}
              placeholder={isSpecialCat ? "Es. Panetteria della Piazza" : "Es. Offro lezioni di italiano"} maxLength={100} required />
          </div>

          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea id="descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Descrivi..." rows={4} />
          </div>

          {isSpecialCat && (
            <div className="space-y-4 p-4 rounded-xl border bg-muted/30">
              <h3 className="font-heading font-bold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4" /> Indirizzo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Via *</Label><Input value={via} onChange={(e) => setVia(e.target.value)} placeholder="Via Roma" /></div>
                <div><Label>N. Civico</Label><Input value={civico} onChange={(e) => setCivico(e.target.value)} placeholder="42" /></div>
                <div><Label>Città *</Label><Input value={citta} onChange={(e) => setCitta(e.target.value)} placeholder="Milano" /></div>
                <div><Label>CAP</Label><Input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="20100" maxLength={5} /></div>
              </div>
            </div>
          )}

          {isSpecialCat && (
            <div>
              <Label>🕐 Orari di apertura</Label>
              <Textarea value={orariApertura} onChange={(e) => setOrariApertura(e.target.value)} placeholder={"Lun-Ven: 8:00 - 19:00\nSab: 9:00 - 13:00"} rows={3} />
            </div>
          )}

          {isSpecialCat && (
            <div>
              <Label>🌐 Sito web</Label>
              <Input value={sitoWeb} onChange={(e) => setSitoWeb(e.target.value)} placeholder="www.example.com" />
            </div>
          )}

          {isSpecialCat && (
            <div>
              <Label>📋 Menù / Listino</Label>
              <Textarea value={contenutoSpeciale} onChange={(e) => setContenutoSpeciale(e.target.value)} placeholder="Listino prezzi, offerte..." rows={5} />
            </div>
          )}

          {richiedePrezzo && (
            <div><Label>Prezzo (€)</Label><Input type="number" step="0.01" min="0" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="0.00" /></div>
          )}

          {isInVendita && (
            <div>
              <Label>Condizione *</Label>
              <RadioGroup value={condizione} onValueChange={setCondizione} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="nuovo" id="cond-nuovo" /><Label htmlFor="cond-nuovo" className="font-normal">Nuovo</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="usato" id="cond-usato" /><Label htmlFor="cond-usato" className="font-normal">Usato</Label></div>
              </RadioGroup>
            </div>
          )}

          {isImmobili && (
            <div>
              <Label>Tipo operazione *</Label>
              <RadioGroup value={tipoOperazione} onValueChange={setTipoOperazione} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2"><RadioGroupItem value="vendita" id="op-vendita" /><Label htmlFor="op-vendita" className="font-normal">Vendita</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="locazione" id="op-locazione" /><Label htmlFor="op-locazione" className="font-normal">Locazione</Label></div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label>Contatti visibili</Label>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mostraEmail" checked={mostraEmail} onChange={(e) => setMostraEmail(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="mostraEmail" className="text-sm font-normal">Mostra email</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="mostraTelefono" checked={mostraTelefono} onChange={(e) => setMostraTelefono(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="mostraTelefono" className="text-sm font-normal">Mostra telefono</Label>
            </div>
          </div>

          <div>
            <Label>Foto (max {MAX_IMAGES})</Label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative group aspect-square rounded-md overflow-hidden border">
                  <img src={src} alt={`Nuova ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                </div>
              ))}
              {totalImages < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImageIcon className="w-5 h-5" /><span className="text-xs">Aggiungi</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageAdd} className="hidden" />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</> : "Salva modifiche"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default ModificaAnnuncio;
