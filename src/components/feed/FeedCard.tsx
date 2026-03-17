import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Globe, Megaphone, CalendarDays, Store, Building2, Users, MessageSquare, Copy, Mail, CheckCircle2, HelpCircle, Star, Bell, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PostImageGrid from "@/components/gruppi/PostImageGrid";
import RicordameloSheet from "@/components/RicordameloSheet";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  likes_count?: number;
  data?: string | null;
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

const FeedCard = ({ item, currentUserId }: { item: FeedItem; currentUserId?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const navigate = useNavigate();
  const config = typeConfig[item.type];
  const TypeIcon = config.icon;

  // Event-specific state
  const [partecipazione, setPartecipazione] = useState<string | null>(null); // "confermato" | "forse" | "interessato"
  const [isSaved, setIsSaved] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

  const author = item.author;
  const name = author ? `${author.nome || ""} ${author.cognome || ""}`.trim() || "Utente" : "Utente";
  const initials = author ? `${(author.nome || "U")[0]}${(author.cognome || "")[0]}`.toUpperCase() : "U";
  const locationLabel = item.type === "post_gruppo" ? item.gruppo_nome : author?.quartiere;

  const text = item.text || "";
  const isLong = text.length > 200 || text.split("\n").length > 4;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}${item.link}` : item.link;
  const shareTitle = item.title || text.slice(0, 60) || "Guarda su MilanoHelp";

  const showContact = !!(author?.user_id && currentUserId && author.user_id !== currentUserId);

  // Check if user has liked this item
  useEffect(() => {
    if (!currentUserId) return;
    if (item.type === "annuncio" || item.type === "negozio" || item.type === "professionista") {
      supabase.from("annunci_mi_piace").select("user_id").eq("annuncio_id", item.id).eq("user_id", currentUserId).then(({ data }) => {
        if (data && data.length > 0) setLiked(true);
      });
    } else if (item.type === "evento") {
      supabase.from("eventi_mi_piace").select("user_id").eq("evento_id", item.id).eq("user_id", currentUserId).then(({ data }) => {
        if (data && data.length > 0) setLiked(true);
      });
    } else if (item.type === "post_gruppo") {
      supabase.from("gruppi_messaggi_piace").select("user_id").eq("messaggio_id", item.id).eq("user_id", currentUserId).then(({ data }) => {
        if (data && data.length > 0) setLiked(true);
      });
    }
  }, [currentUserId, item.id, item.type]);

  // Load event participation & saved state
  useEffect(() => {
    if (!currentUserId || item.type !== "evento") return;
    supabase.from("eventi_partecipanti").select("stato").eq("evento_id", item.id).eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => { if (data) setPartecipazione(data.stato); });
    supabase.from("eventi_preferiti").select("id").eq("evento_id", item.id).eq("user_id", currentUserId).maybeSingle()
      .then(({ data }) => { if (data) setIsSaved(true); });
  }, [currentUserId, item.id, item.type]);

  const handleLike = async () => {
    if (!currentUserId || likeLoading) return;
    setLikeLoading(true);

    if (item.type === "annuncio" || item.type === "negozio" || item.type === "professionista") {
      const { data } = await supabase.rpc("toggle_like_annuncio", { _annuncio_id: item.id });
      if (data !== null && data !== undefined) {
        setLikesCount(data);
        setLiked(!liked);
      }
    } else if (item.type === "evento") {
      if (liked) {
        await supabase.from("eventi_mi_piace").delete().eq("evento_id", item.id).eq("user_id", currentUserId);
        setLikesCount((c) => Math.max(0, c - 1));
        setLiked(false);
      } else {
        await supabase.from("eventi_mi_piace").insert({ evento_id: item.id, user_id: currentUserId });
        setLikesCount((c) => c + 1);
        setLiked(true);
      }
    } else if (item.type === "post_gruppo") {
      if (liked) {
        await supabase.from("gruppi_messaggi_piace").delete().eq("messaggio_id", item.id).eq("user_id", currentUserId);
        setLikesCount((c) => Math.max(0, c - 1));
        setLiked(false);
      } else {
        await supabase.from("gruppi_messaggi_piace").insert({ messaggio_id: item.id, user_id: currentUserId });
        setLikesCount((c) => c + 1);
        setLiked(true);
      }
    }
    setLikeLoading(false);
  };

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

  const handleContact = async () => {
    if (!currentUserId || !author?.user_id || currentUserId === author.user_id) return;

    if (item.type === "annuncio" || item.type === "negozio" || item.type === "professionista") {
      const { data: existing } = await supabase
        .from("conversazioni_private")
        .select("id")
        .eq("annuncio_id", item.id)
        .or(`acquirente_id.eq.${currentUserId},venditore_id.eq.${currentUserId}`)
        .limit(1);

      if (existing && existing.length > 0) {
        navigate(`/chat/${existing[0].id}`);
        return;
      }

      const { data: newConv } = await supabase
        .from("conversazioni_private")
        .insert({
          annuncio_id: item.id,
          acquirente_id: currentUserId,
          venditore_id: author.user_id,
        })
        .select("id")
        .single();

      if (newConv) {
        navigate(`/chat/${newConv.id}`);
      }
    } else {
      navigate(item.link);
    }
  };

  // Event-specific actions
  const handlePartecipazione = async (stato: string) => {
    if (!currentUserId) return;
    if (partecipazione === stato) {
      // Remove participation
      await supabase.from("eventi_partecipanti").delete().eq("evento_id", item.id).eq("user_id", currentUserId);
      setPartecipazione(null);
      toast.success("Partecipazione rimossa");
    } else {
      if (partecipazione) {
        // Update
        await supabase.from("eventi_partecipanti").update({ stato }).eq("evento_id", item.id).eq("user_id", currentUserId);
      } else {
        // Insert
        await supabase.from("eventi_partecipanti").insert({ evento_id: item.id, user_id: currentUserId, stato });
      }
      setPartecipazione(stato);
      const labels: Record<string, string> = { confermato: "Parteciperò!", forse: "Forse parteciperò", interessato: "Sono interessato" };
      toast.success(labels[stato] || stato);
    }
  };

  const handleSavePreferito = async () => {
    if (!currentUserId) return;
    if (isSaved) {
      await supabase.from("eventi_preferiti").delete().eq("evento_id", item.id).eq("user_id", currentUserId);
      setIsSaved(false);
      toast.success("Rimosso dai preferiti");
    } else {
      await supabase.from("eventi_preferiti").insert({ evento_id: item.id, user_id: currentUserId });
      setIsSaved(true);
      toast.success("Salvato nei preferiti");
    }
  };

  const handleReminderSelect = async (minutesBefore: number) => {
    if (!currentUserId || !item.data) return;
    setReminderLoading(true);
    const eventDate = new Date(item.data);
    const reminderDate = new Date(eventDate.getTime() - minutesBefore * 60 * 1000);
    await supabase.from("eventi_promemoria").insert({
      evento_id: item.id,
      user_id: currentUserId,
      orario_promemoria: reminderDate.toISOString(),
      tipo: `${minutesBefore}_min`,
    });
    setReminderLoading(false);
    setReminderOpen(false);
    toast.success("Promemoria impostato!");
  };

  // Dropdown menu item style for mobile touch targets
  const menuItemClass = "min-h-[44px] flex items-center gap-2 text-sm px-3 py-2.5 cursor-pointer touch-manipulation";

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
        <Badge variant="secondary" className={`shrink-0 gap-1 text-[10px] px-1.5 py-0.5 ${
          item.type === "annuncio" && item.categoria_nome
            ? (categoriaBadgeColor[item.categoria_nome] || config.color)
            : config.color
        }`}>
          <TypeIcon className="w-3 h-3" />
          {item.type === "annuncio" && item.categoria_label ? item.categoria_label.toUpperCase() : config.label}
        </Badge>

        {/* Three-dots menu - always DropdownMenu */}
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 touch-manipulation"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto z-[100]" sideOffset={4}>
            {/* Event-specific actions */}
            {item.type === "evento" && currentUserId && (
              <>
                <DropdownMenuItem className={menuItemClass} onClick={() => handlePartecipazione("confermato")}>
                  <CheckCircle2 className={`w-4 h-4 ${partecipazione === "confermato" ? "text-green-600" : ""}`} />
                  {partecipazione === "confermato" ? "✓ Parteciperò" : "Parteciperò"}
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onClick={() => handlePartecipazione("forse")}>
                  <HelpCircle className={`w-4 h-4 ${partecipazione === "forse" ? "text-amber-500" : ""}`} />
                  {partecipazione === "forse" ? "✓ Forse" : "Forse"}
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onClick={() => handlePartecipazione("interessato")}>
                  <Star className={`w-4 h-4 ${partecipazione === "interessato" ? "text-yellow-500" : ""}`} />
                  {partecipazione === "interessato" ? "✓ Sono interessato" : "Sono interessato"}
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onClick={(e) => { e.preventDefault(); setReminderOpen(true); }}>
                  <Bell className="w-4 h-4" />
                  Ricordamelo
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onClick={() => handleSavePreferito()}>
                  <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current text-primary" : ""}`} />
                  {isSaved ? "Salvato ✓" : "Salva nei preferiti"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Contact */}
            {showContact && (
              <>
                <DropdownMenuItem className={menuItemClass} onClick={handleContact}>
                  <MessageSquare className="w-4 h-4" /> Contatta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Share actions */}
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("whatsapp")}>
              <Share2 className="w-4 h-4 text-green-600" /> WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("facebook")}>
              <Globe className="w-4 h-4 text-blue-600" /> Facebook
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("email")}>
              <Mail className="w-4 h-4" /> Email
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("copy")}>
              <Copy className="w-4 h-4" /> Copia link
            </DropdownMenuItem>
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
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-sm font-medium text-primary hover:underline mt-1 min-h-[44px] flex items-center touch-manipulation"
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

      {/* Action bar: Mi piace, Commenta, Condividi */}
      <div className="px-2 py-1 flex items-center border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={likeLoading || !currentUserId}
          className={`flex-1 gap-1.5 text-xs min-h-[44px] touch-manipulation ${liked ? "text-red-500" : "text-muted-foreground"}`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          {likesCount > 0 ? likesCount : ""} Mi piace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(item.link)}
          className="flex-1 gap-1.5 text-muted-foreground text-xs min-h-[44px] touch-manipulation"
        >
          <MessageCircle className="w-5 h-5" /> Commenta
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-muted-foreground text-xs min-h-[44px] touch-manipulation">
              <Share2 className="w-5 h-5" /> Condividi
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[100]">
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("whatsapp")}>WhatsApp</DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("facebook")}>Facebook</DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("email")}>Email</DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onClick={() => handleShare("copy")}>Copia link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Ricordamelo Sheet */}
      <RicordameloSheet
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        onSelect={handleReminderSelect}
        loading={reminderLoading}
      />
    </Card>
  );
};

export default FeedCard;
