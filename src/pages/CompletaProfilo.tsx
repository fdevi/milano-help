import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuartieri } from "@/hooks/useQuartieri";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CompletaProfilo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quartieri } = useQuartieri();

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [quartiere, setQuartiere] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [saving, setSaving] = useState(false);

  const { latitude, longitude, loading: geoLoading, requestPosition } = useGeolocation();

  const handleGeoResult = useCallback((data: { quartiere?: string; citta?: string; indirizzo?: string; civico?: string; cap?: string }) => {
    if (data.citta && !citta) setCitta(data.citta);
    if (data.indirizzo && !indirizzo) setIndirizzo(data.indirizzo);
    if (data.civico && !civico) setCivico(data.civico);
    if (data.cap && !cap) setCap(data.cap);
    if (data.quartiere && !quartiere) setQuartiere(data.quartiere);
  }, [citta, indirizzo, civico, cap, quartiere]);

  const { reverseGeocode, loading: geocodeLoading } = useReverseGeocode(handleGeoResult);

  useEffect(() => {
    if (latitude && longitude) {
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude]);

  // Pre-fill from Google metadata
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata;
      if (meta?.full_name) {
        const parts = meta.full_name.split(" ");
        if (!nome) setNome(parts[0] || "");
        if (!cognome) setCognome(parts.slice(1).join(" ") || "");
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) {
      toast({ title: "Nome e cognome sono obbligatori", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim(),
        cognome: cognome.trim(),
        telefono: telefono.trim() || null,
        quartiere: quartiere || null,
        indirizzo: indirizzo.trim() || null,
        civico: civico.trim() || null,
        cap: cap.trim() || null,
        citta: citta.trim() || null,
        email_verificata: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Errore nel salvataggio", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profilo completato!" });
    // Force page reload to refresh profileComplete state
    window.location.href = "/home";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl text-foreground mb-1">
              Completa il tuo profilo
            </h1>
            <p className="text-sm text-muted-foreground">
              Inserisci i tuoi dati per completare la registrazione
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-card border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" />
              </div>
              <div>
                <Label htmlFor="cognome">Cognome *</Label>
                <Input id="cognome" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" />
              </div>
            </div>

            <div>
              <Label htmlFor="telefono">Telefono</Label>
              <Input id="telefono" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 333 1234567" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Posizione</Label>
              <Button type="button" variant="outline" size="sm" onClick={requestPosition} disabled={geoLoading || geocodeLoading}>
                {(geoLoading || geocodeLoading) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MapPin className="w-4 h-4 mr-1" />}
                Rileva
              </Button>
            </div>

            <div>
              <Label htmlFor="citta">Città</Label>
              <Input id="citta" value={citta} onChange={e => setCitta(e.target.value)} placeholder="Milano" />
            </div>

            <div>
              <Label>Quartiere</Label>
              <Select value={quartiere} onValueChange={setQuartiere}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona quartiere" />
                </SelectTrigger>
                <SelectContent>
                  {quartieri.map(q => (
                    <SelectItem key={q.nome} value={q.nome}>{q.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="indirizzo">Indirizzo</Label>
                <Input id="indirizzo" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} placeholder="Via Roma" />
              </div>
              <div>
                <Label htmlFor="civico">Civico</Label>
                <Input id="civico" value={civico} onChange={e => setCivico(e.target.value)} placeholder="10" />
              </div>
            </div>

            <div>
              <Label htmlFor="cap">CAP</Label>
              <Input id="cap" value={cap} onChange={e => setCap(e.target.value)} placeholder="20100" />
            </div>

            <Button variant="hero" type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Salvataggio..." : "Completa registrazione"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CompletaProfilo;
