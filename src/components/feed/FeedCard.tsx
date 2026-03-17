import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Megaphone, CalendarDays, Store, Building2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PostImageGrid from "@/components/gruppi/PostImageGrid";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type FeedItemType = "annuncio" | "evento" | "negozio" | "professionista" | "post_gruppo";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title?: string | null;
  text?: string | null;
  images?: string[];
  created_at: string;
  author: {
    user_id: string;
    nome: string | null;
    cognome: string | null;
    avatar_url: string | null;
    quartiere?: string | null;
  } | null;
  gruppo_nome?: string | null;
  gruppo_id?: string | null;
  link: string;
  categoria_label?: string | null;
  categoria_nome?: string | null;
}

const typeConfig: Record<FeedItemType, { icon: typeof Megaphone; label: string; color: string }> = {
  annuncio: { icon: Megaphone, label: "Annuncio", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  evento: { icon: CalendarDays, label: "Evento", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  negozio: { icon: Store, label: "Negozio", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  professionista: { icon: Building2, label: "Professionista", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  post_gruppo: { icon: Users, label: "Gruppo", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
};

const categoriaBadgeColor: Record<string, string> = {
  "in_vendita":             "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "regalo":                 "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "immobili":               "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  "cerco":                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "offro_servizio":         "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "studenti_e_insegnanti":  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  "aiuto_anziani":          "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "negozi_di_quartiere":    "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  "bambini":                "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
  "evento":                 "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Professionisti":         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "dog_sitter":             "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "adesso";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} g`;
  return new Date(date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
};

const FeedCard = ({ item }: { item: FeedItem }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const config = typeConfig[item.type];
  const TypeIcon = config.icon;

  const author = item.author;
  const name = author ? `${author.nome || ""} ${author.cognome || ""}`.trim() || "Utente" : "Utente";
  const initials = author ? `${(author.nome || "U")[0]}${(author.cognome || "")[0]}`.toUpperCase() : "U";
  const locationLabel = item.type === "post_gruppo" ? item.gruppo_nome : author?.quartiere;

  const text = item.text || "";
  const isLong = text.length > 200 || text.split("\n").length > 4;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${item.link}` : item.link;
  const shareTitle = item.title || text.slice(0, 60) || "Guarda su MilanoHelp";

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);
    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank");
        break;
      case "email":
        window.open(`mailto:?subject=${encodedTitle}&body=${encodedUrl}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copiato!");
        break;
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar
          className="h-10 w-10 shrink-0 cursor-pointer"
          onClick={() => navigate(item.link)}
        >
          <AvatarImage src={author?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(item.link)}>
          <p className="font-semibold text-sm leading-tight">{name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
            {locationLabel && <span>{locationLabel}</span>}
            {locationLabel && <span>·</span>}
            <span>{timeAgo(item.created_at)}</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <Badge variant="secondary" className={`shrink-0 gap-1 text-[10px] px-1.5 py-0.5 ${config.color}`}>
          <TypeIcon className="w-3 h-3" />
          {item.type === "annuncio" && item.categoria_label ? item.categoria_label.toUpperCase() : config.label}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleShare("whatsapp")}>WhatsApp</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("facebook")}>Facebook</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("email")}>Email</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("copy")}>Copia link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      {item.title && (
        <div className="px-4 pb-1 cursor-pointer" onClick={() => navigate(item.link)}>
          <h3 className="font-semibold text-base">{item.title}</h3>
        </div>
      )}

      {/* Text */}
      {text && text !== "(foto)" && (
        <div className="px-4 pb-2">
          <p
            className={`text-sm leading-relaxed whitespace-pre-line ${!expanded && isLong ? "line-clamp-4" : ""}`}
            style={!expanded && isLong ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
          >
            {text}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-medium text-primary hover:underline mt-1"
            >
              {expanded ? "Riduci" : "Continua a leggere"}
            </button>
          )}
        </div>
      )}

      {/* Images */}
      {item.images && item.images.length > 0 && (
        <div className="cursor-pointer" onClick={() => navigate(item.link)}>
          <PostImageGrid images={item.images} />
        </div>
      )}

      {/* Share bar */}
      <div className="px-2 py-1 flex items-center border-t">
        <Button variant="ghost" size="sm" onClick={() => handleShare("whatsapp")} className="flex-1 gap-1.5 text-muted-foreground text-xs">
          WhatsApp
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleShare("facebook")} className="flex-1 gap-1.5 text-muted-foreground text-xs">
          Facebook
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleShare("email")} className="flex-1 gap-1.5 text-muted-foreground text-xs">
          Email
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleShare("copy")} className="flex-1 gap-1.5 text-muted-foreground text-xs">
          <Share2 className="w-3.5 h-3.5" /> Link
        </Button>
      </div>
    </Card>
  );
};

export default FeedCard;
