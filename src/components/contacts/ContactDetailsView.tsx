import { format } from "date-fns";
import { Mail, Phone, Building, Calendar, User as UserIcon, Tag, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

const contactTypeColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  buyer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seller: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  agent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  vendor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  both: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

interface ContactDetailsViewProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ContactDetailsView({ contact, onEdit, onDelete }: ContactDetailsViewProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onDelete?.();
    },
    onError: (error) => {
      logger.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {contact.first_name[0]}
                  {contact.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {contact.first_name} {contact.last_name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    className={contactTypeColors[contact.contact_type || "lead"]}
                    variant="secondary"
                  >
                    {(contact.contact_type || "lead").charAt(0).toUpperCase() +
                      (contact.contact_type || "lead").slice(1)}
                  </Badge>
                  {contact.company && (
                    <span className="text-muted-foreground">{contact.company}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Contact Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                {contact.email}
              </a>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${contact.phone}`} className="hover:underline">
                {contact.phone}
              </a>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{contact.company}</span>
            </div>
          )}
          {!contact.email && !contact.phone && !contact.company && (
            <p className="text-sm text-muted-foreground italic">No contact information available</p>
          )}
        </CardContent>
      </Card>

      {/* Tags Card */}
      {contact.tags && contact.tags.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Tags
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Card */}
      {contact.notes && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Metadata
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created {format(new Date(contact.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            <span>Updated {format(new Date(contact.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Section */}
      <Card className="border-destructive/50">
        <CardHeader>
          <h3 className="text-sm font-medium text-destructive uppercase tracking-wide">
            Danger Zone
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this contact</p>
              <p className="text-sm text-muted-foreground">
                Once you delete a contact, there is no going back. Please be certain.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {contact.first_name} {contact.last_name}? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
