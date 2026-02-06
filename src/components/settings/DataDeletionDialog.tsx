import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface DataDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataDeletionDialog({ open, onOpenChange }: DataDeletionDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionComplete, setDeletionComplete] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const requiredText = "DELETE MY ACCOUNT";
  const isConfirmed = confirmationText === requiredText;

  const handleDelete = async () => {
    if (!isConfirmed || !user) {
      return;
    }

    setIsDeleting(true);
    setDeletionComplete(false);

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Call the delete-user-account edge function
      const { data, error } = await supabase.functions.invoke("delete-user-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setDeletionComplete(true);
      logger.info("Account deletion initiated", { userId: user.id });

      // Sign out and redirect after a short delay
      setTimeout(async () => {
        await signOut();
        navigate("/");
        toast.success("Account deleted", {
          description: "Your account and all data have been permanently deleted.",
        });
      }, 2000);
    } catch (error) {
      logger.error("Account deletion error", { error });
      toast.error("Deletion failed", {
        description: error instanceof Error ? error.message : "An error occurred during account deletion. Please contact support.",
      });
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Your Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All your data will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        {deletionComplete ? (
          <div className="space-y-4 py-4">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Your account deletion has been processed. You will be signed out shortly.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Your profile and account information</li>
                  <li>All contacts, properties, and deals</li>
                  <li>All documents and AI conversations</li>
                  <li>All messages and conversations</li>
                  <li>Your workspace memberships</li>
                  <li>All other associated data</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                To confirm, type <strong className="font-bold">{requiredText}</strong> below:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={requiredText}
                disabled={isDeleting}
                className="font-mono"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                This action is in compliance with GDPR Article 17 (Right to Erasure). 
                Your data will be permanently deleted within 30 days as required by law.
              </p>
              <p className="mt-2">
                If you need help or have questions, contact{" "}
                <a href="mailto:privacy@smartagent.ai" className="text-primary hover:underline">
                  privacy@smartagent.ai
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setConfirmationText("");
              onOpenChange(false);
            }}
            disabled={isDeleting || deletionComplete}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting || deletionComplete}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
