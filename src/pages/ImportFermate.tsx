import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const IMPORTS = [
  { label: "1. Fermate (stops.txt)", table: "fermate", file: "/data/stops.txt" },
  { label: "2. Linee (routes.txt)", table: "routes", file: "/data/routes.txt" },
  { label: "3. Corse (trips.txt)", table: "trips", file: "/data/trips.txt" },
  { label: "4. Orari (stop_times.txt)", table: "stop_times", file: "/data/stop_times.txt" },
] as const;

export default function ImportFermate() {
  const [status, setStatus] = useState<string>("Seleziona un file da importare.");
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const handleImport = async (table: string, file: string, label: string) => {
    setLoading(table);
    setStatus(`Scaricamento ${label}...`);
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`File non trovato: ${file}`);
      const csvText = await res.text();
      const lines = csvText.split("\n").length;
      setStatus(`File scaricato (${lines} righe). Invio alla funzione di import...`);

      // For stop_times, split into chunks to avoid timeout
      if (table === "stop_times" && lines > 50000) {
        const allLines = csvText.split("\n");
        const header = allLines[0];
        const dataLines = allLines.slice(1).filter(l => l.trim());
        const chunkSize = 40000;
        let totalInserted = 0;

        for (let i = 0; i < dataLines.length; i += chunkSize) {
          const chunk = dataLines.slice(i, i + chunkSize);
          const chunkCsv = header + "\n" + chunk.join("\n");
          const chunkNum = Math.floor(i / chunkSize) + 1;
          const totalChunks = Math.ceil(dataLines.length / chunkSize);
          setStatus(`Import stop_times: chunk ${chunkNum}/${totalChunks} (${totalInserted} inseriti)...`);

          const { data, error } = await supabase.functions.invoke("import-gtfs?table=" + table, {
            body: chunkCsv,
            headers: { "Content-Type": "text/plain" },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          totalInserted += data?.inserted ?? 0;
        }

        const result = { success: true, inserted: totalInserted };
        setResults((prev) => ({ ...prev, [table]: result }));
        setStatus(`✅ ${label} completato! ${totalInserted} record inseriti.`);
      } else {
        const { data, error } = await supabase.functions.invoke("import-gtfs?table=" + table, {
          body: csvText,
          headers: { "Content-Type": "text/plain" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setResults((prev) => ({ ...prev, [table]: data }));
        setStatus(`✅ ${label} completato! ${data?.inserted ?? 0} record inseriti.`);
      }
    } catch (err: any) {
      setStatus(`❌ Errore ${label}: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Import GTFS ATM Milano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{status}</p>
          {loading && <Progress className="h-2" />}

          <div className="space-y-2">
            {IMPORTS.map(({ label, table, file }) => (
              <Button
                key={table}
                onClick={() => handleImport(table, file, label)}
                disabled={loading !== null}
                variant={results[table] ? "outline" : "default"}
                className="w-full justify-start"
              >
                {results[table] ? `✅ ${label} (${results[table].inserted})` : label}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠️ Importa nell'ordine: fermate → linee → corse → orari (le tabelle hanno foreign key).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
