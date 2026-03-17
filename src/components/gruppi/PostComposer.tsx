import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImagePlus, Send, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberProfile {
  user_id: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
}

interface PostComposerProps {
  gruppoId: string;
  members: MemberProfile[];
  myProfile?: MemberProfile | null;
  onPostCreated: () => void;
}

const PostComposer = ({ gruppoId, members, myProfile, onPostCreated }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) {
        toast({ title: "File non valido", description: `${f.name} non è un'immagine.`, variant: "destructive" });
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: "File troppo grande", description: `${f.name} supera 5MB.`, variant: "destructive" });
        return false;
      }
      return true;
    });

    const newImages = [...images, ...validFiles].slice(0, 6);
    setImages(newImages);

    const newPreviews = newImages.map(f => URL.createObjectURL(f));
    imagePreviews.forEach(p => URL.revokeObjectURL(p));
    setImagePreviews(newPreviews);
    if (e.target) e.target.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `gruppi/post-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("annunci-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("annunci-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: MemberProfile) => {
    const name = `${member.nome || ""} ${member.cognome || ""}`.trim() || "Utente";
    const textBeforeCursor = text.slice(0, mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const newText = text.slice(0, atIndex) + `@${name} ` + text.slice(mentionCursorPos);
    setText(newText);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter(m => {
    if (m.user_id === user?.id) return false;
    const name = `${m.nome || ""} ${m.cognome || ""}`.trim().toLowerCase();
    return name.includes(mentionFilter);
  });

  const createMentionNotifications = async (postText: string, postId: string) => {
    const mentionRegex = /@([^@\n]+?)(?=\s|$|@)/g;
    let match;
    const mentionedNames: string[] = [];
    while ((match = mentionRegex.exec(postText)) !== null) {
      mentionedNames.push(match[1].trim().toLowerCase());
    }

    if (mentionedNames.length === 0) return;

    const mentionedUsers = members.filter(m => {
      const name = `${m.nome || ""} ${m.cognome || ""}`.trim().toLowerCase();
      return mentionedNames.includes(name) && m.user_id !== user?.id;
    });

    const myName = myProfile ? `${myProfile.nome || ""} ${myProfile.cognome || ""}`.trim() || "Qualcuno" : "Qualcuno";

    for (const mu of mentionedUsers) {
      await supabase.from("notifiche").insert({
        user_id: mu.user_id,
        tipo: "menzione_gruppo",
        titolo: "Ti hanno menzionato",
        messaggio: `${myName} ti ha menzionato in un post`,
        link: `/gruppo/${gruppoId}?message=${postId}`,
        mittente_id: user?.id,
        riferimento_id: postId,
      });
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0) return;
    setIsPosting(true);

    try {
      let uploadedUrls: string[] = [];
      if (images.length > 0) {
        uploadedUrls = await uploadImages();
      }

      const { data, error } = await supabase
        .from("gruppi_messaggi")
        .insert({
          gruppo_id: gruppoId,
          mittente_id: user!.id,
          testo: text.trim() || "(foto)",
          immagini: uploadedUrls.length > 0 ? uploadedUrls : null,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      if (data?.id) {
        await createMentionNotifications(text, data.id);
      }

      setText("");
      setImages([]);
      imagePreviews.forEach(p => URL.revokeObjectURL(p));
      setImagePreviews([]);
      onPostCreated();
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Impossibile pubblicare.", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const initials = myProfile
    ? `${(myProfile.nome || "U")[0]}${(myProfile.cognome || "")[0]}`.toUpperCase()
    : "U";

  return (
    <Card className="mx-4 mt-4 mb-2">
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={myProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Scrivi qualcosa al gruppo..."
              value={text}
              onChange={handleTextChange}
              className="min-h-[60px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm"
              rows={2}
            />
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute left-0 bottom-full mb-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50 w-64">
                {filteredMembers.slice(0, 8).map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => insertMention(m)}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {`${(m.nome || "U")[0]}${(m.cognome || "")[0]}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{m.nome || ""} {m.cognome || ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {imagePreviews.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {imagePreviews.map((preview, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground gap-1.5"
            >
              <ImagePlus className="w-4 h-4" /> Foto
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPosting || (!text.trim() && images.length === 0)}
            className="gap-1.5"
          >
            {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Pubblica
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default PostComposer;
