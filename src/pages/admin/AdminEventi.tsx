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
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const AdminEventi = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoriaEventoId, setCategoriaEventoId] = useState<string | null>(null);

  // Carica l'ID della categoria "evento"
  useQuery({
    queryKey: ['categoria-evento-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorie_annunci")
        .select("id")
        .eq("nome", "evento")
        .single();
      
      if (error) {
        console.error("Errore nel caricamento della categoria evento:", error);
        return null;
      }
      
      if (data) {
        setCategoriaEventoId(data.id);
      }
      return data?.id;
    },
  });

  // Carica tutti gli annunci della categoria "evento"
  const { data: eventi = [], isLoading } = useQuery({
    queryKey: ['admin-eventi-annunci', categoriaEventoId],
    queryFn: async () => {
      if (!categoriaEventoId) return [];

      const { data, error } = await supabase
        .from('annunci')
        .select('*, categorie_annunci(*)')
        .eq('categoria_id', categoriaEventoId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Carica i profili degli utenti
      const userIds = [...new Set(data.map(e => e.user_id))];
      const { data: profili } = await supabase
        .from('profiles')
        .select('user_id, nome, cognome, email')
        .in('user_id', userIds);

      const profiliMap = new Map(profili?.map(p => [p.user_id, p]) || []);

      return data.map(evento => ({
        ...evento,
        utente: profiliMap.get(evento.user_id) || { 
          nome: 'Utente', 
          cognome: '', 
          email: 'n/a' 
        },
        // Estrai data e luogo dalla descrizione (se salvati lì)
        data_evento: evento.descrizione?.match(/📅 Data: (.*?)\n/)?.[1] || "Data non specificata",
        luogo_evento: evento.descrizione?.match(/📍 Luogo: (.*?)$/)?.[1] || evento.quartiere || "Luogo non specificato",
      }));
    },
    enabled: !!categoriaEventoId,
  });

  // Approva evento
  const approvaEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('annunci')
        .update({ stato: 'attivo' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eventi-annunci'] });
      toast({
        title: "Evento approvato",
        description: "L'evento è ora visibile al pubblico.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile approvare l'evento.",
        variant: "destructive",
      });
    },
  });

  // Rifiuta evento
  const rifiutaEvento = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase
        .from('annunci')
        .update({ stato: 'rifiutato' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eventi-annunci'] });
      toast({
        title: "Evento rifiutato",
        description: "L'evento non sarà visibile al pubblico.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare l'evento.",
        variant: "destructive",
      });
    },
  });

  // Elimina evento (permanente)
  const eliminaEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('annunci')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-eventi-annunci'] });
      toast({
        title: "Evento eliminato",
        description: "L'evento è stato rimosso definitivamente.",
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

  const getStatoBadge = (stato: string) => {
    switch(stato) {
      case 'attivo':
        return <Badge className="bg-green-500">Attivo</Badge>;
      case 'in_moderazione':
        return <Badge variant="secondary">In moderazione</Badge>;
      case 'rifiutato':
        return <Badge variant="destructive">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{stato}</Badge>;
    }
  };

  const filteredEventi = eventi.filter((e: any) => 
    e.titolo.toLowerCase().includes(search.toLowerCase()) ||
    e.utente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.luogo_evento?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totale: eventi.length,
    inModerazione: eventi.filter((e: any) => e.stato === 'in_moderazione').length,
    attivi: eventi.filter((e: any) => e.stato === 'attivo').length,
    rifiutati: eventi.filter((e: any) => e.stato === 'rifiutato').length,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In moderazione</p>
                <p className="text-2xl font-bold">{stats.inModerazione}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eventi attivi</p>
                <p className="text-2xl font-bold">{stats.attivi}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rifiutati</p>
                <p className="text-2xl font-bold">{stats.rifiutati}</p>
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
                  filteredEventi.map((evento: any) => (
                    <TableRow key={evento.id}>
                      <TableCell className="font-medium">
                        {evento.titolo}
                      </TableCell>
                      <TableCell>
                        {evento.utente?.nome || 'Utente'} {evento.utente?.cognome || ''}
                        <div className="text-xs text-muted-foreground">
                          {evento.utente?.email || 'Email non disponibile'}
                        </div>
                      </TableCell>
                      <TableCell>{evento.data_evento}</TableCell>
                      <TableCell>{evento.luogo_evento}</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>{getStatoBadge(evento.stato)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/categoria/evento`)}
                            >
                              <Eye className="w-4 h-4 mr-2" /> Vai alla pagina
                            </DropdownMenuItem>
                            
                            {evento.stato === 'in_moderazione' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => approvaEvento.mutate(evento.id)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Approva
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const motivo = prompt("Inserisci il motivo del rifiuto:");
                                    if (motivo) {
                                      rifiutaEvento.mutate({ id: evento.id, motivo });
                                    }
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2 text-red-600" /> Rifiuta
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm("Sei sicuro di voler eliminare definitivamente questo evento?")) {
                                  eliminaEvento.mutate(evento.id);
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
                  ))
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