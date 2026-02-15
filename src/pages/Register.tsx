import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Heart, Eye, EyeOff, MapPin, User, Shield, Check, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mock quartieri di Milano
const QUARTIERI_MILANO = [
  { nome: "Navigli", municipio: 6 }, { nome: "Brera", municipio: 1 }, { nome: "Isola", municipio: 9 },
  { nome: "Porta Romana", municipio: 4 }, { nome: "Città Studi", municipio: 3 }, { nome: "Lambrate", municipio: 3 },
  { nome: "Porta Venezia", municipio: 1 }, { nome: "Porta Garibaldi", municipio: 9 }, { nome: "Porta Genova", municipio: 6 },
  { nome: "Porta Ticinese", municipio: 6 }, { nome: "San Siro", municipio: 7 }, { nome: "Quarto Oggiaro", municipio: 8 },
  { nome: "Bovisa", municipio: 9 }, { nome: "Bicocca", municipio: 9 }, { nome: "Niguarda", municipio: 9 },
  { nome: "Affori", municipio: 9 }, { nome: "Greco", municipio: 2 }, { nome: "Precotto", municipio: 2 },
  { nome: "Turro", municipio: 2 }, { nome: "Gorla", municipio: 2 }, { nome: "Crescenzago", municipio: 2 },
  { nome: "Loreto", municipio: 3 }, { nome: "Piola", municipio: 3 }, { nome: "Corsica", municipio: 4 },
  { nome: "Corvetto", municipio: 4 }, { nome: "Rogoredo", municipio: 4 }, { nome: "Gratosoglio", municipio: 5 },
  { nome: "Chiesa Rossa", municipio: 5 }, { nome: "Barona", municipio: 6 }, { nome: "Lorenteggio", municipio: 6 },
  { nome: "Baggio", municipio: 7 }, { nome: "De Angeli", municipio: 7 }, { nome: "Wagner", municipio: 7 },
  { nome: "Sempione", municipio: 8 }, { nome: "QT8", municipio: 8 }, { nome: "Gallaratese", municipio: 8 },
  { nome: "Certosa", municipio: 8 }, { nome: "Villapizzone", municipio: 8 }, { nome: "Dergano", municipio: 9 },
  { nome: "Maciachini", municipio: 9 }, { nome: "Centrale", municipio: 2 }, { nome: "Repubblica", municipio: 1 },
  { nome: "Duomo", municipio: 1 }, { nome: "Cadorna", municipio: 1 }, { nome: "Moscova", municipio: 1 },
  { nome: "Garibaldi", municipio: 9 }, { nome: "Sarpi", municipio: 1 }, { nome: "Chinatown", municipio: 1 },
];

const TOTAL_STEPS = 5;

const Register = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [form, setForm] = useState({
    email: "", username: "", password: "", confirmPassword: "",
    nome: "", cognome: "", dataNascita: "", sesso: "", telefono: "",
    quartiere: "", citta: "", indirizzo: "", civico: "", cap: "",
    tipoAccount: "",
    termini: false, privacy: false,
    notificheEmail: true, notifichePush: true, newsletter: false,
    profiloPubblico: true, mostraEmail: false, mostraTelefono: false,
  });

  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [quartiereQuery, setQuartiereQuery] = useState(form.quartiere);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [step3Attempted, setStep3Attempted] = useState(false);
  const [mapCoords, setMapCoords] = useState<[number, number]>([45.4642, 9.1900]);
  const quartiereRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse geocoding helper
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true);
    setGeoError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { "Accept-Language": "it" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const quartiere = addr.quarter || addr.neighbourhood || addr.borough || addr.city_district || "";
      if (quartiere) {
        setQuartiereQuery(quartiere);
        updateForm("quartiere", quartiere);
      } else {
        setQuartiereQuery("");
        updateForm("quartiere", "");
        setGeoError("Quartiere non rilevato, inserisci manualmente.");
      }
      const citta = addr.city || addr.town || addr.village || addr.municipality || "";
      updateForm("citta", citta);
      updateForm("indirizzo", addr.road || "");
      updateForm("civico", addr.house_number || "");
      updateForm("cap", addr.postcode || "");
      if (!addr.road && !addr.postcode) {
        setGeoError("Indirizzo non trovato per questa posizione.");
      }
    } catch {
      setGeoError("Errore nel recupero dell'indirizzo.");
    }
    setReverseLoading(false);
  }, []);

  // Leaflet map with draggable marker
  useEffect(() => {
    if (step !== 3 || !mapRef.current) return;
    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }
    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(mapCoords, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    const icon = L.divIcon({ className: "", html: '<div style="width:24px;height:24px;background:#e11d48;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:grab"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
    const marker = L.marker(mapCoords, { icon, draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setMapCoords([pos.lat, pos.lng]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reverseGeocode(pos.lat, pos.lng);
      }, 400);
    });
    markerRef.current = marker;
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, [step, mapCoords, reverseGeocode]);

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const capValid = /^201\d{2}$/.test(form.cap);
  const step3Valid = form.quartiere.trim() !== "" && form.indirizzo.trim() !== "" && form.civico.trim() !== "" && capValid;

  const filteredQuartieri = quartiereQuery.trim().length > 0
    ? QUARTIERI_MILANO.filter(q => q.nome.toLowerCase().includes(quartiereQuery.toLowerCase()) || `${q.nome} (Municipio ${q.municipio})`.toLowerCase().includes(quartiereQuery.toLowerCase())).slice(0, 6)
    : [];

  const handleQuartiereChange = (value: string) => {
    setQuartiereQuery(value);
    updateForm("quartiere", value);
    setShowSuggestions(true);
  };

  const selectQuartiere = (nome: string) => {
    setQuartiereQuery(nome);
    updateForm("quartiere", nome);
    setShowSuggestions(false);
  };

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("La geolocalizzazione non è supportata dal tuo browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCoords([latitude, longitude]);
        await reverseGeocode(latitude, longitude);
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permesso negato. Puoi inserire i dati manualmente.");
        } else {
          setGeoError("Impossibile rilevare la posizione. Inserisci i dati manualmente.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  const next = () => {
    if (step === 3) {
      setStep3Attempted(true);
      if (!step3Valid) return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const prev = () => step > 1 && setStep(step - 1);

  const passwordValid = form.password.length >= 8
    && /[A-Z]/.test(form.password)
    && /[!?%$&@#]/.test(form.password);

  const stepTitles = [
    "Credenziali di accesso",
    "Informazioni personali",
    "Localizzazione",
    "Tipo di account",
    "Termini e preferenze",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl text-foreground mb-1">Crea il tuo account</h1>
            <p className="text-sm text-muted-foreground">{stepTitles[step - 1]}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {/* Steps */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="bg-card rounded-xl p-6 shadow-card border"
            >
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="la-tua@email.com" value={form.email} onChange={e => updateForm("email", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input id="username" placeholder="Scegli un username" value={form.username} onChange={e => updateForm("username", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min 8 caratteri, 1 maiuscola, 1 simbolo"
                        value={form.password}
                        onChange={e => updateForm("password", e.target.value)}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className={form.password.length >= 8 ? "text-primary" : "text-destructive"}>
                          {form.password.length >= 8 ? "✓" : "✗"} Minimo 8 caratteri
                        </div>
                        <div className={/[A-Z]/.test(form.password) ? "text-primary" : "text-destructive"}>
                          {/[A-Z]/.test(form.password) ? "✓" : "✗"} Una lettera maiuscola
                        </div>
                        <div className={/[!?%$&@#]/.test(form.password) ? "text-primary" : "text-destructive"}>
                          {/[!?%$&@#]/.test(form.password) ? "✓" : "✗"} Un simbolo (!?%$&@#)
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Conferma Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ripeti la password"
                        value={form.confirmPassword}
                        onChange={e => updateForm("confirmPassword", e.target.value)}
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.confirmPassword && form.confirmPassword !== form.password && (
                      <p className="text-xs text-destructive mt-1">Le password non corrispondono</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <Input id="nome" placeholder="Il tuo nome" value={form.nome} onChange={e => updateForm("nome", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="cognome">Cognome *</Label>
                      <Input id="cognome" placeholder="Il tuo cognome" value={form.cognome} onChange={e => updateForm("cognome", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dataNascita">Data di nascita (opzionale)</Label>
                    <Input id="dataNascita" type="date" value={form.dataNascita} onChange={e => updateForm("dataNascita", e.target.value)} />
                  </div>
                  <div>
                    <Label>Sesso *</Label>
                    <Select value={form.sesso} onValueChange={v => updateForm("sesso", v)}>
                      <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Maschio</SelectItem>
                        <SelectItem value="F">Femmina</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                        <SelectItem value="non-specificato">Preferisco non specificare</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="telefono">Telefono *</Label>
                    <Input id="telefono" type="tel" placeholder="+39 123 456 7890" value={form.telefono} onChange={e => updateForm("telefono", e.target.value)} />
                  </div>
                  <div>
                    <Label>Foto profilo (opzionale)</Label>
                    <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <User className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Clicca o trascina per caricare</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex flex-col gap-4 items-center md:flex-row md:items-start md:gap-4">
                      <div className="w-full md:w-[250px] md:shrink-0 flex flex-col items-center relative overflow-hidden rounded-lg">
                        <div ref={mapRef} className="w-full md:w-[250px] h-[200px] rounded-lg overflow-hidden border relative z-10 isolate" />
                        <p className="text-[11px] text-muted-foreground mt-1.5">Trascina il marker per regolare la posizione</p>
                      </div>
                      <div className="w-full md:flex-1 text-center flex flex-col items-center justify-center min-h-[200px]">
                        <MapPin className="w-8 h-8 text-primary mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">Usa la geolocalizzazione per trovare il tuo quartiere</p>
                        <Button variant="outline" size="sm" className="gap-2 w-full max-w-[200px] md:max-w-none md:w-auto" onClick={handleGeolocate} disabled={geoLoading}>
                          {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                          {geoLoading ? "Rilevamento..." : "Rileva posizione"}
                        </Button>
                        {geoError && (
                          <p className="text-xs text-destructive mt-2 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {geoError}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quartiere with autocomplete */}
                  <div className="relative" ref={quartiereRef}>
                    <Label htmlFor="quartiere">Quartiere *</Label>
                    <Input
                      id="quartiere"
                      placeholder="Es. Navigli, Brera, Isola..."
                      value={quartiereQuery}
                      onChange={e => handleQuartiereChange(e.target.value)}
                      onFocus={() => quartiereQuery.trim() && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      autoComplete="off"
                    />
                    {showSuggestions && filteredQuartieri.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredQuartieri.map(q => (
                          <button
                            key={q.nome}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                            onMouseDown={() => selectQuartiere(q.nome)}
                          >
                            <span className="text-foreground">{q.nome}</span>
                            <span className="text-xs text-muted-foreground">Municipio {q.municipio}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {step3Attempted && !form.quartiere.trim() && (
                      <p className="text-xs text-destructive mt-1">Il quartiere è obbligatorio</p>
                    )}
                  </div>

                  <div className="w-full">
                    <Label htmlFor="citta">Città</Label>
                    <Input
                      id="citta"
                      placeholder="Es. Milano"
                      value={form.citta}
                      onChange={e => updateForm("citta", e.target.value)}
                      autoComplete="address-level2"
                    />
                  </div>

                  <div className="w-full">
                    <Label htmlFor="indirizzo">Indirizzo * {reverseLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</Label>
                    <Input id="indirizzo" placeholder="Via/Piazza..." value={form.indirizzo} onChange={e => updateForm("indirizzo", e.target.value)} />
                    {step3Attempted && !form.indirizzo.trim() && (
                      <p className="text-xs text-destructive mt-1">L'indirizzo è obbligatorio</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="w-full">
                      <Label htmlFor="civico">Civico *</Label>
                      <Input id="civico" placeholder="N°" value={form.civico} onChange={e => updateForm("civico", e.target.value)} />
                      {step3Attempted && !form.civico.trim() && (
                        <p className="text-xs text-destructive mt-1">Il civico è obbligatorio</p>
                      )}
                    </div>
                    <div className="w-full">
                      <Label htmlFor="cap">CAP *</Label>
                      <Input id="cap" placeholder="201xx" maxLength={5} value={form.cap} onChange={e => updateForm("cap", e.target.value.replace(/\D/g, "").slice(0, 5))} />
                      {step3Attempted && form.cap && !capValid && (
                        <p className="text-xs text-destructive mt-1">CAP non valido (formato: 201xx)</p>
                      )}
                      {step3Attempted && !form.cap && (
                        <p className="text-xs text-destructive mt-1">Il CAP è obbligatorio</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">Seleziona il tipo di account:</p>
                  {[
                    { value: "privato", label: "Privato", desc: "Utente privato del quartiere", icon: User },
                    { value: "professionista", label: "Professionista", desc: "Offri servizi professionali", icon: Shield },
                    { value: "negoziante", label: "Negoziante", desc: "Hai un negozio nel quartiere", icon: MapPin },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateForm("tipoAccount", opt.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                        form.tipoAccount === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${form.tipoAccount === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <opt.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-heading font-bold text-foreground">{opt.label}</div>
                        <div className="text-sm text-muted-foreground">{opt.desc}</div>
                      </div>
                      {form.tipoAccount === opt.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  {/* Terms */}
                  <div className="space-y-3">
                    <h3 className="font-heading font-bold text-foreground text-sm">Consensi obbligatori</h3>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={form.termini} onCheckedChange={v => updateForm("termini", v)} className="mt-0.5" />
                      <span className="text-sm text-foreground">Accetto i <a href="#" className="text-primary underline">Termini e Condizioni</a> *</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={form.privacy} onCheckedChange={v => updateForm("privacy", v)} className="mt-0.5" />
                      <span className="text-sm text-foreground">Acconsento al trattamento dei <a href="#" className="text-primary underline">dati personali</a> *</span>
                    </label>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-3">
                    <h3 className="font-heading font-bold text-foreground text-sm">Preferenze di notifica</h3>
                    {[
                      { key: "notificheEmail", label: "Notifiche email" },
                      { key: "notifichePush", label: "Notifiche Push" },
                      { key: "newsletter", label: "Newsletter" },
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{n.label}</span>
                        <Switch checked={(form as any)[n.key]} onCheckedChange={v => updateForm(n.key, v)} />
                      </div>
                    ))}
                  </div>

                  {/* Privacy settings */}
                  <div className="space-y-3">
                    <h3 className="font-heading font-bold text-foreground text-sm">Impostazioni Privacy</h3>
                    {[
                      { key: "profiloPubblico", label: "Profilo pubblico" },
                      { key: "mostraEmail", label: "Mostra email" },
                      { key: "mostraTelefono", label: "Mostra telefono" },
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{n.label}</span>
                        <Switch checked={(form as any)[n.key]} onCheckedChange={v => updateForm(n.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <Button variant="ghost" onClick={prev} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Indietro
              </Button>
            ) : (
              <Link to="/">
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Home
                </Button>
              </Link>
            )}
            {step < TOTAL_STEPS ? (
              <Button variant="hero" onClick={next} className="gap-2">
                Avanti <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="hero"
                className="gap-2"
                disabled={!form.termini || !form.privacy}
                onClick={() => alert("Registrazione completata! (Backend necessario per funzionalità completa)")}
              >
                Completa Registrazione <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
