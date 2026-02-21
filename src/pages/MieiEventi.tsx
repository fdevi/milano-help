import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, Pencil, Trash2, Calendar, MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const statoConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  in_moderazione: { label: "In moderazione", variant: "secondary", icon: Clock },
  attivo: { label: "Attivo", variant: "default", icon: CheckCircle },
  rifiutato: { label: "Rifiutato", variant: "destructive", icon: XCircle },
};

const MieiEventi = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [eventi, setEventi] = useState<any[]>([]);
  const [rifiutoDetail, setRifiutoDetail] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEventi = () => {
    if (!user) return;
    (supabase as any)
      .from("eventi")
      .select("*")
      .eq("organizzatore_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }: any) => setEventi(data ?? []));
  };

  useEffect(() => { fetchEventi(); }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from("eventi")
      .delete()
      .eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) {
      toast({ title: "Errore", description: `Impossibile eliminare: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Evento eliminato" });
      fetchEventi();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-extrabold text-2xl">I miei eventi</h1>
          <Link to="/nuovo-evento">
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuovo evento</Button>
          </Link>
        </div>

        {eventi.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Non hai ancora creato eventi.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {eventi.map((e) => {
              const config = statoConfig[e.stato] ?? statoConfig.in_moderazione;
              const Icon = config.icon;
              return (
                <Card key={e.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{e.titolo}</span>
                        {e.categoria && <Badge variant="outline" className="text-xs shrink-0">{e.categoria}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {e.data && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(e.data), "dd/MM/yyyy HH:mm", { locale: it })}
                          </span>
                        )}
                        {e.luogo && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {e.luogo}
                          </span>
                        )}
                      </div>
                      {e.stato === "in_moderazione" && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⏳ In attesa di approvazione</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.variant} className="gap-1">
                        <Icon className="w-3 h-3" />{config.label}
                      </Badge>
                      {e.stato === "rifiutato" && e.motivo_rifiuto && (
                        <Button size="sm" variant="ghost" onClick={() => setRifiutoDetail(e.motivo_rifiuto)}>Motivo</Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/modifica-evento/${e.id}`)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
          <DialogHeader><DialogTitle>Motivo del rifiuto</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{rifiutoDetail}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina evento</DialogTitle>
            <DialogDescription>Sei sicuro? L'azione non è reversibile.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MieiEventi;
