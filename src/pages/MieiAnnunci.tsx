import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface Annuncio {
  id: string;
  titolo: string;
  descrizione: string | null;
  stato: string;
  motivo_rifiuto: string | null;
  created_at: string;
  prezzo: number | null;
  categoria?: { label: string } | null;
}

const statoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  in_moderazione: { label: "In moderazione", variant: "secondary", icon: Clock },
  attivo: { label: "Attivo", variant: "default", icon: CheckCircle },
  rifiutato: { label: "Rifiutato", variant: "destructive", icon: XCircle },
  chiuso: { label: "Chiuso", variant: "outline", icon: AlertTriangle },
  eliminato: { label: "Eliminato", variant: "destructive", icon: XCircle },
};

const MieiAnnunci = () => {
  const { user } = useAuth();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [rifiutoDetail, setRifiutoDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("annunci")
      .select("*, categoria:categorie_annunci(label)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAnnunci((data as Annuncio[]) ?? []));
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-extrabold text-2xl">I miei annunci</h1>
          <Button className="gap-2" disabled>
            <Plus className="w-4 h-4" /> Nuovo annuncio
          </Button>
        </div>

        {annunci.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Non hai ancora pubblicato annunci.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {annunci.map((a) => {
              const config = statoConfig[a.stato] ?? statoConfig.chiuso;
              const Icon = config.icon;
              return (
                <Card key={a.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{a.titolo}</h3>
                        {(a.categoria as any)?.label && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {(a.categoria as any).label}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("it-IT")}
                        {a.prezzo != null && ` · €${a.prezzo}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.variant} className="gap-1">
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                      {a.stato === "rifiutato" && a.motivo_rifiuto && (
                        <Button size="sm" variant="ghost" onClick={() => setRifiutoDetail(a.motivo_rifiuto)}>
                          Motivo
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={!!rifiutoDetail} onOpenChange={() => setRifiutoDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo del rifiuto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{rifiutoDetail}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MieiAnnunci;
