import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Heart, Eye, EyeOff, MapPin, User, Shield, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const TOTAL_STEPS = 5;

const Register = () => {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [form, setForm] = useState({
    email: "", username: "", password: "", confirmPassword: "",
    nome: "", cognome: "", dataNascita: "", sesso: "", telefono: "",
    quartiere: "", indirizzo: "", civico: "", cap: "",
    tipoAccount: "",
    termini: false, privacy: false,
    notificheEmail: true, notifichePush: true, newsletter: false,
    profiloPubblico: true, mostraEmail: false, mostraTelefono: false,
  });

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const next = () => step < TOTAL_STEPS && setStep(step + 1);
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
                  <div className="border rounded-lg p-4 bg-muted/30 text-center">
                    <MapPin className="w-8 h-8 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">Usa la geolocalizzazione per trovare il tuo quartiere</p>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MapPin className="w-4 h-4" /> Rileva posizione
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="quartiere">Quartiere *</Label>
                    <Input id="quartiere" placeholder="Es. Navigli, Brera, Isola..." value={form.quartiere} onChange={e => updateForm("quartiere", e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="indirizzo">Indirizzo *</Label>
                    <Input id="indirizzo" placeholder="Via/Piazza..." value={form.indirizzo} onChange={e => updateForm("indirizzo", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="civico">Civico *</Label>
                      <Input id="civico" placeholder="N°" value={form.civico} onChange={e => updateForm("civico", e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="cap">CAP *</Label>
                      <Input id="cap" placeholder="20100" value={form.cap} onChange={e => updateForm("cap", e.target.value)} />
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
