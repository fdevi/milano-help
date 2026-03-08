import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin } from "lucide-react";
import { getPercorsiPerFermata } from "@/lib/fermateFinti";
import { PercorsoLinea } from "@/components/PercorsoLinea";

export interface FermataPerSheet {
  id: string;
  nome: string;
  linee: string[];
}

interface FermataSheetProps {
  fermata: FermataPerSheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMostraSullaMappa?: (fermate: string[]) => void;
}

export function FermataSheet({ fermata, open, onOpenChange, onMostraSullaMappa }: FermataSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-lg overflow-hidden"
      >
        <SheetHeader className="shrink-0 pb-2 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            <SheetTitle className="text-xl">{fermata?.nome ?? "Dettaglio fermata"}</SheetTitle>
          </div>
        </SheetHeader>
        {fermata && (
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <DettaglioPercorsi
              nomeFermata={fermata.nome}
              linee={fermata.linee}
              onMostraSullaMappa={onMostraSullaMappa}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DettaglioPercorsi({
  nomeFermata,
  linee,
  onMostraSullaMappa,
}: {
  nomeFermata: string;
  linee: string[];
  onMostraSullaMappa?: (fermate: string[]) => void;
}) {
  const percorsi = getPercorsiPerFermata(nomeFermata, linee);
  return (
    <div className="space-y-6">
      {percorsi.linee.map((linea) => (
        <PercorsoLinea
          key={linea.nome}
          linea={linea}
          nomeFermataCorrente={nomeFermata}
          onMostraSullaMappa={onMostraSullaMappa}
        />
      ))}
    </div>
  );
}
