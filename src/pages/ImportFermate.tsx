import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportFermate() {
  const [status, setStatus] = useState<string>("Premi il pulsante per importare le fermate ATM.");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImport = async () => {
    setLoading(true);
    setStatus("Scaricamento file stops.txt...");
    try {
      const res = await fetch("/data/stops.txt");
      if (!res.ok) throw new Error("Impossibile scaricare stops.txt");
      const csvText = await res.text();
      setStatus(`File scaricato (${csvText.length} caratteri). Invio alla funzione di import...`);

      const { data, error } = await supabase.functions.invoke("import-fermate", {
        body: csvText,
        headers: { "Content-Type": "text/plain" },
      });

      if (error) throw error;
      setResult(data);
      setStatus(`✅ Import completato! ${data?.inserted ?? 0} fermate inserite.`);
    } catch (err: any) {
      setStatus(`❌ Errore: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Import Fermate ATM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{status}</p>
          <Button onClick={handleImport} disabled={loading} className="w-full">
            {loading ? "Importazione in corso..." : "Avvia Import"}
          </Button>
          {result && (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
