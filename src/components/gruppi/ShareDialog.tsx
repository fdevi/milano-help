import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  gruppoId: string;
}

const ShareDialog = ({ open, onOpenChange, postId, gruppoId }: ShareDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  const { data: myGroups = [] } = useQuery({
    queryKey: ["my_groups_for_share", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("gruppi_membri")
        .select("gruppo_id")
        .eq("user_id", user.id)
        .eq("stato", "approvato");
      if (!memberships || memberships.length === 0) return [];

      const groupIds = memberships.map(m => m.gruppo_id).filter(id => id !== gruppoId);
      if (groupIds.length === 0) return [];

      const { data: groups } = await supabase
        .from("gruppi")
        .select("id, nome, immagine")
        .in("id", groupIds);
      return groups || [];
    },
    enabled: open && !!user,
  });

  const shareLink = `${window.location.origin}/gruppo/${gruppoId}?message=${postId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiato!" });
  };

  const shareToGroup = async (targetGroupId: string) => {
    if (!user) return;
    setSharing(targetGroupId);
    try {
      // Create a shared post reference in the target group
      const { error: shareError } = await supabase.from("gruppi_post_condivisioni" as any).insert({
        post_originale_id: postId,
        gruppo_destinazione_id: targetGroupId,
        user_id: user.id,
        tipo: "gruppo",
      });
      if (shareError) throw shareError;

      // Also post a message in the target group linking to the original
      const { error: msgError } = await supabase.from("gruppi_messaggi").insert({
        gruppo_id: targetGroupId,
        mittente_id: user.id,
        testo: `📢 Post condiviso: ${shareLink}`,
      } as any);
      if (msgError) throw msgError;

      toast({ title: "Post condiviso!" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Errore", description: err?.message || "Impossibile condividere.", variant: "destructive" });
    } finally {
      setSharing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Condividi post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy link */}
          <div>
            <p className="text-sm font-medium mb-2">Copia link</p>
            <div className="flex gap-2">
              <Input value={shareLink} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Share to group */}
          {myGroups.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Condividi in un gruppo</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {myGroups.map((g: any) => (
                  <button
                    key={g.id}
                    onClick={() => shareToGroup(g.id)}
                    disabled={sharing === g.id}
                    className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted text-left text-sm"
                  >
                    {g.immagine ? (
                      <img src={g.immagine} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <span className="flex-1 truncate">{g.nome}</span>
                    {sharing === g.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
