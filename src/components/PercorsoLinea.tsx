import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LineaFinta, DirezioneFinta, ColoreLinea } from "@/lib/fermateFinti";
import { Train, Bus, Map } from "lucide-react";

interface PercorsoLineaProps {
  linea: LineaFinta;
  nomeFermataCorrente: string;
  onMostraSullaMappa?: (fermate: string[]) => void;
}

export function PercorsoLinea({ linea, nomeFermataCorrente, onMostraSullaMappa }: PercorsoLineaProps) {
  const colore: ColoreLinea = linea.colore ?? { bg: "#f1f5f9", text: "#475569" };
  const isMetro = linea.nome.startsWith("M");

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b"
        style={{ background: colore.bg, color: colore.text }}
      >
        {isMetro ? (
          <Train className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Bus className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="font-semibold text-sm">Linea {linea.nome}</span>
      </div>
      <div className="p-3 space-y-4">
        {linea.direzioni.map((dir) => (
          <DirezioneBlocco
            key={dir.nome}
            direzione={dir}
            nomeFermataCorrente={nomeFermataCorrente}
            onMostraSullaMappa={onMostraSullaMappa}
          />
        ))}
      </div>
    </div>
  );
}

function DirezioneBlocco({
  direzione,
  nomeFermataCorrente,
  onMostraSullaMappa,
}: {
  direzione: DirezioneFinta;
  nomeFermataCorrente: string;
  onMostraSullaMappa?: (fermate: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          → {direzione.nome}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {direzione.arrivi.map((a, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-medium">
              {a.tempo} min
            </Badge>
          ))}
          {direzione.arrivi.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-md border bg-muted/30 py-2 px-2">
        <div className="flex gap-1.5 min-w-max">
          {direzione.fermate.map((nome) => {
            const isCurrent = nome === nomeFermataCorrente;
            return (
              <span
                key={nome}
                className={cn(
                  "shrink-0 px-2 py-1 rounded text-xs font-medium transition-colors",
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground border"
                )}
              >
                {nome}
              </span>
            );
          })}
        </div>
      </div>
      {onMostraSullaMappa && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => onMostraSullaMappa(direzione.fermate)}
        >
          <Map className="h-4 w-4 shrink-0" aria-hidden />
          Mostra sulla mappa
        </Button>
      )}
    </div>
  );
}
