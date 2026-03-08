import { useEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";

interface Arrivo {
  linea: string;
  destinazione: string;
  display: string; // "5 min" oppure "19:31"
}

const LINEE = ["M1", "M2", "M3", "M5", "S1", "S2", "S12", "70", "42", "60", "94"];
const DESTINAZIONI = [
  "Monumentale",
  "Rho Fiera",
  "Romolo",
  "San Donato",
  "Bisceglie",
  "Cologno Nord",
  "Sesto 1º Maggio",
  "Linate",
  "Comasina",
  "Bignami",
  "San Siro",
  "Porta Genova",
  "Centrale FS",
  "Rogoredo FS",
];

function generaArriviFinti(): Arrivo[] {
  const now = new Date();
  const count = 6 + Math.floor(Math.random() * 6);
  const arrivi: Arrivo[] = [];

  for (let i = 0; i < count; i++) {
    const linea = LINEE[Math.floor(Math.random() * LINEE.length)];
    const destinazione = DESTINAZIONI[Math.floor(Math.random() * DESTINAZIONI.length)];
    const useMinutes = Math.random() > 0.4;
    let display: string;
    if (useMinutes) {
      const min = 2 + Math.floor(Math.random() * 28);
      display = `${min} min`;
    } else {
      const minOffset = 5 + Math.floor(Math.random() * 55);
      const t = new Date(now.getTime() + minOffset * 60 * 1000);
      display = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
    }
    arrivi.push({ linea, destinazione, display });
  }

  arrivi.sort((a, b) => {
    const order = (d: string) => {
      if (d.endsWith(" min")) return parseInt(d, 10);
      const [h, m] = d.split(":").map(Number);
      return 100 + h * 60 + m;
    };
    return order(a.display) - order(b.display);
  });

  return arrivi;
}

interface ProssimiArriviProps {
  fermataId: string;
  fermataNome: string;
}

const ProssimiArrivi = ({ fermataId, fermataNome }: ProssimiArriviProps) => {
  const [arrivi, setArrivi] = useState<Arrivo[]>(() => generaArriviFinti());

  const refresh = useCallback(() => {
    setArrivi(generaArriviFinti());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [fermataId, refresh]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 pb-3 border-b">
        <h2 className="text-lg font-semibold truncate pr-2">{fermataNome}</h2>
        <button
          type="button"
          onClick={refresh}
          className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors"
          title="Aggiorna"
        >
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mt-2 mb-3">
        Prossimi arrivi (dati di esempio)
      </p>
      <ScrollArea className="flex-1 pr-2 -mr-2">
        <ul className="space-y-1">
          {arrivi.map((a, i) => (
            <li
              key={`${a.linea}-${a.destinazione}-${i}`}
              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 font-semibold text-sm w-8 tabular-nums">
                  {a.linea}
                </span>
                <span className="text-sm truncate">{a.destinazione}</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
                {a.display}
              </span>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};

export default ProssimiArrivi;
