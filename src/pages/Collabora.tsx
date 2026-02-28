import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart, Handshake, Building, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MODALITA_COLLABORAZIONE = [
  { id: "volontariato", label: "Volontariato", icon: Heart, description: "Dona il tuo tempo per iniziative locali e attività di supporto alla community." },
  { id: "partner", label: "Diventa partner", icon: Handshake, description: "Collabora con Milano Help come associazione, azienda o realtà del territorio." },
  { id: "spazi", label: "Offri spazi", icon: Building, description: "Metti a disposizione locali o spazi per incontri, eventi e attività di quartiere." },
  { id: "promozione", label: "Promuovi la community", icon: Megaphone, description: "Aiutaci a far conoscere Milano Help e a coinvolgere nuovi cittadini." },
] as const;

const Collabora = () => {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipoCollaborazione, setTipoCollaborazione] = useState<string>("");
  const [messaggio, setMessaggio] = useState("");
  const [inviando, setInviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !tipoCollaborazione || !messaggio.trim()) {
      toast({
        title: "Campi obbligatori",
        description: "Compila tutti i campi prima di inviare la richiesta.",
        variant: "destructive",
      });
      return;
    }

    setInviando(true);

    try {
      const tipoLabel = MODALITA_COLLABORAZIONE.find((m) => m.id === tipoCollaborazione)?.label ?? tipoCollaborazione;
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          nome: nome.trim(),
          email: email.trim(),
          oggetto: `Richiesta collaborazione: ${tipoLabel}`,
          messaggio: messaggio.trim(),
          tipo_richiesta: "collabora",
          tipo_collaborazione: tipoCollaborazione,
        },
      });

      if (error) throw error;

      toast({
        title: "Richiesta inviata!",
        description: "Grazie per aver scelto di collaborare con noi. Ti contatteremo al più presto.",
      });

      setNome("");
      setEmail("");
      setTipoCollaborazione("");
      setMessaggio("");
    } catch {
      toast({
        title: "Errore",
        description: "Non è stato possibile inviare la richiesta. Riprova più tardi o contattaci direttamente.",
        variant: "destructive",
      });
    } finally {
      setInviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-12">
        {/* Sezione introduttiva */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">Collabora con Milano Help</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            La collaborazione è al centro del nostro progetto. Insieme possiamo rendere i quartieri di Milano e provincia
            più solidali e attivi. Scegli come vuoi contribuire e inviaci la tua richiesta.
          </p>
        </div>

        {/* Card modalità di collaborazione */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {MODALITA_COLLABORAZIONE.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card key={mod.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{mod.label}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Form di contatto */}
        <Card>
          <CardHeader>
            <CardTitle>Invia una richiesta di collaborazione</CardTitle>
            <CardDescription>
              Compila il form con i tuoi dati e il tipo di collaborazione che ti interessa. Ti risponderemo al più presto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Il tuo nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tua@email.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo collaborazione *</Label>
                <Select value={tipoCollaborazione} onValueChange={setTipoCollaborazione} required>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Seleziona una modalità" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITA_COLLABORAZIONE.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="messaggio">Messaggio *</Label>
                <Textarea
                  id="messaggio"
                  placeholder="Raccontaci come vorresti collaborare..."
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  rows={5}
                  className="resize-none"
                  required
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={inviando}>
                {inviando ? "Invio in corso..." : "Invia richiesta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Collabora;
