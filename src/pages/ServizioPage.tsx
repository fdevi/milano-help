import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/AuthLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Briefcase, CalendarCheck, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

const ServizioPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [booking, setBooking] = useState(false);

  const { data: servizio, isLoading } = useQuery({
    queryKey: ["servizio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("servizi").select("*").eq("id", id!).single();
      if (error) throw error;

      const { data: profile } = await supabase.from("profiles").select("nome, cognome, email, quartiere").eq("user_id", data.operatore_id).single();

      const { data: cat } = data.categoria_id
        ? await supabase.from("categorie").select("nome").eq("id", data.categoria_id).single()
        : { data: null };

      return { ...data, operatore: profile, categoria_nome: cat?.nome || null };
    },
    enabled: !!id,
  });

  const handlePrenota = async () => {
    if (!user) { navigate("/login"); return; }
    setBooking(true);
    const { error } = await supabase.from("prenotazioni").insert({
      servizio_id: id!,
      utente_id: user.id,
      stato: "confermata",
      note: note.trim() || null,
    });
    setBooking(false);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prenotazione confermata!", description: "L'operatore riceverà una notifica." });
      setNote("");
    }
  };

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (!servizio) {
    return (
      <AuthLayout>
        <div className="max-w-3xl mx-auto text-center py-12">
          <p className="text-muted-foreground">Servizio non trovato</p>
          <Button variant="outline" className="mt-4" asChild><Link to="/servizi">Torna ai servizi</Link></Button>
        </div>
      </AuthLayout>
    );
  }

  const isOwner = user?.id === servizio.operatore_id;

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Indietro
        </Button>

        {servizio.immagini && servizio.immagini.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-6 rounded-lg overflow-hidden">
            {servizio.immagini.map((img: string, i: number) => (
              <img key={i} src={img} alt={servizio.titolo} className="w-full h-48 object-cover" />
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{servizio.titolo}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              {servizio.categoria_nome && <Badge variant="secondary">{servizio.categoria_nome}</Badge>}
              {servizio.quartiere && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{servizio.quartiere}</span>
              )}
              <span>{formatDistanceToNow(new Date(servizio.created_at), { addSuffix: true, locale: it })}</span>
            </div>
          </div>
          {servizio.prezzo != null && servizio.prezzo > 0 && (
            <span className="text-2xl font-heading font-bold text-primary">€{Number(servizio.prezzo).toFixed(2)}</span>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-foreground whitespace-pre-wrap">{servizio.descrizione || "Nessuna descrizione disponibile."}</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-heading font-bold text-sm mb-2">Operatore</h3>
            <p className="text-foreground">{servizio.operatore?.nome} {servizio.operatore?.cognome}</p>
            {servizio.operatore?.quartiere && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />{servizio.operatore.quartiere}
              </p>
            )}
          </CardContent>
        </Card>

        {!isOwner && user && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" /> Prenota questo servizio
              </h3>
              <Textarea
                placeholder="Note aggiuntive (opzionale)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
              <Button onClick={handlePrenota} disabled={booking} className="w-full">
                {booking ? "Prenotazione in corso..." : "Prenota ora"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground mb-3">Accedi per prenotare questo servizio</p>
              <Button asChild><Link to="/login">Accedi</Link></Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthLayout>
  );
};

export default ServizioPage;
