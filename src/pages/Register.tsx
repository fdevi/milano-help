import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Heart, Eye, EyeOff, MapPin, User, Shield, Check, Loader2, AlertCircle, X, ImagePlus, RotateCcw, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Photon (primary) search result for address autocomplete
interface PhotonFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    postcode?: string;
    district?: string;
    country?: string;
  };
}

// Nominatim (fallback) search result
interface NominatimSearchResult {
  place_id: number;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    quarter?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    postcode?: string;
  };
}

type AddressSuggestion = { type: "photon"; data: PhotonFeature } | { type: "nominatim"; data: NominatimSearchResult };

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
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState<{
    email: string; username: string; password: string; confirmPassword: string;
    nome: string; cognome: string; dataNascita: string; sesso: string; telefono: string;
    quartiere: string; citta: string; indirizzo: string; civico: string; cap: string;
    tipoAccount: string;
    termini: boolean; privacy: boolean;
    notificheEmail: boolean; notifichePush: boolean; newsletter: boolean;
    profiloPubblico: boolean; mostraEmail: boolean; mostraTelefono: boolean;
    fotoProfilo: File | null;
  }>({
    email: "", username: "", password: "", confirmPassword: "",
    nome: "", cognome: "", dataNascita: "", sesso: "", telefono: "",
    quartiere: "", citta: "", indirizzo: "", civico: "", cap: "",
    tipoAccount: "",
    termini: false, privacy: false,
    notificheEmail: true, notifichePush: true, newsletter: false,
    profiloPubblico: true, mostraEmail: false, mostraTelefono: false,
    fotoProfilo: null,
  });

  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [quartiereQuery, setQuartiereQuery] = useState(form.quartiere);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [step1Attempted, setStep1Attempted] = useState(false);
  const [step2Attempted, setStep2Attempted] = useState(false);
  const [step3Attempted, setStep3Attempted] = useState(false);
  const [step4Attempted, setStep4Attempted] = useState(false);
  const [mapCoords, setMapCoords] = useState<[number, number]>([45.4642, 9.1900]);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const quartiereRef = useRef<HTMLDivElement>(null);
  const indirizzoRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoProfiloPreviewUrl, setFotoProfiloPreviewUrl] = useState<string | null>(null);
  const [fotoProfiloOffset, setFotoProfiloOffset] = useState({ offsetX: 0, offsetY: 0 });
  const [fotoProfiloPanLimits, setFotoProfiloPanLimits] = useState<{
    maxOffsetX: number;
    maxOffsetY: number;
    coverWidth: number;
    coverHeight: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);
  const [isDraggingFoto, setIsDraggingFoto] = useState(false);
  const [showDragHint, setShowDragHint] = useState(true);
  const fotoPanStartRef = useRef({ clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 });
  const fotoPanOffsetRef = useRef(fotoProfiloOffset);
  fotoPanOffsetRef.current = fotoProfiloOffset;
  const PREVIEW_SIZE = 150;

  // Revoke object URL when preview changes or on unmount
  useEffect(() => {
    return () => {
      if (fotoProfiloPreviewUrl) URL.revokeObjectURL(fotoProfiloPreviewUrl);
    };
  }, [fotoProfiloPreviewUrl]);

  const handleFotoProfiloChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotoProfiloPreviewUrl) URL.revokeObjectURL(fotoProfiloPreviewUrl);
    updateForm("fotoProfilo", file);
    setFotoProfiloPreviewUrl(URL.createObjectURL(file));
    setFotoProfiloOffset({ offsetX: 0, offsetY: 0 });
    setFotoProfiloPanLimits(null);
    setShowDragHint(true);
    e.target.value = "";
  }, [fotoProfiloPreviewUrl]);

  const removeFotoProfilo = useCallback(() => {
    if (fotoProfiloPreviewUrl) URL.revokeObjectURL(fotoProfiloPreviewUrl);
    updateForm("fotoProfilo", null);
    setFotoProfiloPreviewUrl(null);
    setFotoProfiloOffset({ offsetX: 0, offsetY: 0 });
    setFotoProfiloPanLimits(null);
    setShowDragHint(true);
    fileInputRef.current?.value && (fileInputRef.current.value = "");
  }, [fotoProfiloPreviewUrl]);

  const resetFotoPan = useCallback(() => {
    setFotoProfiloOffset({ offsetX: 0, offsetY: 0 });
  }, []);

  const onFotoImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = img.parentElement;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    if (!imgWidth || !imgHeight || !containerWidth || !containerHeight) return;
    const scale = Math.max(containerWidth / imgWidth, containerHeight / imgHeight);
    const coverWidth = imgWidth * scale;
    const coverHeight = imgHeight * scale;
    const maxOffsetX = Math.max(0, (coverWidth - containerWidth) / 2);
    const maxOffsetY = Math.max(0, (coverHeight - containerHeight) / 2);
    setFotoProfiloPanLimits({
      maxOffsetX,
      maxOffsetY,
      coverWidth,
      coverHeight,
      containerWidth,
      containerHeight,
    });
  }, []);

  const onFotoPanStart = useCallback((clientX: number, clientY: number) => {
    setIsDraggingFoto(true);
    setShowDragHint(false);
    const { offsetX, offsetY } = fotoPanOffsetRef.current;
    fotoPanStartRef.current = {
      clientX,
      clientY,
      offsetX,
      offsetY,
    };
  }, []);

  const onFotoPanMove = useCallback(
    (clientX: number, clientY: number) => {
      const limits = fotoProfiloPanLimits;
      if (!limits) return;
      const { clientX: startX, clientY: startY, offsetX: startOffsetX, offsetY: startOffsetY } = fotoPanStartRef.current;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const newX = startOffsetX + deltaX;
      const newY = startOffsetY + deltaY;
      const maxX = limits.maxOffsetX;
      const maxY = limits.maxOffsetY;
      const offsetX = Math.min(maxX, Math.max(-maxX, newX));
      const offsetY = Math.min(maxY, Math.max(-maxY, newY));
      setFotoProfiloOffset({ offsetX, offsetY });
    },
    [fotoProfiloPanLimits]
  );

  const onFotoPanEnd = useCallback(() => {
    setIsDraggingFoto(false);
  }, []);

  useEffect(() => {
    if (!isDraggingFoto) return;
    const handleMove = (e: MouseEvent) => onFotoPanMove(e.clientX, e.clientY);
    const handleUp = () => {
      onFotoPanEnd();
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingFoto, onFotoPanMove, onFotoPanEnd]);

  useEffect(() => {
    if (!isDraggingFoto) return;
    const handleMove = (e: TouchEvent) => {
      if (e.changedTouches?.length) onFotoPanMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    };
    const handleEnd = () => {
      onFotoPanEnd();
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDraggingFoto, onFotoPanMove, onFotoPanEnd]);

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

  const passwordValid = form.password.length >= 8
    && /[A-Z]/.test(form.password)
    && /[!?%$&@#]/.test(form.password);
  const step1Valid = form.email.trim() !== "" && form.username.trim() !== "" && passwordValid && form.confirmPassword === form.password && form.confirmPassword.trim() !== "";
  const step2Valid = form.nome.trim() !== "" && form.cognome.trim() !== "" && form.sesso !== "" && form.telefono.trim() !== "";
  const capValid = /^201\d{2}$/.test(form.cap);
  const step3Valid = form.quartiere.trim() !== "" && form.citta.trim() !== "" && form.indirizzo.trim() !== "" && form.civico.trim() !== "" && capValid;
  const step4Valid = ["privato", "professionista", "negoziante"].includes(form.tipoAccount);

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

  // Address autocomplete: Photon (primary) con fallback Nominatim — debounce 200ms, ricerca da 2 caratteri
  useEffect(() => {
    const query = form.indirizzo.trim();
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current);
      addressSearchTimeoutRef.current = null;
    }
    if (query.length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    addressSearchTimeoutRef.current = setTimeout(() => {
      setAddressSearchLoading(true);
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&osm_tag=place:house,street&lat=45.4642&lon=9.1900&zoom=12&lang=it`;
      fetch(photonUrl)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Photon error"))))
        .then((data: { features?: PhotonFeature[] }) => {
          const features = data?.features ?? [];
          if (features.length > 0) {
            setAddressSuggestions(features.slice(0, 5).map((f) => ({ type: "photon" as const, data: f })));
            return;
          }
          throw new Error("No Photon results");
        })
        .catch(() => {
          const params = new URLSearchParams({
            format: "json",
            addressdetails: "1",
            limit: "5",
            q: `${query}, Milano, Italia`,
          });
          return fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: { "Accept-Language": "it", "User-Agent": "MilanoHelp-Register/1.0" },
          })
            .then((res) => res.json())
            .then((data: NominatimSearchResult[]) => {
              const filtered = data.filter(
                (item) => item.address?.city === "Milano" || item.display_name.toLowerCase().includes("milano")
              );
              setAddressSuggestions(filtered.slice(0, 5).map((item) => ({ type: "nominatim" as const, data: item })));
            });
        })
        .finally(() => setAddressSearchLoading(false));
    }, 200);
    return () => {
      if (addressSearchTimeoutRef.current) clearTimeout(addressSearchTimeoutRef.current);
    };
  }, [form.indirizzo]);

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
      if (!step1Valid) return;
    }
    if (step === 2) {
      setStep2Attempted(true);
      if (!step2Valid) return;
    }
    if (step === 3) {
      setStep3Attempted(true);
      if (!step3Valid) return;
    }
    if (step === 4) {
      setStep4Attempted(true);
      if (!step4Valid) return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const prev = () => step > 1 && setStep(step - 1);

  const handleRegister = async () => {
    if (!form.termini || !form.privacy) return;
    if (!passwordValid || form.password !== form.confirmPassword) {
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
                    {step1Attempted && form.password.trim() !== "" && !passwordValid && (
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
                                        width: PREVIEW_SIZE,
                                        height: PREVIEW_SIZE,
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
                    {showAddressSuggestions && addressSuggestions.length > 0 && (
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
                    )}
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
