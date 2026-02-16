import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AddNoteDialogProps {
  dealId: string;
  currentNotes: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNoteDialog({
  dealId,
  currentNotes,
  open,
  onOpenChange,
}: AddNoteDialogProps) {
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const addNoteMutation = useMutation({
    mutationFn: async (newNote: string) => {
      // Format the new note with timestamp
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const formattedNote = `[${timestamp}]\n${newNote}`;

      // Append to existing notes or create new
      const updatedNotes = currentNotes
        ? `${formattedNote}\n\n---\n\n${currentNotes}`
        : formattedNote;

      const { error } = await supabase
        .from("deals")
        .update({ notes: updatedNotes })
        .eq("id", dealId);

      if (error) throw error;

      // Log note activity to deal_activities (TRX-012)
      if (user?.id && profile?.tenant_id) {
        const notePreview = newNote.length > 100
          ? newNote.substring(0, 100) + "..."
          : newNote;

        const { error: activityError } = await supabase
          .from("deal_activities")
          .insert({
            deal_id: dealId,
            tenant_id: profile.tenant_id,
            activity_type: "note_added",
            title: "Note added",
            description: notePreview,
            metadata: {
              note_content: newNote,
              note_preview: notePreview,
            },
            created_by: user.id,
          });

        if (activityError) {
          // Don't fail the note add if activity logging fails
          logger.error("Failed to log note activity:", activityError);
        }
      }
    },
    onSuccess: () => {
      toast.success("Note added successfully");
      queryClient.invalidateQueries({ queryKey: ["deal-detail", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal-activities", dealId] });
      setNote("");
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Failed to add note:", error);
      toast.error("Failed to add note");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      addNoteMutation.mutate(note.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
          <DialogDescription>
            Add a note to this deal. Notes are timestamped and kept in chronological order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Enter your note..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!note.trim() || addNoteMutation.isPending}
            >
              {addNoteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
