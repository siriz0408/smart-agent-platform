import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, Phone, Building, Calendar, User as UserIcon, Tag, FileText, Trash2, DollarSign, Home, Clock, ChevronDown, ChevronRight, MessageSquare, Target, Link as LinkIcon, Unlink, AlertTriangle } from "lucide-react";
import { validatePhone } from "@/lib/contactValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { ContactUserLinkModal } from "./ContactUserLinkModal";
import { UserPreferencesPanel } from "./UserPreferencesPanel";
import { ContactOwnershipSwitch } from "./ContactOwnershipSwitch";
import { useAuth } from "@/hooks/useAuth";
import { useContactUserLink } from "@/hooks/useContactUserLink";

type Contact = Tables<"contacts">;

const contactSchema = z.object({
  // Basic info
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")).refine(
    (val) => !val || validatePhone(val),
    "Phone number must have 10-15 digits"
  ),
  company: z.string().optional().or(z.literal("")),
  contact_type: z.enum(["lead", "buyer", "seller", "agent", "vendor", "both"]),
  notes: z.string().optional().or(z.literal("")),
  // Buyer preferences
  price_min: z.coerce.number().positive().optional().or(z.literal("")),
  price_max: z.coerce.number().positive().optional().or(z.literal("")),
  preferred_beds: z.coerce.number().int().min(0).max(20).optional().or(z.literal("")),
  preferred_baths: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  preferred_areas: z.string().optional(),
  preferred_property_types: z.string().optional(),
  // Seller info
  owned_property_address: z.string().optional().or(z.literal("")),
  seller_motivation: z.string().optional().or(z.literal("")),
  listing_timeline: z.string().optional().or(z.literal("")),
  // Communication
  preferred_contact_method: z.string().optional().or(z.literal("")),
  best_time_to_call: z.string().optional().or(z.literal("")),
  secondary_phone: z.string().optional().or(z.literal("")).refine(
    (val) => !val || validatePhone(val),
    "Phone number must have 10-15 digits"
  ),
  secondary_email: z.string().email("Invalid email").optional().or(z.literal("")),
  // Lead tracking
  lead_source: z.string().optional().or(z.literal("")),
  referral_source: z.string().optional().or(z.literal("")),
  // Financial
  pre_approval_status: z.string().optional().or(z.literal("")),
  pre_approval_amount: z.coerce.number().positive().optional().or(z.literal("")),
  lender_name: z.string().optional().or(z.literal("")),
  // Timeline
  urgency_level: z.string().optional().or(z.literal("")),
  target_move_date: z.string().optional().or(z.literal("")),
  lease_expiration: z.string().optional().or(z.literal("")),
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
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [buyerPrefsOpen, setBuyerPrefsOpen] = useState(false);
  const [sellerInfoOpen, setSellerInfoOpen] = useState(false);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [leadTrackingOpen, setLeadTrackingOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, profile, isSuperAdmin } = useAuth();
  const { unlinkContactFromUser, isUnlinking } = useContactUserLink();

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
      price_min: "",
      price_max: "",
      preferred_beds: "",
      preferred_baths: "",
      preferred_areas: "",
      preferred_property_types: "",
      owned_property_address: "",
      seller_motivation: "",
      listing_timeline: "",
      preferred_contact_method: "",
      best_time_to_call: "",
      secondary_phone: "",
      secondary_email: "",
      lead_source: "",
      referral_source: "",
      pre_approval_status: "",
      pre_approval_amount: "",
      lender_name: "",
      urgency_level: "",
      target_move_date: "",
      lease_expiration: "",
    },
  });

  const contactType = form.watch("contact_type");
  const email = form.watch("email");
  const showBuyerFields = ["buyer", "both", "lead"].includes(contactType);
  const showSellerFields = ["seller", "both"].includes(contactType);

  // Check for duplicate email (excluding current contact)
  const { data: duplicateContact } = useQuery({
    queryKey: ["check-duplicate-email", email, contact?.id, profile?.tenant_id],
    queryFn: async () => {
      if (!email || !profile?.tenant_id || !contact) return null;
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("tenant_id", profile.tenant_id)
        .eq("email", email.toLowerCase())
        .neq("id", contact.id)
        .maybeSingle();
      return data;
    },
    enabled: !!email && !!profile?.tenant_id && !!contact && email.length > 0,
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
        price_min: contact.price_min ?? "",
        price_max: contact.price_max ?? "",
        preferred_beds: contact.preferred_beds ?? "",
        preferred_baths: contact.preferred_baths ?? "",
        preferred_areas: contact.preferred_areas?.join(", ") || "",
        preferred_property_types: contact.preferred_property_types?.join(", ") || "",
        owned_property_address: contact.owned_property_address || "",
        seller_motivation: contact.seller_motivation || "",
        listing_timeline: contact.listing_timeline || "",
        preferred_contact_method: contact.preferred_contact_method || "",
        best_time_to_call: contact.best_time_to_call || "",
        secondary_phone: contact.secondary_phone || "",
        secondary_email: contact.secondary_email || "",
        lead_source: contact.lead_source || "",
        referral_source: contact.referral_source || "",
        pre_approval_status: contact.pre_approval_status || "",
        pre_approval_amount: contact.pre_approval_amount ?? "",
        lender_name: contact.lender_name || "",
        urgency_level: contact.urgency_level || "",
        target_move_date: contact.target_move_date || "",
        lease_expiration: contact.lease_expiration || "",
      });
    }
  }, [contact, form]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!contact) throw new Error("No contact selected");
      
      const preferredAreas = data.preferred_areas
        ? data.preferred_areas.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      const preferredPropertyTypes = data.preferred_property_types
        ? data.preferred_property_types.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

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
          price_min: data.price_min || null,
          price_max: data.price_max || null,
          preferred_beds: data.preferred_beds || null,
          preferred_baths: data.preferred_baths || null,
          preferred_areas: preferredAreas,
          preferred_property_types: preferredPropertyTypes,
          owned_property_address: data.owned_property_address || null,
          seller_motivation: data.seller_motivation || null,
          listing_timeline: data.listing_timeline || null,
          preferred_contact_method: data.preferred_contact_method || null,
          best_time_to_call: data.best_time_to_call || null,
          secondary_phone: data.secondary_phone || null,
          secondary_email: data.secondary_email || null,
          lead_source: data.lead_source || null,
          referral_source: data.referral_source || null,
          pre_approval_status: data.pre_approval_status || null,
          pre_approval_amount: data.pre_approval_amount || null,
          lender_name: data.lender_name || null,
          urgency_level: data.urgency_level || null,
          target_move_date: data.target_move_date || null,
          lease_expiration: data.lease_expiration || null,
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

            <TabsContent value="details" className="mt-6">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-6 pr-4">
                  {/* User Linking & Ownership Controls */}
                  <div className="space-y-3 pb-4 border-b">
                    {/* Contact Ownership Switch */}
                    {user && profile && (
                      <ContactOwnershipSwitch
                        contactId={contact.id}
                        currentOwnershipType={contact.ownership_type || "workspace"}
                        createdBy={contact.created_by || ""}
                        currentUserId={user.id}
                        isWorkspaceAdmin={isSuperAdmin || profile.primary_role === "admin"}
                      />
                    )}

                    {/* User Linking Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {contact.user_id ? (
                          <>
                            <Badge variant="default" className="gap-1">
                              <LinkIcon className="h-3 w-3" />
                              Linked to Platform User
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowUnlinkDialog(true)}
                              disabled={isUnlinking}
                            >
                              <Unlink className="h-3 w-3 mr-1" />
                              Unlink
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLinkModal(true)}
                            className="gap-2"
                          >
                            <LinkIcon className="h-4 w-4" />
                            Link to Platform User
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Preferences Panel (if linked) */}
                  {contact.user_id && (
                    <UserPreferencesPanel userId={contact.user_id} />
                  )}

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Contact Information (Your CRM Notes)
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
                      {contact.secondary_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${contact.secondary_phone}`} className="hover:underline text-sm">
                            {contact.secondary_phone} (secondary)
                          </a>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{contact.company}</span>
                        </div>
                      )}
                      {contact.preferred_contact_method && (
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Prefers: {contact.preferred_contact_method}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buyer Preferences */}
                  {(contact.price_min || contact.price_max || contact.preferred_beds || contact.preferred_areas?.length) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Buyer Preferences
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(contact.price_min || contact.price_max) && (
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Budget: {contact.price_min ? `$${contact.price_min.toLocaleString()}` : 'Any'} - {contact.price_max ? `$${contact.price_max.toLocaleString()}` : 'Any'}
                            </span>
                          </div>
                        )}
                        {(contact.preferred_beds || contact.preferred_baths) && (
                          <div className="flex items-center gap-3">
                            <Home className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {contact.preferred_beds && `${contact.preferred_beds} beds`}
                              {contact.preferred_beds && contact.preferred_baths && ' / '}
                              {contact.preferred_baths && `${contact.preferred_baths} baths`}
                            </span>
                          </div>
                        )}
                        {contact.preferred_areas && contact.preferred_areas.length > 0 && (
                          <div className="flex items-start gap-3">
                            <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span>Areas: {contact.preferred_areas.join(", ")}</span>
                          </div>
                        )}
                        {contact.preferred_property_types && contact.preferred_property_types.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-7">
                            {contact.preferred_property_types.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seller Info */}
                  {(contact.owned_property_address || contact.seller_motivation || contact.listing_timeline) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Seller Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        {contact.owned_property_address && (
                          <div className="flex items-start gap-3">
                            <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <span>{contact.owned_property_address}</span>
                          </div>
                        )}
                        {contact.listing_timeline && (
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Timeline: {contact.listing_timeline.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {contact.seller_motivation && (
                          <p className="text-muted-foreground ml-7">{contact.seller_motivation}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financial Status */}
                  {(contact.pre_approval_status || contact.pre_approval_amount || contact.lender_name) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Financial Status
                      </h3>
                      <div className="space-y-2 text-sm">
                        {contact.pre_approval_status && (
                          <Badge variant={contact.pre_approval_status === 'approved' ? 'default' : 'secondary'}>
                            Pre-approval: {contact.pre_approval_status}
                          </Badge>
                        )}
                        {contact.pre_approval_amount && (
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>Approved for: ${contact.pre_approval_amount.toLocaleString()}</span>
                          </div>
                        )}
                        {contact.lender_name && (
                          <p className="text-muted-foreground ml-7">Lender: {contact.lender_name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {(contact.urgency_level || contact.target_move_date || contact.lease_expiration) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Timeline
                      </h3>
                      <div className="space-y-2 text-sm">
                        {contact.urgency_level && (
                          <Badge variant={contact.urgency_level === 'immediate' || contact.urgency_level === 'high' ? 'destructive' : 'secondary'}>
                            Urgency: {contact.urgency_level}
                          </Badge>
                        )}
                        {contact.target_move_date && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Target move: {format(new Date(contact.target_move_date), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        {contact.lease_expiration && (
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Lease expires: {format(new Date(contact.lease_expiration), "MMM d, yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lead Source */}
                  {(contact.lead_source || contact.referral_source) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Lead Source
                      </h3>
                      <div className="space-y-2 text-sm">
                        {contact.lead_source && <p>Source: {contact.lead_source}</p>}
                        {contact.referral_source && <p className="text-muted-foreground">Referred by: {contact.referral_source}</p>}
                      </div>
                    </div>
                  )}

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
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="edit" className="mt-6">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pr-4">
                    {/* Duplicate Warning */}
                    {duplicateContact && email && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          A contact with this email already exists: {duplicateContact.first_name} {duplicateContact.last_name}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Basic Info */}
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

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Add notes..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Buyer Preferences */}
                    {showBuyerFields && (
                      <Collapsible open={buyerPrefsOpen} onOpenChange={setBuyerPrefsOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                            <span className="font-medium">Buyer Preferences</span>
                            {buyerPrefsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="price_min" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min Price ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="price_max" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Price ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="preferred_beds" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preferred Beds</FormLabel>
                                <FormControl><Input type="number" min={0} max={20} {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="preferred_baths" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Preferred Baths</FormLabel>
                                <FormControl><Input type="number" min={0} max={20} step={0.5} {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={form.control} name="preferred_areas" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Areas (comma-separated)</FormLabel>
                              <FormControl><Input placeholder="Downtown, Suburbs" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="preferred_property_types" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Types (comma-separated)</FormLabel>
                              <FormControl><Input placeholder="Single Family, Condo" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Seller Info */}
                    {showSellerFields && (
                      <Collapsible open={sellerInfoOpen} onOpenChange={setSellerInfoOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                            <span className="font-medium">Seller Information</span>
                            {sellerInfoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                          <FormField control={form.control} name="owned_property_address" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Address</FormLabel>
                              <FormControl><Input placeholder="123 Main St, City, State" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="seller_motivation" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Motivation for Selling</FormLabel>
                              <FormControl><Textarea rows={2} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="listing_timeline" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Listing Timeline</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="immediately">Immediately</SelectItem>
                                  <SelectItem value="1-3_months">1-3 months</SelectItem>
                                  <SelectItem value="3-6_months">3-6 months</SelectItem>
                                  <SelectItem value="6+_months">6+ months</SelectItem>
                                  <SelectItem value="undecided">Undecided</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Communication */}
                    <Collapsible open={communicationOpen} onOpenChange={setCommunicationOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <span className="font-medium">Communication Preferences</span>
                          {communicationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="preferred_contact_method" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Method</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="phone">Phone</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                  <SelectItem value="text">Text</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="best_time_to_call" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Best Time to Call</FormLabel>
                              <FormControl><Input placeholder="Mornings, after 5pm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="secondary_phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Phone</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="secondary_email" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Email</FormLabel>
                              <FormControl><Input type="email" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Lead Tracking */}
                    <Collapsible open={leadTrackingOpen} onOpenChange={setLeadTrackingOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <span className="font-medium">Lead Tracking</span>
                          {leadTrackingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="lead_source" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lead Source</FormLabel>
                              <FormControl><Input placeholder="Zillow, Referral, etc." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="referral_source" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Source</FormLabel>
                              <FormControl><Input placeholder="Referrer name" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Financial */}
                    {showBuyerFields && (
                      <Collapsible open={financialOpen} onOpenChange={setFinancialOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                            <span className="font-medium">Financial Status</span>
                            {financialOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-2">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="pre_approval_status" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pre-Approval Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="pre_approval_amount" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pre-Approval Amount ($)</FormLabel>
                                <FormControl><Input type="number" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <FormField control={form.control} name="lender_name" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lender Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Timeline */}
                    <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                          <span className="font-medium">Timeline</span>
                          {timelineOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-2">
                        <FormField control={form.control} name="urgency_level" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Urgency Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low - Just browsing</SelectItem>
                                <SelectItem value="medium">Medium - Actively looking</SelectItem>
                                <SelectItem value="high">High - Ready soon</SelectItem>
                                <SelectItem value="immediate">Immediate - Must move ASAP</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="target_move_date" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Move Date</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="lease_expiration" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lease Expiration</FormLabel>
                              <FormControl><Input type="date" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="flex gap-3 pt-4">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </ScrollArea>
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

      <ContactUserLinkModal
        open={showLinkModal}
        onOpenChange={setShowLinkModal}
        contactId={contact.id}
        contactEmail={contact.email}
        onLinked={() => {
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }}
      />

      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Contact from Platform User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink this contact from the platform user? This will remove the connection and hide the user's preferences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                unlinkContactFromUser(contact.id);
                setShowUnlinkDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnlinking ? "Unlinking..." : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
