import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

const EMAIL_DESTINO = "fabio.dvt@hotmail.com";
// Per invio diretto senza aprire il client email: installa @emailjs/browser e configura
// VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID in .env

const Contattaci = () => {
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [oggetto, setOggetto] = useState("");
  const [messaggio, setMessaggio] = useState("");
  const [inviando, setInviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !oggetto.trim() || !messaggio.trim()) {
      toast({
        title: "Campi obbligatori",
        description: "Compila tutti i campi prima di inviare.",
        variant: "destructive",
      });
      return;
    }

    setInviando(true);

    try {
      // Opzione mailto: apre il client email con dati precompilati (funziona subito, nessuna dipendenza)
      const body = [
        `Nome: ${nome.trim()}`,
        `Email: ${email.trim()}`,
        "",
        messaggio.trim(),
      ].join("\n");
      const mailtoUrl = `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent(oggetto.trim())}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;

      toast({
        title: "Grazie per averci contattato!",
        description: "Si è aperto il tuo client email. Completa l'invio del messaggio per inviare la richiesta.",
      });

      setNome("");
      setEmail("");
      setOggetto("");
      setMessaggio("");
    } catch {
      toast({
        title: "Errore",
        description: "Non è stato possibile preparare l'email. Riprova o scrivi a " + EMAIL_DESTINO,
        variant: "destructive",
      });
    } finally {
      setInviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Contattaci</h1>
          <p className="text-muted-foreground">
            Compila il form e ti risponderemo al più presto. I messaggi vengono inviati a{" "}
            <span className="text-foreground font-medium">{EMAIL_DESTINO}</span>.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" /> Invia un messaggio
            </CardTitle>
            <CardDescription>
              Nome, email, oggetto e messaggio sono obbligatori.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Il tuo nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full"
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
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oggetto">Oggetto *</Label>
                <Input
                  id="oggetto"
                  placeholder="Es: Richiesta informazioni"
                  value={oggetto}
                  onChange={(e) => setOggetto(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messaggio">Messaggio *</Label>
                <Textarea
                  id="messaggio"
                  placeholder="Scrivi qui il tuo messaggio..."
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  rows={5}
                  className="w-full resize-none"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={inviando}>
                {inviando ? "Invio in corso..." : "Invia"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Contattaci;
