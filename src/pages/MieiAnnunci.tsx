import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Annuncio {
  id: string;
  titolo: string;
  descrizione: string | null;
  stato: string;
  motivo_rifiuto: string | null;
  created_at: string;
  prezzo: number | null;
  immagini: string[] | null;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [rifiutoDetail, setRifiutoDetail] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnunci = () => {
    if (!user) return;
    supabase
      .from("annunci")
      .select("*, categoria:categorie_annunci(label)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAnnunci((data as Annuncio[]) ?? []));
  };

  useEffect(() => {
    fetchAnnunci();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("annunci")
      .update({ stato: "eliminato" } as any)
      .eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare l'annuncio.", variant: "destructive" });
    } else {
      toast({ title: "Annuncio eliminato" });
      fetchAnnunci();
      queryClient.invalidateQueries({ queryKey: ["annunci"] });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading font-extrabold text-2xl">I miei annunci</h1>
          <Link to="/nuovo-annuncio">
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuovo annuncio
            </Button>
          </Link>
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
              const firstImg = a.immagini?.filter(Boolean)?.[0];
              return (
                <Card key={a.id} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Image preview */}
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {firstImg ? (
                        <img src={firstImg} alt={a.titolo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                          Nessuna foto
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link to={`/annuncio/${a.id}`} className="font-medium truncate hover:text-primary transition-colors">
                          {a.titolo}
                        </Link>
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
                      {a.stato === "in_moderazione" && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⏳ In attesa di approvazione</p>
                      )}
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
                      {a.stato !== "eliminato" && (
                        <>
                          <Link to={`/nuovo-annuncio?edit=${a.id}`}>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
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

      {/* Rifiuto detail dialog */}
      <Dialog open={!!rifiutoDetail} onOpenChange={() => setRifiutoDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo del rifiuto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{rifiutoDetail}</p>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina annuncio</DialogTitle>
            <DialogDescription>Sei sicuro di voler eliminare questo annuncio? L'azione non è reversibile.</DialogDescription>
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

export default MieiAnnunci;
