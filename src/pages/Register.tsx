import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  User,
  MapPin,
  Shield,
  X,
  Loader2,
  AlertCircle,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import Navbar from "@/components/Navbar";
import { useFotoProfilo } from "@/hooks/useFotoProfilo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useQuartieri } from "@/hooks/useQuartieri";

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  nome: string;
  cognome: string;
  dataNascita: string;
  sesso: string;
  telefono: string;
  fotoProfilo: File | null;
  quartiere: string;
  citta: string;
  indirizzo: string;
  civico: string;
  cap: string;
  tipoAccount: string;
  termini: boolean;
  privacy: boolean;
  notificheEmail: boolean;
  notifichePush: boolean;
  newsletter: boolean;
  profiloPubblico: boolean;
  mostraEmail: boolean;
  mostraTelefono: boolean;
}

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    district?: string;
    city?: string;
  };
}

interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  address?: {
    house_number?: string;
    postcode?: string;
    quarter?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
  };
}

type AddressSuggestion =
  | { type: "photon"; data: PhotonFeature }
  | { type: "nominatim"; data: NominatimSearchResult };

const TOTAL_STEPS = 5;

const Register = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    nome: "",
    cognome: "",
    dataNascita: "",
    sesso: "",
    telefono: "",
    fotoProfilo: null,
    quartiere: "",
    citta: "",
    indirizzo: "",
    civico: "",
    cap: "",
    tipoAccount: "",
    termini: false,
    privacy: false,
    notificheEmail: true,
    notifichePush: true,
    newsletter: false,
    profiloPubblico: true,
    mostraEmail: false,
    mostraTelefono: false,
  });

  // Step validation states
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [step2Attempted, setStep2Attempted] = useState(false);
  const [step3Attempted, setStep3Attempted] = useState(false);
  const [step4Attempted, setStep4Attempted] = useState(false);

  // Quartiere autocomplete
  const [quartiereQuery, setQuartiereQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const quartiereRef = useRef<HTMLDivElement>(null);
  const { quartieri } = useQuartieri();

  const filteredQuartieri = quartiereQuery.trim().length > 0
    ? quartieri.filter(q => q.nome.toLowerCase().includes(quartiereQuery.toLowerCase()) || q.area.toLowerCase().includes(quartiereQuery.toLowerCase())).slice(0, 8)
    : [];

  const selectQuartiere = (nome: string) => {
    setQuartiereQuery(nome);
    updateForm("quartiere", nome);
    setShowSuggestions(false);
  };

  const handleQuartiereChange = (value: string) => {
    setQuartiereQuery(value);
    updateForm("quartiere", value);
    setShowSuggestions(true);
  };

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const indirizzoRef = useRef<HTMLDivElement>(null);
  const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Geocoding and map
  const [mapCoords, setMapCoords] = useState<[number, number]>([45.4642, 9.1900]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const { reverseGeocode, loading: reverseLoading } = useReverseGeocode((data) => {
    if (data.quartiere) {
      setQuartiereQuery(data.quartiere);
      updateForm("quartiere", data.quartiere);
    }
    if (data.citta) updateForm("citta", data.citta);
    if (data.indirizzo) updateForm("indirizzo", data.indirizzo);
    if (data.civico) updateForm("civico", data.civico);
    if (data.cap) updateForm("cap", data.cap);
  });

  // Foto profilo
  const {
    fotoProfiloPreviewUrl,
    isDraggingFoto,
    fotoProfiloOffset,
    fotoProfiloPanLimits,
    showDragHint,
    handleFotoProfiloChange,
    onFotoPanStart,
    onFotoImageLoad,
    resetFotoPan,
    removeFotoProfilo,
  } = useFotoProfilo({
    onFileChange: (file) => updateForm("fotoProfilo", file),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password validation
  const passwordValid = useCallback(() => {
    const pwd = form.password;
    return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[!?%$&@#]/.test(pwd);
  }, [form.password]);

  // Step validation
  const step1Valid = useCallback(() => {
    return form.email.trim() !== "" && form.username.trim() !== "" && form.password.trim() !== "" && form.confirmPassword.trim() !== "" && form.password === form.confirmPassword && passwordValid();
  }, [form.email, form.username, form.password, form.confirmPassword, passwordValid]);

  const step2Valid = useCallback(() => {
    return form.nome.trim() !== "" && form.cognome.trim() !== "" && form.sesso !== "" && form.telefono.trim() !== "";
  }, [form.nome, form.cognome, form.sesso, form.telefono]);

  const step3Valid = useCallback(() => {
    return form.quartiere.trim() !== "" && form.citta.trim() !== "" && form.indirizzo.trim() !== "" && form.civico.trim() !== "" && form.cap.trim() !== "";
  }, [form.quartiere, form.citta, form.indirizzo, form.civico, form.cap]);

  const step4Valid = useCallback(() => {
    return form.tipoAccount !== "";
  }, [form.tipoAccount]);

  // Update form
  const updateForm = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

 // Map initialization
useEffect(() => {
  if (step !== 3 || !mapRef.current) return;

  let map: any = null;
  let marker: any = null;

  const initMap = async () => {
    try {
      // Pulisci il container
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (!mapRef.current) return;

      map = L.map(mapRef.current, { 
        zoomControl: false, 
        attributionControl: false 
      }).setView(mapCoords, 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Crea un'icona personalizzata
      const icon = L.divIcon({ 
        className: "custom-marker", 
        html: '📍',
        iconSize: [24, 24], 
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });

      marker = L.marker(mapCoords, { icon, draggable: true }).addTo(map);
      
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setMapCoords([pos.lat, pos.lng]);
        reverseGeocode(pos.lat, pos.lng);
      });

    } catch (error) {
      console.error("Errore caricamento mappa:", error);
    }
  };

  initMap();

  // Cleanup function
  return () => {
    if (map) {
      map.remove();
    }
  };
}, [step, mapCoords, reverseGeocode]);

  // Click outside to close quartiere dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSuggestions && quartiereRef.current && !quartiereRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  // Address autocomplete: Photon (primary) con fallback Nominatim — debounce 200ms, ricerca da 2 caratteri
  // useEffect(() => {
  //   const query = form.indirizzo.trim();
  //   if (addressSearchTimeoutRef.current) {
  //     clearTimeout(addressSearchTimeoutRef.current);
  //     addressSearchTimeoutRef.current = null;
  //   }
  //   if (query.length < 2) {
  //     setAddressSuggestions([]);
  //     setShowAddressSuggestions(false);
  //     return;
  //   }
  //   addressSearchTimeoutRef.current = setTimeout(() => {     
  //     setAddressSearchLoading(true);
  //     const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&osm_tag=place:house,street&lat=45.4642&lon=9.1900&zoom=12&lang=it`;
  //     fetch(photonUrl)
  //       .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Photon error"))))
  //       .then((data: { features?: PhotonFeature[] }) => {    
  //         const features = data?.features ?? [];
  //         if (features.length > 0) {
  //           setAddressSuggestions(features.slice(0, 5).map((f) => ({ type: "photon" as const, data: f })));
  //           return;
  //         }
  //         throw new Error("No Photon results");
  //       })
  //       .catch(() => {
  //         const params = new URLSearchParams({
  //           format: "json",
  //           addressdetails: "1",
  //           limit: "5",
  //           q: `${query}, Milano, Italia`,
  //         });
  //         return fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
  //           headers: { "Accept-Language": "it", "User-Agent": "MilanoHelp-Register/1.0" },
  //         })
  //           .then((res) => res.json())
  //           .then((data: NominatimSearchResult[]) => {       
  //             const filtered = data.filter(
  //               (item) => item.address?.city === "Milano" || item.display_name.toLowerCase().includes("milano")
  //             );
  //             setAddressSuggestions(filtered.slice(0, 5).map((item) => ({ type: "nominatim" as const, data: item })));    
  //           });
  //       })
  //       .finally(() => setAddressSearchLoading(false));      
  //   }, 200);
  //   return () => {
  //     if (addressSearchTimeoutRef.current) clearTimeout(addressSearchTimeoutRef.current);
  //   };
  // }, [form.indirizzo]);

  // Click outside to close address dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAddressSuggestions && indirizzoRef.current && !indirizzoRef.current.contains(e.target as Node)) {
        setShowAddressSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddressSuggestions]);

  const selectAddress = useCallback((item: AddressSuggestion) => {
    if (item.type === "photon") {
      const p = item.data.properties;
      const indirizzoDisplay = (p.name ?? [p.street, p.housenumber].filter(Boolean).join(" ")) || "";
      updateForm("indirizzo", indirizzoDisplay);
      if (p.housenumber) updateForm("civico", p.housenumber);
      if (p.postcode) updateForm("cap", p.postcode);
      if (p.district) {
        setQuartiereQuery(p.district);
        updateForm("quartiere", p.district);
      }
      if (p.city) updateForm("citta", p.city);
    } else {
      const n = item.data;
      updateForm("indirizzo", n.display_name);
      const addr = n.address;
      if (addr) {
        if (addr.house_number) updateForm("civico", addr.house_number);
        if (addr.postcode) updateForm("cap", addr.postcode); 
        const quartiere = addr.quarter || addr.neighbourhood || addr.suburb || "";
        if (quartiere) {
          setQuartiereQuery(quartiere);
          updateForm("quartiere", quartiere);
        }
        if (addr.city) updateForm("citta", addr.city);       
      }
    }
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  }, []);

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
    if (step === 1) {
      setStep1Attempted(true);
      if (!step1Valid()) return;
    }
    if (step === 2) {
      setStep2Attempted(true);
      if (!step2Valid()) return;
    }
    if (step === 3) {
      setStep3Attempted(true);
      if (!step3Valid()) return;
    }
    if (step === 4) {
      setStep4Attempted(true);
      if (!step4Valid()) return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const prev = () => step > 1 && setStep(step - 1);

  const handleRegister = async () => {
    if (!form.termini || !form.privacy) return;
    if (!passwordValid() || form.password !== form.confirmPassword) {
      toast({ title: "Controlla la password", description: "La password deve rispettare i requisiti e le due password devono corrispondere.", variant: "destructive" });
      return;
    }
    if (!form.email || !form.username || !form.nome || !form.cognome) {
      toast({ title: "Campi mancanti", description: "Compila tutti i campi obbligatori.", variant: "destructive" });      
      return;
    }

    setLoading(true);

    // 1. Sign up with Supabase Auth
    const trimmedEmail = form.email.trim().toLowerCase();    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message.includes("already registered")
        ? "Questa email è già registrata. Prova ad accedere."
        : signUpError.message;
      toast({ title: "Errore nella registrazione", description: msg, variant: "destructive" });
      return;
    }

    // 2. Update profile with all form data
    if (signUpData.user) {
      const { error: profileError } = await supabase.from("profiles").update({
        username: form.username,
        nome: form.nome,
        cognome: form.cognome,
        data_nascita: form.dataNascita || null,
        sesso: form.sesso || null,
        telefono: form.telefono,
        quartiere: form.quartiere,
        citta: form.citta,
        indirizzo: form.indirizzo,
        civico: form.civico,
        cap: form.cap,
        tipo_account: form.tipoAccount || "privato",
        profilo_pubblico: form.profiloPubblico,
        mostra_email: form.mostraEmail,
        mostra_telefono: form.mostraTelefono,
        notifiche_email: form.notificheEmail,
        notifiche_push: form.notifichePush,
        newsletter: form.newsletter,
      }).eq("user_id", signUpData.user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // 3. Upload foto profilo se presente
      if (form.fotoProfilo) {
        try {
          const ext = form.fotoProfilo.name.split(".").pop();
          const filePath = `${signUpData.user.id}/avatar.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, form.fotoProfilo, { upsert: true });

          if (uploadError) {
            console.error("🖼️ Register: Avatar upload error:", uploadError);
          } else {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
            console.log("🖼️ Register: Avatar URL generato:", urlData.publicUrl);
            const { error: avatarError } = await supabase
              .from("profiles")
              .update({ avatar_url: urlData.publicUrl })
              .eq("user_id", signUpData.user.id);
            if (avatarError) {
              console.error("🖼️ Register: Avatar URL update error:", avatarError);
            } else {
              console.log("🖼️ Register: avatar_url salvato nel profilo con successo");
            }
          }
        } catch (err) {
          console.error("Avatar upload exception:", err);
        }
      }
    }

    setLoading(false);
    setRegistrationComplete(true);
  };

  const stepTitles = [
    "Credenziali di accesso",
    "Informazioni personali",
    "Localizzazione",
    "Tipo di account",
    "Termini e preferenze",
  ];

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md text-center"
          >
            <div className="bg-card rounded-xl p-8 shadow-card border">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">        
                <Check className="w-8 h-8 text-primary" />   
              </div>
              <h2 className="font-heading font-extrabold text-xl text-foreground mb-2">Registrazione completata!</h2>     
              <p className="text-sm text-muted-foreground mb-6">
                Ti abbiamo inviato un'email di conferma. Clicca sul link nell'email per attivare il tuo account e poter accedere.
              </p>
              <Link to="/login">
                <Button variant="hero" className="w-full">Vai al Login</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

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

            {step === 1 && (
              <div className="mt-4">
                <Button type="button" variant="outline" className="w-full" onClick={async () => {
                  setGoogleLoading(true);
                  const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                  setGoogleLoading(false);
                  if (error) toast({ title: "Errore con Google", description: error.message, variant: "destructive" });
                }} disabled={googleLoading}>
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  )}
                  Registrati con Google
                </Button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">oppure con email</span></div>
                </div>
              </div>
            )}
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
                    {step1Attempted && !form.email.trim() && (
                      <p className="text-xs text-destructive mt-1">L&apos;email è obbligatoria</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input id="username" placeholder="Scegli un username" value={form.username} onChange={e => updateForm("username", e.target.value)} />
                    {step1Attempted && !form.username.trim() && (
                      <p className="text-xs text-destructive mt-1">Lo username è obbligatorio</p>
                    )}
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
                    {step1Attempted && form.confirmPassword.trim() === "" && (
                      <p className="text-xs text-destructive mt-1">Conferma la password</p>
                    )}
                    {step1Attempted && form.password.trim() !== "" && !passwordValid() && (
                      <p className="text-xs text-destructive mt-1">La password non rispetta i requisiti</p>
                    )}
                  </div>
                </div>
              )}

{step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>   
                      <Input id="nome" placeholder="Il tuo nome" value={form.nome} onChange={e => updateForm("nome", e.target.value)} />
                      {step2Attempted && !form.nome.trim() && (
                        <p className="text-xs text-destructive mt-1">Il nome è obbligatorio</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cognome">Cognome *</Label>
                      <Input id="cognome" placeholder="Il tuo cognome" value={form.cognome} onChange={e => updateForm("cognome", e.target.value)} />
                      {step2Attempted && !form.cognome.trim() && (
                        <p className="text-xs text-destructive mt-1">Il cognome è obbligatorio</p>
                      )}
                    </div>
                  </div>

                  {/* Data di nascita migliorata con select */}
                  <div>
                    <Label>Data di nascita (opzionale)</Label>
                    <div className="flex gap-2 mt-1">
                      <select
                        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={form.dataNascita?.split('-')[0] || ''}
                        onChange={(e) => {
                          const [y, m, d] = (form.dataNascita || '--').split('-');
                          updateForm('dataNascita', `${e.target.value}-${m || ''}-${d || ''}`);
                        }}
                      >
                        <option value="">Anno</option>
                        {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <select
                        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={form.dataNascita?.split('-')[1] || ''}
                        onChange={(e) => {
                          const [y, m, d] = (form.dataNascita || '--').split('-');
                          updateForm('dataNascita', `${y || ''}-${e.target.value}-${d || ''}`);
                        }}
                      >
                        <option value="">Mese</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                          <option key={month} value={month.toString().padStart(2, '0')}>{month}</option>
                        ))}
                      </select>
                      <select
                        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={form.dataNascita?.split('-')[2] || ''}
                        onChange={(e) => {
                          const [y, m, d] = (form.dataNascita || '--').split('-');
                          updateForm('dataNascita', `${y || ''}-${m || ''}-${e.target.value}`);
                        }}
                      >
                        <option value="">Giorno</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day.toString().padStart(2, '0')}>{day}</option>
                        ))}
                      </select>
                    </div>
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
                    {step2Attempted && !form.sesso && (      
                      <p className="text-xs text-destructive mt-1">Il sesso è obbligatorio</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="telefono">Telefono *</Label>
                    <Input id="telefono" type="tel" placeholder="+39 123 456 7890" value={form.telefono} onChange={e => updateForm("telefono", e.target.value)} />
                    {step2Attempted && !form.telefono.trim() && (
                      <p className="text-xs text-destructive mt-1">Il telefono è obbligatorio</p>
                    )}
                  </div>

                  <div>
                    <Label>Foto profilo (opzionale)</Label>  
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      id="foto-profilo"
                      aria-label="Carica foto profilo"       
                      onChange={handleFotoProfiloChange}     
                    />
                    <div className="mt-1 flex flex-col sm:flex-row items-center gap-4">
                      {form.fotoProfilo && fotoProfiloPreviewUrl ? (
                        <>
                          <div className="shrink-0 flex flex-col items-center gap-1.5">
                            <div
                              className="w-[150px] h-[150px] rounded-full overflow-hidden border-2 border-border bg-muted/30 shadow-sm relative select-none cursor-grab active:cursor-grabbing touch-none"
                              style={{ cursor: isDraggingFoto ? "grabbing" : "grab" }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onFotoPanStart(e.clientX, e.clientY);
                              }}
                              onTouchStart={(e) => {
                                if (e.touches.length === 1) onFotoPanStart(e.touches[0].clientX, e.touches[0].clientY);   
                              }}
                              role="img"
                              aria-label="Trascina per centrare la foto"
                            >
                              <img
                                src={fotoProfiloPreviewUrl}  
                                alt="Anteprima foto profilo" 
                                className="pointer-events-none absolute left-1/2 top-1/2 object-cover"
                                style={
                                  fotoProfiloPanLimits       
                                    ? {
                                        width: fotoProfiloPanLimits.coverWidth,
                                        height: fotoProfiloPanLimits.coverHeight,
                                        transform: `translate(calc(-50% + ${fotoProfiloOffset.offsetX}px), calc(-50% + ${fotoProfiloOffset.offsetY}px))`,
                                      }
                                    : {
                                        width: "150px", 
                                        height: "150px",
                                        transform: "translate(-50%, -50%)",
                                      }
                                }
                                draggable={false}
                                onLoad={onFotoImageLoad}     
                              />
                            </div>
                            {showDragHint && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <GripVertical className="w-3.5 h-3.5" />
                                Trascina per centrare        
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{form.fotoProfilo.name}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={resetFotoPan}
                              aria-label="Ripristina posizione"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Ripristina
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                              onClick={removeFotoProfilo}    
                              aria-label="Rimuovi foto"      
                            >
                              <X className="w-4 h-4" />      
                              Rimuovi
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="foto-profilo"
                            className="w-[150px] h-[150px] rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/50 shadow-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 shrink-0"
                          >
                            <User className="w-10 h-10 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground text-center px-2">Nessuna foto</span>
                          </label>
                          <span className="text-sm text-muted-foreground">Clicca per caricare · JPG, PNG, WebP</span>     
                        </>
                      )}
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
                            <span className="text-xs text-muted-foreground">{q.area}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {step3Attempted && !form.quartiere.trim() && (
                      <p className="text-xs text-destructive mt-1">Il quartiere è obbligatorio</p>
                    )}
                  </div>

                  <div className="w-full">
                    <Label htmlFor="citta">Città *</Label>   
                    <Input
                      id="citta"
                      placeholder="Es. Milano"
                      value={form.citta}
                      onChange={e => updateForm("citta", e.target.value)}
                      autoComplete="address-level2"
                    />
                    {step3Attempted && !form.citta.trim() && (
                      <p className="text-xs text-destructive mt-1">La città è obbligatoria</p>
                    )}
                  </div>

                  <div className="w-full relative" ref={indirizzoRef}>
                    <Label htmlFor="indirizzo">
                      Indirizzo *{" "}
                      {reverseLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                      {addressSearchLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                    </Label>
                    <Input
                      id="indirizzo"
                      placeholder="Via/Piazza... (cerca indirizzi a Milano)"
                      value={form.indirizzo}
                      onChange={(e) => {
                        updateForm("indirizzo", e.target.value);
                        setShowAddressSuggestions(true);     
                      }}
                      onFocus={() => form.indirizzo.trim().length >= 2 && addressSuggestions.length > 0 && setShowAddressSuggestions(true)}
                      autoComplete="off"
                    />
                    {/* {showAddressSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((item, idx) => {
                          const displayName = item.type === "photon"
                            ? ((item.data.properties.name ?? [item.data.properties.street, item.data.properties.housenumber].filter(Boolean).join(" ")) || "")
                            : item.data.display_name;        
                          const sub = item.type === "photon" 
                            ? item.data.properties.district  
                            : item.data.address?.quarter || item.data.address?.neighbourhood || item.data.address?.suburb;
                          return (
                            <button
                              key={item.type === "photon" ? `photon-${idx}-${item.data.properties.name ?? ""}` : `nominatim-${item.data.place_id}`}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b border-border last:border-b-0"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectAddress(item);
                              }}
                            >
                              <span className="text-foreground block">{displayName}</span>
                              {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )} */}
                    {step3Attempted && !form.indirizzo.trim() && (
                      <p className="text-xs text-destructive mt-1">L&apos;indirizzo è obbligatorio</p>
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
                      {step3Attempted && form.cap && !/^201\d{2}$/.test(form.cap) && (
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
                  <p className="text-sm text-muted-foreground mb-2">Seleziona il tipo di account: *</p>
                  {step4Attempted && !form.tipoAccount && (  
                    <p className="text-xs text-destructive">Seleziona un tipo di account per continuare.</p>
                  )}
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
                      <span className="text-sm text-foreground">Accetto i <a href="/termini" className="text-primary underline" target="_blank" rel="noopener noreferrer">Termini e Condizioni</a> *</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox checked={form.privacy} onCheckedChange={v => updateForm("privacy", v)} className="mt-0.5" />
                      <span className="text-sm text-foreground">Acconsento al trattamento dei <a href="/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">dati personali</a> *</span>
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
                        <Switch checked={(form as any)[n.key]} onCheckedChange={v => updateForm(n.key as keyof FormData, v)} />
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
                        <Switch checked={(form as any)[n.key]} onCheckedChange={v => updateForm(n.key as keyof FormData, v)} />
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
                disabled={!form.termini || !form.privacy || loading}
                onClick={handleRegister}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {loading ? "Registrazione..." : "Completa Registrazione"} {!loading && <Check className="w-4 h-4" />}     
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;