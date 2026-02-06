import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { validatePhone } from "@/lib/contactValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

const contactSchema = z.object({
  // Basic info
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().refine(
    (val) => !val || validatePhone(val),
    "Phone number must have 10-15 digits"
  ),
  company: z.string().max(100).optional(),
  contact_type: z.enum(["lead", "buyer", "seller", "both", "agent", "vendor"]).default("lead"),
  notes: z.string().max(1000).optional(),
  // Buyer preferences
  price_min: z.coerce.number().positive().optional().or(z.literal("")),
  price_max: z.coerce.number().positive().optional().or(z.literal("")),
  preferred_beds: z.coerce.number().int().min(0).max(20).optional().or(z.literal("")),
  preferred_baths: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  preferred_areas: z.string().optional(), // Comma-separated
  preferred_property_types: z.string().optional(), // Comma-separated
  // Seller info
  owned_property_address: z.string().max(500).optional(),
  seller_motivation: z.string().max(500).optional(),
  listing_timeline: z.string().optional(),
  // Communication
  preferred_contact_method: z.enum(["phone", "email", "text", ""]).optional(),
  best_time_to_call: z.string().max(100).optional(),
  secondary_phone: z.string().max(50).optional().refine(
    (val) => !val || validatePhone(val),
    "Phone number must have 10-15 digits"
  ),
  secondary_email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  // Lead tracking
  lead_source: z.string().max(100).optional(),
  referral_source: z.string().max(100).optional(),
  // Financial
  pre_approval_status: z.enum(["none", "pending", "approved", ""]).optional(),
  pre_approval_amount: z.coerce.number().positive().optional().or(z.literal("")),
  lender_name: z.string().max(100).optional(),
  // Timeline
  urgency_level: z.enum(["low", "medium", "high", "immediate", ""]).optional(),
  target_move_date: z.string().optional(),
  lease_expiration: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [buyerPrefsOpen, setBuyerPrefsOpen] = useState(false);
  const [sellerInfoOpen, setSellerInfoOpen] = useState(false);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [leadTrackingOpen, setLeadTrackingOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

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

  // Check for duplicate email
  const { data: duplicateContact } = useQuery({
    queryKey: ["check-duplicate-email", email, profile?.tenant_id],
    queryFn: async () => {
      if (!email || !profile?.tenant_id) return null;
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("tenant_id", profile.tenant_id)
        .eq("email", email.toLowerCase())
        .maybeSingle();
      return data;
    },
    enabled: !!email && !!profile?.tenant_id && email.length > 0,
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error("User not authenticated");
      }

      // Parse comma-separated arrays
      const preferredAreas = data.preferred_areas
        ? data.preferred_areas.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      const preferredPropertyTypes = data.preferred_property_types
        ? data.preferred_property_types.split(",").map((s) => s.trim()).filter(Boolean)
        : null;

      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          tenant_id: profile.tenant_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          contact_type: data.contact_type,
          notes: data.notes || null,
          created_by: user.id,
          // Buyer preferences
          price_min: data.price_min || null,
          price_max: data.price_max || null,
          preferred_beds: data.preferred_beds || null,
          preferred_baths: data.preferred_baths || null,
          preferred_areas: preferredAreas,
          preferred_property_types: preferredPropertyTypes,
          // Seller info
          owned_property_address: data.owned_property_address || null,
          seller_motivation: data.seller_motivation || null,
          listing_timeline: data.listing_timeline || null,
          // Communication
          preferred_contact_method: data.preferred_contact_method || null,
          best_time_to_call: data.best_time_to_call || null,
          secondary_phone: data.secondary_phone || null,
          secondary_email: data.secondary_email || null,
          // Lead tracking
          lead_source: data.lead_source || null,
          referral_source: data.referral_source || null,
          // Financial
          pre_approval_status: data.pre_approval_status || null,
          pre_approval_amount: data.pre_approval_amount || null,
          lender_name: data.lender_name || null,
          // Timeline
          urgency_level: data.urgency_level || null,
          target_move_date: data.target_move_date || null,
          lease_expiration: data.lease_expiration || null,
        })
        .select()
        .single();

      if (error) throw error;
      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created", { description: "The contact has been added successfully." });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Error creating contact:", error);
      toast.error("Error", { description: "Failed to create contact. Please try again." });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>
            Enter the contact's details below. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Duplicate Warning */}
              {duplicateContact && email && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A contact with this email already exists: {duplicateContact.first_name} {duplicateContact.last_name}
                  </AlertDescription>
                </Alert>
              )}

              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
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
                        <Input type="email" placeholder="john@example.com" {...field} />
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
                        <Input placeholder="(555) 123-4567" {...field} />
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
                        <Input placeholder="Acme Inc." {...field} />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Textarea
                        placeholder="Add any additional notes about this contact..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buyer Preferences Section */}
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
                      <FormField
                        control={form.control}
                        name="price_min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="200000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="price_max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="500000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="preferred_beds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Beds</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={20} placeholder="3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="preferred_baths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Baths</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} max={20} step={0.5} placeholder="2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="preferred_areas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Areas</FormLabel>
                          <FormControl>
                            <Input placeholder="Downtown, Suburbs, Westside (comma-separated)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferred_property_types"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Property Types</FormLabel>
                          <FormControl>
                            <Input placeholder="Single Family, Condo, Townhouse (comma-separated)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Seller Info Section */}
              {showSellerFields && (
                <Collapsible open={sellerInfoOpen} onOpenChange={setSellerInfoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                      <span className="font-medium">Seller Information</span>
                      {sellerInfoOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-2">
                    <FormField
                      control={form.control}
                      name="owned_property_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, City, State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="seller_motivation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivation for Selling</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Relocating, downsizing, etc." className="resize-none" rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="listing_timeline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Listing Timeline</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select timeline" />
                              </SelectTrigger>
                            </FormControl>
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
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Communication Section */}
              <Collapsible open={communicationOpen} onOpenChange={setCommunicationOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                    <span className="font-medium">Communication Preferences</span>
                    {communicationOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preferred_contact_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Contact Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="text">Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="best_time_to_call"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Best Time to Call</FormLabel>
                          <FormControl>
                            <Input placeholder="Mornings, after 5pm, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="secondary_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondary_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Secondary Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="alt@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Lead Tracking Section */}
              <Collapsible open={leadTrackingOpen} onOpenChange={setLeadTrackingOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                    <span className="font-medium">Lead Tracking</span>
                    {leadTrackingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lead_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Source</FormLabel>
                          <FormControl>
                            <Input placeholder="Zillow, Referral, Open House, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="referral_source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referral Source</FormLabel>
                          <FormControl>
                            <Input placeholder="Name of person who referred" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Financial Section */}
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
                      <FormField
                        control={form.control}
                        name="pre_approval_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-Approval Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pre_approval_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pre-Approval Amount ($)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="450000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="lender_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lender Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank of America, Chase, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Timeline Section */}
              <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                    <span className="font-medium">Timeline</span>
                    {timelineOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="urgency_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low - Just browsing</SelectItem>
                            <SelectItem value="medium">Medium - Actively looking</SelectItem>
                            <SelectItem value="high">High - Ready to move soon</SelectItem>
                            <SelectItem value="immediate">Immediate - Must move ASAP</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="target_move_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Move Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lease_expiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Expiration</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={createContactMutation.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createContactMutation.isPending}>
                  {createContactMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Contact
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
