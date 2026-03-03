import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      const email = searchParams.get('email');
      
      if (!email) {
        setStatus('error');
        setMessage("Nessuna email specificata nel link di conferma.");
        return;
      }

      try {

        // Verify email using secure RPC function
        const { data: verified, error: updateError } = await supabase
          .rpc('verify_email_by_address', { _email: email });

        if (updateError) {
          console.error("Errore verifica email:", updateError);
          setStatus('error');
          setMessage("Si è verificato un errore durante la conferma dell'email.");
          return;
        }

        if (!verified) {
          setStatus('success');
          setMessage("La tua email è già stata confermata. Puoi accedere al tuo account.");
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        setStatus('success');
        setMessage("Email confermata con successo! Ora puoi accedere al tuo account.");
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (error) {
        console.error("Errore durante la conferma:", error);
        setStatus('error');
        setMessage("Si è verificato un errore durante la conferma dell'email.");
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Conferma Email</CardTitle>
            <CardDescription className="text-center">
              {status === 'loading' && "Stiamo verificando la tua email..."}
              {status === 'success' && "Email confermata!"}
              {status === 'error' && "Si è verificato un errore"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'loading' && (
              <div className="py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              </div>
            )}
            
            {status === 'success' && (
              <div className="py-6 space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <p className="text-green-600">{message}</p>
                <p className="text-sm text-muted-foreground">
                  Verrai reindirizzato al login tra pochi secondi...
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="py-6 space-y-4">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <p className="text-red-600">{message}</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  Torna alla home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmEmail;
