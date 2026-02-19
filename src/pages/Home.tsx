import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Calendar,
  Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

interface PostData {
  id: string;
  titolo: string;
  descrizione?: string;
  prezzo?: number;
  immagini?: string[];
  created_at: string;
  quartiere?: string;
  user_id: string;
  autore_nome: string;
  autore_cognome: string;
  autore_avatar?: string | null;
  autore_quartiere?: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

// Funzione per formattare data evento
function formatEventDate(iso: string) {
  const d = new Date(iso);
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const day = dayNames[d.getDay()];
  const date = d.getDate();
  const month = monthNames[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${date} ${month}, ${hours}:${mins}`;
}

// Componente per card evento
const EventCard = ({ event }: { event: any }) => {
  const orgInitials = event.organizzatore_nome?.split(" ").map((w: string) => w[0]).join("").toUpperCase() || "?";

  return (
    <Card className="p-4 hover:shadow-card-hover transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-lg p-2 shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/eventi`} className="hover:underline">
            <h4 className="font-medium text-foreground truncate">{event.titolo}</h4>
          </Link>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatEventDate(event.data)}</span>
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{event.luogo}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[8px]">{orgInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {event.organizzatore_nome || "Utente"}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {event.gratuito ? "Gratuito" : `€${event.prezzo}`}
            </Badge>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {event.partecipanti || 0} partecipanti
        </Badge>
      </div>
    </Card>
  );
};

// Componente per post annuncio (già esistente)
const PostCard = ({ post }: { post: PostData }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);

  const initials = `${(post.autore_nome || "U")[0]}${(post.autore_cognome || "")[0]}`.toUpperCase();
  const displayName = post.autore_nome
    ? `${post.autore_nome}${post.autore_cognome ? ` ${post.autore_cognome[0]}.` : ""}`
    : "Utente";

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: it });

  const toggleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));

    if (newLiked) {
      const { error } = await supabase
        .from("annunci_mi_piace")
        .insert({ annuncio_id: post.id, user_id: user.id });
      if (error) {
        setLiked(!newLiked);
        setLikeCount((c) => c + (newLiked ? -1 : 1));
      }
    } else {
      const { error } = await supabase
        .from("annunci_mi_piace")
        .delete()
        .eq("annuncio_id", post.id)
        .eq("user_id", user.id);
      if (error) {
        setLiked(!newLiked);
        setLikeCount((c) => c + (newLiked ? -1 : 1));
      }
    }
  };

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.autore_avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            {post.autore_quartiere && (
              <>
                {post.autore_quartiere} · {timeAgo}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="font-heading font-bold text-lg">{post.titolo}</p>
        {post.descrizione && (
          <p className="text-sm text-muted-foreground mt-1">{post.descrizione}</p>
        )}
        {post.prezzo != null && post.prezzo > 0 && (
          <Badge className="mt-2">€{post.prezzo.toFixed(2)}</Badge>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" /> {likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" /> {post.comment_count}
        </span>
      </div>

      <Separator className="my-2" />

      {/* Actions */}
      <div className="flex items-center justify-around pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          className={liked ? "text-primary" : ""}
        >
          <Heart className="w-4 h-4 mr-1" fill={liked ? "currentColor" : "none"} />
          Mi piace
        </Button>
        <Button variant="ghost" size="sm">
          <MessageCircle className="w-4 h-4 mr-1" /> Commenta
        </Button>
        <Button variant="ghost" size="sm">
          <Share2 className="w-4 h-4 mr-1" /> Condividi
        </Button>
      </div>
    </Card>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("feed");

  // Carica eventi in primo piano
  const { data: eventiInEvidenza = [], isLoading: loadingEventi } = useQuery({
    queryKey: ['home-eventi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventi')
        .select('*')
        .order('data', { ascending: true })
        .limit(5);
      
      if (error) throw error;

      // Carica i profili degli organizzatori
      const eventiConOrganizzatore = await Promise.all(
        data.map(async (evento) => {
          const { data: profilo } = await supabase
            .from('profiles')
            .select('nome, cognome')
            .eq('user_id', evento.organizzatore_id)
            .single();
          
          return {
            ...evento,
            organizzatore_nome: profilo ? `${profilo.nome || ''} ${profilo.cognome || ''}`.trim() || 'Utente' : 'Utente',
          };
        })
      );
      
      return eventiConOrganizzatore;
    },
  });

  // Carica annunci (feed principale) - già esistente
  // ... (mantieni qui il codice esistente per il feed degli annunci)

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto">
        {/* Tabs per scegliere tra Feed ed Eventi */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full">
            <TabsTrigger value="feed" className="flex-1">Feed</TabsTrigger>
            <TabsTrigger value="eventi" className="flex-1">Eventi</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            {/* QUI METTI IL TUO CODICE ESISTENTE PER IL FEED DEGLI ANNUNCI */}
            {/* Copia qui tutto il codice che già avevi per mostrare gli annunci */}
            <p className="text-muted-foreground text-center py-8">
              I tuoi annunci appariranno qui...
            </p>
          </TabsContent>

          <TabsContent value="eventi" className="mt-4">
            {/* Sezione eventi */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-bold">Prossimi eventi</h2>
                <Link to="/eventi">
                  <Button variant="ghost" size="sm">Vedi tutti</Button>
                </Link>
              </div>

              {loadingEventi ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : eventiInEvidenza.length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nessun evento in programma</p>
                  <Link to="/nuovo-evento">
                    <Button variant="link" className="mt-2">Crea il primo evento</Button>
                  </Link>
                </Card>
              ) : (
                <div className="space-y-3">
                  {eventiInEvidenza.map((evento) => (
                    <EventCard key={evento.id} event={evento} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AuthLayout>
  );
};

export default Home;