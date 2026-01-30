import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, Phone, Building, Calendar, User as UserIcon, Tag, FileText, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  contact_type: z.enum(["lead", "buyer", "seller", "agent", "vendor", "both"]),
  notes: z.string().optional().or(z.literal("")),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactTypeColors: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  buyer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  seller: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  agent: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  vendor: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  both: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

interface ContactDetailSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "details" | "edit";
}

export function ContactDetailSheet({
  contact,
  open,
  onOpenChange,
  defaultTab = "details",
}: ContactDetailSheetProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      company: "",
      contact_type: "lead",
      notes: "",
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
        contact_type: (contact.contact_type as ContactFormData["contact_type"]) || "lead",
        notes: contact.notes || "",
      });
    }
  }, [contact, form]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!contact) throw new Error("No contact selected");
      const { error } = await supabase
        .from("contacts")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          contact_type: data.contact_type,
          notes: data.notes || null,
        })
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact updated successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Failed to update contact:", error);
      toast.error("Failed to update contact");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contact) throw new Error("No contact selected");
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowDeleteDialog(false);
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact");
    },
  });

  const onSubmit = (data: ContactFormData) => {
    updateMutation.mutate(data);
  };

  if (!contact) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4 pb-4 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {contact.first_name[0]}
                  {contact.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl">
                  {contact.first_name} {contact.last_name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
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
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "edit")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Contact Information
                </h3>
                <div className="space-y-3">
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
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Notes
                  </h3>
                  <div className="flex gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Created {format(new Date(contact.created_at), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                  <span>Updated {format(new Date(contact.updated_at), "MMM d, yyyy")}</span>
                </div>
              </div>

              {/* Delete Button */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Contact
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="buyer">Buyer</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="both">Buyer & Seller</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="vendor">Vendor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Add notes about this contact..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contact.first_name} {contact.last_name}? This action
              cannot be undone.
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
    </>
  );
}
