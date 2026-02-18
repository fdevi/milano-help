import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, MapPin, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";

// Mock data
const MOCK_POSTS = [
  {
    id: "1",
    autore: "Maria Rossi",
    iniziali: "MR",
    quartiere: "Navigli",
    avatar: null,
    data: "2 ore fa",
    testo: "Ciao a tutti! Qualcuno conosce un buon idraulico nella zona Navigli? Ho un rubinetto che perde da stamattina. Grazie mille! 🙏",
    immagini: [],
    likes: 5,
    commenti: 3,
    liked: false,
  },
  {
    id: "2",
    autore: "Luca Bianchi",
    iniziali: "LB",
    quartiere: "Isola",
    avatar: null,
    data: "4 ore fa",
    testo: "Regalo divano in buone condizioni, zona Isola. Chi lo vuole deve venirlo a prendere entro domani. Misure: 2m x 0.90m, colore grigio.",
    immagini: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop"],
    likes: 12,
    commenti: 8,
    liked: false,
  },
  {
    id: "3",
    autore: "Anna Verdi",
    iniziali: "AV",
    quartiere: "Porta Romana",
    avatar: null,
    data: "6 ore fa",
    testo: "Organizzo un gruppo di corsa nel parco Ravizza, ogni martedì e giovedì alle 7:00. Tutti i livelli sono benvenuti! Chi si unisce? 🏃‍♀️",
    immagini: [],
    likes: 23,
    commenti: 15,
    liked: true,
  },
  {
    id: "4",
    autore: "Giuseppe Neri",
    iniziali: "GN",
    quartiere: "Città Studi",
    avatar: null,
    data: "ieri",
    testo: "Attenzione: hanno rubato diverse bici in via Celoria questa settimana. State attenti e usate lucchetti robusti! Ho fatto denuncia. Qualcun altro ha avuto lo stesso problema?",
    immagini: [],
    likes: 45,
    commenti: 22,
    liked: false,
  },
  {
    id: "5",
    autore: "Francesca Russo",
    iniziali: "FR",
    quartiere: "Brera",
    avatar: null,
    data: "ieri",
    testo: "Lezioni di italiano per stranieri gratuite alla biblioteca di Brera, ogni sabato dalle 10 alle 12. Aiutiamo i nostri nuovi vicini! ❤️",
    immagini: ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop"],
    likes: 67,
    commenti: 12,
    liked: true,
  },
];

const PostCard = ({ post }: { post: typeof MOCK_POSTS[0] }) => {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {post.iniziali}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm text-foreground">{post.autore}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>{post.quartiere}</span>
            <span>·</span>
            <span>{post.data}</span>
          </div>
        </div>
        <button className="p-1 rounded hover:bg-muted transition-colors">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground leading-relaxed">{post.testo}</p>
      </div>

      {/* Images */}
      {post.immagini.length > 0 && (
        <div className="px-4 pb-3">
          <img
            src={post.immagini[0]}
            alt=""
            className="rounded-lg w-full h-64 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-primary" /> {likeCount}
        </span>
        <span>{post.commenti} commenti</span>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-around p-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-1.5 text-xs ${liked ? "text-primary" : "text-muted-foreground"}`}
          onClick={toggleLike}
        >
          <ThumbsUp className={`w-4 h-4 ${liked ? "fill-primary" : ""}`} />
          Mi piace
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          Commenta
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs text-muted-foreground">
          <Share2 className="w-4 h-4" />
          Condividi
        </Button>
      </div>
    </Card>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = useState(3);
  const visiblePosts = MOCK_POSTS.slice(0, visibleCount);

  return (
    <AuthLayout>
      {/* Composer placeholder */}
      <Card className="p-4 mb-6 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">U</AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-muted/50 rounded-full px-4 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
            Cosa succede nel tuo quartiere?
          </div>
        </div>
      </Card>

      {/* Feed */}
      <div className="space-y-4">
        {visiblePosts.map((post, i) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </div>

      {visibleCount < MOCK_POSTS.length && (
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => Math.min(c + 3, MOCK_POSTS.length))}
          >
            Carica altri post
          </Button>
        </div>
      )}
    </AuthLayout>
  );
};

export default Home;
