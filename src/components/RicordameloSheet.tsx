import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Clock } from "lucide-react";

interface RicordameloSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (minutesBefore: number) => void;
  loading?: boolean;
}

const options = [
  { label: "30 minuti prima", value: 30 },
  { label: "1 ora prima", value: 60 },
  { label: "2 ore prima", value: 120 },
  { label: "1 giorno prima", value: 1440 },
  { label: "2 giorni prima", value: 2880 },
];

const RicordameloSheet = ({ open, onOpenChange, onSelect, loading }: RicordameloSheetProps) => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Imposta promemoria
          </SheetTitle>
          <SheetDescription>
            Riceverai una notifica push e un'email prima dell'inizio dell'evento.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-2">
          {options.map((opt) => (
            <Button
              key={opt.value}
              variant={selected === opt.value ? "default" : "outline"}
              className="w-full justify-start gap-2"
              onClick={() => setSelected(opt.value)}
              disabled={loading}
            >
              <Clock className="w-4 h-4" />
              {opt.label}
            </Button>
          ))}
        </div>
        <Button
          className="w-full mt-4"
          disabled={selected === null || loading}
          onClick={() => {
            if (selected !== null) onSelect(selected);
          }}
        >
          {loading ? "Salvataggio..." : "Conferma promemoria"}
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default RicordameloSheet;
