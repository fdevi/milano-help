import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Genera un token casuale
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

      // 2. Salva il token nel database
      const { error: dbError } = await supabase
        .from('password_resets')
        .insert({ email, token, expires_at: expiresAt.toISOString() });

      if (dbError) throw dbError;

      // 3. (Opzionale) Invia email via Edge Function (quando sarà attiva)
      // Per ora, simula l'invio con console.log
      const resetLink = `${window.location.origin}/reset-password?token=${token}`;
      console.log("🔗 Link di reset (debug):", resetLink);

      toast({
        title: "Email inviata (debug)",
        description: "Controlla la console per il link di reset.",
      });

      setSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Recupera accesso</CardTitle>
          <CardDescription>
            Inserisci la tua email e ti invieremo le istruzioni per reimpostare la password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="bg-primary/10 text-primary p-4 rounded-lg">
                <Mail className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">
                  Se esiste un account associato a {email}, riceverai a breve un'email con le istruzioni.
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  (In modalità debug, il link è nella console del browser)
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Torna al login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="la.tua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Invio in corso..." : "Invia istruzioni"}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">
                  Torna al login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;