import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  MapPin,
  Users,
  Search,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const AdminEventi = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Carica tutti gli eventi con i dati degli organizzatori
  const { data: eventi = [], isLoading } = useQuery({
    queryKey: ['admin-eventi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventi')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Carica i profili degli organizzatori
      const organizzatoriIds = [...new Set(data.map(e => e.organizzatore_id))];
      const { data: profili } = await supabase
        .from('profiles')
        .select('user_id, nome, cognome, email')
        .in('user_id', organizzatoriIds);

      const profiliMap = new Map(profili?.map(p => [p.user_id, p]) || []);

      return data.map(evento => ({
        ...evento,
        organizzatore: profiliMap.get(evento.organizzatore_id) || { 
          nome: 'Utente', 
          cognome: '', 
          email: 'n/a' 
        }
      }));
    },
  });

  // Elimina evento
  const deleteEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eventi')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eventi'] });
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato rimosso con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'evento.",
        variant: "destructive",
      });
    },
  });

  const filteredEventi = eventi.filter((e: any) => 
    e.titolo.toLowerCase().includes(search.toLowerCase()) ||
    e.organizzatore?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.luogo.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totale: eventi.length,
    oggi: eventi.filter((e: any) => 
      new Date(e.data).toDateString() === new Date().toDateString()
    ).length,
    prossimi: eventi.filter((e: any) => new Date(e.data) > new Date()).length,
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Gestione Eventi</h1>
            <p className="text-sm text-muted-foreground">
              Visualizza e gestisci tutti gli eventi della piattaforma
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Totale eventi</p>
                <p className="text-2xl font-bold">{stats.totale}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventi oggi</p>
                <p className="text-2xl font-bold">{stats.oggi}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prossimi eventi</p>
                <p className="text-2xl font-bold">{stats.prossimi}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca eventi per titolo, organizzatore o luogo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Eventi Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Organizzatore</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Luogo</TableHead>
                  <TableHead>Partecipanti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-[100px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Caricamento eventi...
                    </TableCell>
                  </TableRow>
                ) : filteredEventi.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Nessun evento trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEventi.map((evento: any) => {
                    const dataEvento = new Date(evento.data);
                    const oggi = new Date();
                    const isPassato = dataEvento < oggi;
                    
                    return (
                      <TableRow key={evento.id}>
                        <TableCell className="font-medium">
                          {evento.titolo}
                        </TableCell>
                        <TableCell>
                          {evento.organizzatore?.nome || 'Utente'} {evento.organizzatore?.cognome || ''}
                          <div className="text-xs text-muted-foreground">
                            {evento.organizzatore?.email || 'Email non disponibile'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(dataEvento, "d MMM yyyy, HH:mm", { locale: it })}
                        </TableCell>
                        <TableCell>{evento.luogo}</TableCell>
                        <TableCell>{evento.partecipanti || 0}</TableCell>
                        <TableCell>
                          <Badge variant={isPassato ? "secondary" : "default"}>
                            {isPassato ? "Passato" : "In arrivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => navigate(`/eventi`)}
                              >
                                <Eye className="w-4 h-4 mr-2" /> Vai alla pagina
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => navigate(`/modifica-evento/${evento.id}`)}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm("Sei sicuro di voler eliminare questo evento?")) {
                                    deleteEvento.mutate(evento.id);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminEventi;