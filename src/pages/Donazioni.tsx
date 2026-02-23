import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAYPAL_CLIENT_ID = "AeTMtkP6uPhFM_eoYuo0sfzNvw5UY35I2F9IJUAhuJUgxYy_nFTAxvt7_ktk6jDz4p5SPCMReGXTTo9r";

const Donazioni = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importo, setImporto] = useState("10");
  const [importoPersonalizzato, setImportoPersonalizzato] = useState("");
  const [mostraAltro, setMostraAltro] = useState(false);
  const [loading, setLoading] = useState(false);

  const importiPredefiniti = ["5", "10", "20", "50"];

  const handleImportoClick = (val: string) => {
    setImporto(val);
    setMostraAltro(false);
  };

  const handleAltroClick = () => {
    setMostraAltro(true);
    setImporto("");
  };

  const getImportoFinale = () => {
    if (mostraAltro && importoPersonalizzato) {
      return importoPersonalizzato;
    }
    return importo;
  };

  const salvaDonazione = async (dettagli: any) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from("donazioni")
      .insert({
        user_id: user.id,
        importo: getImportoFinale(),
        transazione_id: dettagli.id,
        stato: "completata"
      });

    if (error) {
      console.error("Errore salvataggio donazione:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl mb-2">Sostieni Milano Help</h1>
            <p className="text-muted-foreground">
              Il tuo contributo ci aiuta a mantenere attiva la piattaforma e supportare la comunità.
            </p>
          </div>

          <Card className="p-6 shadow-card">
            <div className="space-y-6">
              <div>
                <Label className="text-base">Scegli un importo</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {importiPredefiniti.map((val) => (
                    <Button
                      key={val}
                      variant={importo === val && !mostraAltro ? "default" : "outline"}
                      onClick={() => handleImportoClick(val)}
                      className="text-lg"
                    >
                      €{val}
                    </Button>
                  ))}
                  <Button
                    variant={mostraAltro ? "default" : "outline"}
                    onClick={handleAltroClick}
                    className="text-lg col-span-2"
                  >
                    Altro
                  </Button>
                </div>

                {mostraAltro && (
                  <div className="mt-4">
                    <Label htmlFor="importo">Importo personalizzato (€)</Label>
                    <Input
                      id="importo"
                      type="number"
                      min="1"
                      step="0.01"
                      value={importoPersonalizzato}
                      onChange={(e) => setImportoPersonalizzato(e.target.value)}
                      placeholder="Inserisci importo"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <PayPalScriptProvider options={{ 
                  clientId: PAYPAL_CLIENT_ID, 
                  currency: "EUR",
                  intent: "capture"
                }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect" }}
                    createOrder={(data, actions) => {
                      const importoFinale = getImportoFinale();
                      if (!importoFinale) {
                        toast({
                          title: "Seleziona un importo",
                          variant: "destructive"
                        });
                        return Promise.reject();
                      }
                      return actions.order.create({
                        purchase_units: [
                          {
                            amount: {
                              currency_code: "EUR",
                              value: importoFinale,
                            },
                            description: "Donazione a Milano Help",
                          },
                        ],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      if (!actions.order) return;
                      
                      setLoading(true);
                      try {
                        const details = await actions.order.capture();
                        await salvaDonazione(details);
                        
                        toast({
                          title: "Grazie per la donazione!",
                          description: `€${getImportoFinale()} - ${details.payer.name.given_name}`,
                        });
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Non è stato possibile completare la donazione",
                          variant: "destructive"
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    onError={(err) => {
                      console.error("PayPal error:", err);
                      toast({
                        title: "Errore PayPal",
                        description: "Riprova più tardi",
                        variant: "destructive"
                      });
                    }}
                  />
                </PayPalScriptProvider>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Le donazioni sono processate in modo sicuro da PayPal. 
                Puoi pagare con carta di credito o conto PayPal.
              </p>
            </div>
          </Card>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Milano Help è una piattaforma gratuita per la comunità.</p>
            <p>Il tuo supporto ci aiuta a coprire i costi di hosting e sviluppo.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donazioni;