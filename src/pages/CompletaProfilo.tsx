import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { Heart, Loader2, MapPin, Upload, User, Building2, Store, Camera } from "lucide-react";
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

const TIPO_OPTIONS = [
  { value: "privato", label: "Privato", desc: "Utente normale", icon: User },
  { value: "professionista", label: "Professionista", desc: "Libero professionista, artigiano, ecc.", icon: Building2 },
  { value: "negoziante", label: "Negoziante", desc: "Attività commerciale con sede fisica", icon: Store },
] as const;

const CompletaProfilo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { quartieri } = useQuartieri();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section 1: Tipo utente
  const [tipoAccount, setTipoAccount] = useState("privato");
  const [partitaIva, setPartitaIva] = useState("");
  const [nomeAttivita, setNomeAttivita] = useState("");

  // Section 2: Dati anagrafici
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // Section 3: Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Section 4: Posizione
  const [indirizzo, setIndirizzo] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCap] = useState("");
  const [citta, setCitta] = useState("");
  const [quartiere, setQuartiere] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Section 5: Notifiche & Privacy
  const [notificheEmail, setNotificheEmail] = useState(true);
  const [notifichePush, setNotifichePush] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [profiloPubblico, setProfiloPubblico] = useState(true);
  const [mostraEmail, setMostraEmail] = useState(false);
  const [mostraTelefono, setMostraTelefono] = useState(false);

  // Section 6: Consensi
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [saving, setSaving] = useState(false);

  const { latitude, longitude, loading: geoLoading, requestPosition } = useGeolocation();

  const handleGeoResult = useCallback((data: { quartiere?: string; citta?: string; indirizzo?: string; civico?: string; cap?: string }) => {
    if (data.citta) setCitta(data.citta);
    if (data.indirizzo) setIndirizzo(data.indirizzo);
    if (data.civico) setCivico(data.civico);
    if (data.cap) setCap(data.cap);
    if (data.quartiere) setQuartiere(data.quartiere);
  }, []);

  const { reverseGeocode, loading: geocodeLoading } = useReverseGeocode(handleGeoResult);

  // Handle geolocation result
  useEffect(() => {
    if (latitude && longitude) {
      setLat(latitude);
      setLon(longitude);
      reverseGeocode(latitude, longitude);
      if (leafletMapRef.current) {
        leafletMapRef.current.setView([latitude, longitude], 15);
        updateMarker(latitude, longitude);
      }
    }
  }, [latitude, longitude]);

  // Pre-fill from Google metadata
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata;
      if (meta?.full_name) {
        const parts = meta.full_name.split(" ");
        setNome(parts[0] || "");
        setCognome(parts.slice(1).join(" ") || "");
      }
      if (meta?.name && !meta?.full_name) {
        setNome(meta.name);
      }
      setEmail(user.email || "");
      if (meta?.avatar_url) {
        setAvatarPreview(meta.avatar_url);
      }
    }
  }, [user]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([45.4642, 9.1900], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(clickLat);
        setLon(clickLng);
        updateMarkerOnMap(map, clickLat, clickLng, L);
        reverseGeocode(clickLat, clickLng);
      });

      leafletMapRef.current = map;

      // Resize fix
      setTimeout(() => map.invalidateSize(), 200);
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const updateMarkerOnMap = (map: any, lat: number, lng: number, L: any) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pinIcon = L.divIcon({
        html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="16" cy="39" rx="8" ry="3" fill="rgba(0,0,0,0.15)"/>
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="hsl(var(--primary))"/>
          <circle cx="16" cy="15" r="7" fill="white"/>
        </svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        className: "",
      });
      markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    }
  };

  const updateMarker = (lat: number, lng: number) => {
    if (leafletMapRef.current) {
      import("leaflet").then((L) => {
        updateMarkerOnMap(leafletMapRef.current, lat, lng, L);
      });
    }
  };

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "L'immagine deve essere inferiore a 5MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return avatarPreview; // return Google avatar if no new file
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast({ title: "Errore upload avatar", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isBusinessType = tipoAccount === "professionista" || tipoAccount === "negoziante";
  const canSubmit = nome.trim() && cognome.trim() && privacyAccepted && termsAccepted &&
    (!isBusinessType || (partitaIva.trim() && nomeAttivita.trim()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;

    setSaving(true);

    // Upload avatar if needed
    const avatarUrl = await uploadAvatar();

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
        tipo_account: tipoAccount,
        partita_iva: isBusinessType ? partitaIva.trim() : null,
        nome_attivita: isBusinessType ? nomeAttivita.trim() : null,
        lat: lat,
        lon: lon,
        avatar_url: avatarUrl || null,
        notifiche_email: notificheEmail,
        notifiche_push: notifichePush,
        newsletter: newsletter,
        profilo_pubblico: profiloPubblico,
        mostra_email: mostraEmail,
        mostra_telefono: mostraTelefono,
        email_verificata: true,
        privacy_consensi: {
          privacy_policy: privacyAccepted,
          termini_condizioni: termsAccepted,
          data_consenso: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ title: "Errore nel salvataggio", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Profilo completato!" });
    window.location.href = "/home";
  };

  const SectionTitle = ({ children, number }: { children: string; number: number }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
        {number}
      </div>
      <h2 className="font-heading font-bold text-lg text-foreground">{children}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: Tipo utente */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={1}>Tipo di utente</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TIPO_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const selected = tipoAccount === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setTipoAccount(opt.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-semibold text-sm text-foreground">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {isBusinessType && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <Label htmlFor="partitaIva">Partita IVA *</Label>
                    <Input id="partitaIva" value={partitaIva} onChange={e => setPartitaIva(e.target.value)} placeholder="IT12345678901" />
                  </div>
                  <div>
                    <Label htmlFor="nomeAttivita">Nome attività *</Label>
                    <Input id="nomeAttivita" value={nomeAttivita} onChange={e => setNomeAttivita(e.target.value)} placeholder="La mia attività" />
                  </div>
                </motion.div>
              )}
            </div>

            {/* SECTION 2: Dati anagrafici */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={2}>Dati anagrafici</SectionTitle>
              <div className="space-y-4">
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
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled className="bg-muted cursor-not-allowed" />
                </div>
              </div>
            </div>

            {/* SECTION 3: Avatar */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={3}>Foto profilo</SectionTitle>
              <div className="flex items-center gap-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-muted shrink-0"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Carica foto
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Max 5MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* SECTION 4: Posizione e mappa */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={4}>Posizione</SectionTitle>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Clicca sulla mappa o rileva la posizione</p>
                <Button type="button" variant="outline" size="sm" onClick={requestPosition} disabled={geoLoading || geocodeLoading}>
                  {(geoLoading || geocodeLoading) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MapPin className="w-4 h-4 mr-1" />}
                  Rileva
                </Button>
              </div>
              <div ref={mapRef} className="w-full h-[300px] rounded-lg border overflow-hidden mb-4 z-0" />

              <div className="space-y-3">
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
              </div>
            </div>

            {/* SECTION 5: Notifiche e Privacy */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={5}>Notifiche e privacy</SectionTitle>
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Notifiche</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Ricevi aggiornamenti via email</Label>
                      <Switch checked={notificheEmail} onCheckedChange={setNotificheEmail} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Ricevi notifiche nel browser</Label>
                      <Switch checked={notifichePush} onCheckedChange={setNotifichePush} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Ricevi la newsletter settimanale</Label>
                      <Switch checked={newsletter} onCheckedChange={setNewsletter} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Privacy</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">Rendi il tuo profilo visibile agli altri</Label>
                      <Switch checked={profiloPubblico} onCheckedChange={setProfiloPubblico} />
                    </div>
                    {profiloPubblico && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-4 space-y-3 border-l-2 border-primary/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Mostra la tua email nel profilo</Label>
                          <Switch checked={mostraEmail} onCheckedChange={setMostraEmail} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Mostra il tuo numero nel profilo</Label>
                          <Switch checked={mostraTelefono} onCheckedChange={setMostraTelefono} />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 6: Consensi */}
            <div className="bg-card rounded-xl p-6 shadow-card border">
              <SectionTitle number={6}>Consensi obbligatori</SectionTitle>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(v) => setPrivacyAccepted(v === true)}
                  />
                  <Label htmlFor="privacy" className="text-sm font-normal leading-relaxed cursor-pointer">
                    Accetto la{" "}
                    <Link to="/privacy" target="_blank" className="text-primary underline hover:text-primary/80">
                      Privacy Policy
                    </Link>{" "}
                    *
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(v) => setTermsAccepted(v === true)}
                  />
                  <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                    Accetto i{" "}
                    <Link to="/termini" target="_blank" className="text-primary underline hover:text-primary/80">
                      Termini e Condizioni
                    </Link>{" "}
                    *
                  </Label>
                </div>
              </div>
            </div>

            {/* SECTION 7: Submit */}
            <Button
              variant="hero"
              type="submit"
              className="w-full h-12 text-base"
              disabled={!canSubmit || saving || uploadingAvatar}
            >
              {(saving || uploadingAvatar) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {saving ? "Salvataggio..." : uploadingAvatar ? "Caricamento foto..." : "Completa Registrazione"}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CompletaProfilo;
