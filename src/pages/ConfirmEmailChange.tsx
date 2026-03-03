import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmEmailChange = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Token mancante");
      return;
    }

    const confirm = async () => {
      const { data, error } = await supabase.functions.invoke("confirm-email-change", {
        body: { token },
      });

      if (error || data?.error) {
        setStatus("error");
        setErrorMsg(data?.error || error?.message || "Errore durante la conferma");
        return;
      }

      setNewEmail(data.newEmail);
      setStatus("success");

      // Forza logout per far riloggare con la nuova email
      await supabase.auth.signOut();
    };

    confirm();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Conferma in corso...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">Email aggiornata!</h2>
            <p className="text-muted-foreground">
              La tua email è stata cambiata in <strong>{newEmail}</strong>.
              <br />Effettua il login con il nuovo indirizzo.
            </p>
            <Button onClick={() => navigate("/login")}>Vai al login</Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Errore</h2>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate("/profilo")}>Torna al profilo</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmailChange;
