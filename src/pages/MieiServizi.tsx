import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthLayout from "@/components/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Briefcase } from "lucide-react";

const statusColors: Record<string, string> = {
  attivo: "bg-primary/10 text-primary",
  in_attesa: "bg-secondary/10 text-secondary-foreground",
  rifiutato: "bg-destructive/10 text-destructive",
  disattivato: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  attivo: "Attivo",
  in_attesa: "In attesa di approvazione",
  rifiutato: "Rifiutato",
  disattivato: "Disattivato",
};

const MieiServizi = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: servizi, isLoading } = useQuery({
    queryKey: ["miei-servizi", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("servizi")
        .select("id, titolo, descrizione, stato, created_at, categoria_id")
        .eq("operatore_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("servizi").delete().eq("id", id);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Servizio eliminato" });
      qc.invalidateQueries({ queryKey: ["miei-servizi"] });
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-bold text-foreground">I miei servizi</h1>
          <Button asChild>
            <Link to="/nuovo-servizio" className="gap-2"><Plus className="w-4 h-4" /> Nuovo servizio</Link>
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Caricamento...</CardContent></Card>
        ) : (servizi || []).length === 0 ? (
          <Card className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Non hai ancora creato servizi</p>
            <Button variant="default" size="sm" className="mt-4" asChild>
              <Link to="/nuovo-servizio">Crea il tuo primo servizio</Link>
            </Button>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(servizi || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <Link to={`/servizio/${s.id}`} className="hover:underline">{s.titolo}</Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[s.stato] || ""}>{statusLabels[s.stato] || s.stato}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("it-IT")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default MieiServizi;
