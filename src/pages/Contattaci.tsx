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
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          nome: nome.trim(),
          email: email.trim(),
          oggetto: oggetto.trim(),
          messaggio: messaggio.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Messaggio inviato!",
        description: "Grazie per averci contattato, ti risponderemo al più presto.",
      });

      setNome("");
      setEmail("");
      setOggetto("");
      setMessaggio("");
    } catch {
      toast({
        title: "Errore",
        description: "Non è stato possibile inviare il messaggio. Riprova più tardi.",
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
            <span className="text-foreground font-medium">fabio.dvt0@gmail.com</span>.
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
