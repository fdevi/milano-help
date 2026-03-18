import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminMode } from "@/hooks/useAdminMode";
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
  // Edit mode props
  isEditing?: boolean;
  postId?: string;
  initialText?: string;
  initialImages?: string[];
  onCancelEdit?: () => void;
}

const PostComposer = ({
  gruppoId,
  members,
  myProfile,
  onPostCreated,
  isEditing = false,
  postId,
  initialText = "",
  initialImages = [],
  onCancelEdit,
}: PostComposerProps) => {
  const { user } = useAuth();
  const { adminMode, isAdmin } = useAdminMode();
  const { toast } = useToast();
  const [text, setText] = useState(initialText);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialImages);
  const [isPosting, setIsPosting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when editing props change
  useEffect(() => {
    if (isEditing) {
      setText(initialText);
      setExistingImages(initialImages);
      setNewFiles([]);
      newFilePreviews.forEach(p => URL.revokeObjectURL(p));
      setNewFilePreviews([]);
    }
  }, [isEditing, postId]);

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

    const totalAllowed = 6 - existingImages.length;
    const newImages = [...newFiles, ...validFiles].slice(0, totalAllowed);
    setNewFiles(newImages);

    const newPreviews = newImages.map(f => URL.createObjectURL(f));
    newFilePreviews.forEach(p => URL.revokeObjectURL(p));
    setNewFilePreviews(newPreviews);
    if (e.target) e.target.value = "";
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(newFilePreviews[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of newFiles) {
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

  const createMentionNotifications = async (postText: string, msgId: string) => {
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
        link: `/gruppo/${gruppoId}?message=${msgId}`,
        mittente_id: user?.id,
        riferimento_id: msgId,
      });
    }
  };

  const handleSubmit = async () => {
    const hasContent = text.trim() || newFiles.length > 0 || existingImages.length > 0;
    if (!hasContent) return;
    setIsPosting(true);

    try {
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadImages();
      }

      const allImages = [...existingImages, ...uploadedUrls];

      if (isEditing && postId) {
        // UPDATE existing post
        const { error } = await supabase
          .from("gruppi_messaggi")
          .update({
            testo: text.trim() || "(foto)",
            immagini: allImages.length > 0 ? allImages : null,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", postId);

        if (error) throw error;
        toast({ title: "Post aggiornato!" });
        onPostCreated();
        onCancelEdit?.();
      } else {
        // INSERT new post
        const isPubblicatoComeAdmin = isAdmin && adminMode;
        console.log("[PostComposer] submit", {
          userId: user?.id ?? null,
          gruppoId,
          isAdmin,
          adminMode,
          pubblicato_come_admin: isPubblicatoComeAdmin,
        });

        const { data, error } = await supabase
          .from("gruppi_messaggi")
          .insert({
            gruppo_id: gruppoId,
            mittente_id: user!.id,
            testo: text.trim() || "(foto)",
            immagini: allImages.length > 0 ? allImages : null,
            pubblicato_come_admin: isPubblicatoComeAdmin,
          } as any)
          .select("id")
          .single();

        if (error) throw error;

        if (data?.id) {
          await createMentionNotifications(text, data.id);
        }

        setText("");
        setNewFiles([]);
        newFilePreviews.forEach(p => URL.revokeObjectURL(p));
        setNewFilePreviews([]);
        setExistingImages([]);
        onPostCreated();
      }
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Impossibile pubblicare.", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const initials = myProfile
    ? `${(myProfile.nome || "U")[0]}${(myProfile.cognome || "")[0]}`.toUpperCase()
    : "U";

  const allPreviews = [
    ...existingImages.map((url, i) => ({ type: "existing" as const, src: url, index: i })),
    ...newFilePreviews.map((url, i) => ({ type: "new" as const, src: url, index: i })),
  ];

  return (
    <Card className={isEditing ? "" : "mx-4 mt-4 mb-2"}>
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={myProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder={isEditing ? "Modifica il tuo post..." : "Scrivi qualcosa al gruppo..."}
              value={text}
              onChange={handleTextChange}
              className="min-h-[60px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm"
              rows={isEditing ? 4 : 2}
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

        {allPreviews.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {allPreviews.map((preview, i) => (
              <div key={`${preview.type}-${preview.index}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                <img src={preview.src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => preview.type === "existing" ? removeExistingImage(preview.index) : removeNewFile(preview.index)}
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
          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                Annulla
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isPosting || (!text.trim() && newFiles.length === 0 && existingImages.length === 0)}
              className="gap-1.5"
            >
              {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isEditing ? "Salva" : "Pubblica"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PostComposer;
