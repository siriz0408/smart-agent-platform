import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const buyerStages = [
  { id: "lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "showing", label: "Showing" },
  { id: "offer", label: "Offer Made" },
  { id: "under_contract", label: "Under Contract" },
  { id: "closed", label: "Closed" },
];

const sellerStages = [
  { id: "lead", label: "Prospect" },
  { id: "contacted", label: "Contacted" },
  { id: "listing", label: "Listing Signed" },
  { id: "active", label: "Active" },
  { id: "under_contract", label: "Under Contract" },
  { id: "closed", label: "Closed" },
];

const LOAN_TYPES = [
  { value: "conventional", label: "Conventional" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
  { value: "cash", label: "Cash" },
];

const dealSchema = z.object({
  // Basic info
  contact_id: z.string().min(1, "Please select a contact"),
  property_id: z.string().optional(),
  stage: z.string().min(1, "Please select a stage"),
  estimated_value: z.string().optional(),
  expected_close_date: z.date().optional(),
  commission_rate: z.string().optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  // Financials
  earnest_money: z.string().optional(),
  option_fee: z.string().optional(),
  // Key dates
  option_period_end: z.date().optional(),
  inspection_date: z.date().optional(),
  appraisal_date: z.date().optional(),
  financing_deadline: z.date().optional(),
  // Contingencies
  has_inspection_contingency: z.boolean().default(true),
  has_financing_contingency: z.boolean().default(true),
  has_appraisal_contingency: z.boolean().default(true),
  has_sale_contingency: z.boolean().default(false),
  // Lender
  loan_type: z.string().optional(),
  lender_name: z.string().optional(),
  loan_officer_name: z.string().optional(),
  loan_officer_phone: z.string().optional(),
  loan_officer_email: z.string().email().optional().or(z.literal("")),
  // Title/Escrow
  title_company: z.string().optional(),
  escrow_officer_name: z.string().optional(),
  escrow_officer_phone: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealType: "buyer" | "seller";
}

export function CreateDealDialog({ open, onOpenChange, dealType }: CreateDealDialogProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [keyDatesOpen, setKeyDatesOpen] = useState(false);
  const [contingenciesOpen, setContingenciesOpen] = useState(false);
  const [lenderOpen, setLenderOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);

  const stages = dealType === "seller" ? sellerStages : buyerStages;

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      contact_id: "",
      property_id: "",
      stage: "lead",
      estimated_value: "",
      commission_rate: "",
      notes: "",
      earnest_money: "",
      option_fee: "",
      has_inspection_contingency: true,
      has_financing_contingency: true,
      has_appraisal_contingency: true,
      has_sale_contingency: false,
      loan_type: "",
      lender_name: "",
      loan_officer_name: "",
      loan_officer_phone: "",
      loan_officer_email: "",
      title_company: "",
      escrow_officer_name: "",
      escrow_officer_phone: "",
    },
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-for-deal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, contact_type")
        .order("first_name", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch properties
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ["properties-for-deal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, state, price")
        .order("address", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSubmit = async (values: DealFormValues) => {
    if (!profile?.tenant_id) {
      toast({
        title: "Error",
        description: "Unable to determine tenant. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const dealData = {
        tenant_id: profile.tenant_id,
        deal_type: dealType,
        contact_id: values.contact_id,
        property_id: values.property_id || null,
        stage: values.stage,
        estimated_value: values.estimated_value ? parseFloat(values.estimated_value) : null,
        expected_close_date: values.expected_close_date 
          ? format(values.expected_close_date, "yyyy-MM-dd") 
          : null,
        commission_rate: values.commission_rate ? parseFloat(values.commission_rate) : null,
        notes: values.notes || null,
        // Financials
        earnest_money: values.earnest_money ? parseFloat(values.earnest_money) : null,
        option_fee: values.option_fee ? parseFloat(values.option_fee) : null,
        // Key dates
        option_period_end: values.option_period_end ? format(values.option_period_end, "yyyy-MM-dd") : null,
        inspection_date: values.inspection_date ? format(values.inspection_date, "yyyy-MM-dd") : null,
        appraisal_date: values.appraisal_date ? format(values.appraisal_date, "yyyy-MM-dd") : null,
        financing_deadline: values.financing_deadline ? format(values.financing_deadline, "yyyy-MM-dd") : null,
        // Contingencies
        has_inspection_contingency: values.has_inspection_contingency,
        has_financing_contingency: values.has_financing_contingency,
        has_appraisal_contingency: values.has_appraisal_contingency,
        has_sale_contingency: values.has_sale_contingency,
        // Lender
        loan_type: values.loan_type || null,
        lender_name: values.lender_name || null,
        loan_officer_name: values.loan_officer_name || null,
        loan_officer_phone: values.loan_officer_phone || null,
        loan_officer_email: values.loan_officer_email || null,
        // Title/Escrow
        title_company: values.title_company || null,
        escrow_officer_name: values.escrow_officer_name || null,
        escrow_officer_phone: values.escrow_officer_phone || null,
      };

      const { error } = await supabase.from("deals").insert(dealData);

      if (error) throw error;

      toast({
        title: "Deal created",
        description: `New ${dealType} deal added to pipeline.`,
      });

      queryClient.invalidateQueries({ queryKey: ["deals"] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error creating deal",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedContact = contacts.find((c) => c.id === form.watch("contact_id"));
  const selectedProperty = properties.find((p) => p.id === form.watch("property_id"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {dealType === "seller" ? "Seller" : "Buyer"} Deal</DialogTitle>
          <DialogDescription>
            Create a new deal and add it to your {dealType} pipeline.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Contact Selection */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contact *</FormLabel>
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={contactOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {selectedContact
                            ? `${selectedContact.first_name} ${selectedContact.last_name}`
                            : "Select a contact..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search contacts..." />
                        <CommandList>
                          <CommandEmpty>
                            {contactsLoading ? "Loading..." : "No contacts found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {contacts.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={`${contact.first_name} ${contact.last_name} ${contact.email}`}
                                onSelect={() => {
                                  field.onChange(contact.id);
                                  setContactOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === contact.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{contact.first_name} {contact.last_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {contact.email} • {contact.contact_type}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Selection */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Property (Optional)</FormLabel>
                  <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={propertyOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {selectedProperty
                            ? `${selectedProperty.address}, ${selectedProperty.city}`
                            : "Select a property..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search properties..." />
                        <CommandList>
                          <CommandEmpty>
                            {propertiesLoading ? "Loading..." : "No properties found."}
                          </CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                field.onChange("");
                                setPropertyOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="text-muted-foreground">No property</span>
                            </CommandItem>
                            {properties.map((property) => (
                              <CommandItem
                                key={property.id}
                                value={`${property.address} ${property.city} ${property.state}`}
                                onSelect={() => {
                                  field.onChange(property.id);
                                  setPropertyOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === property.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{property.address}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {property.city}, {property.state}
                                    {property.price && ` • $${property.price.toLocaleString()}`}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stage Selection */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Value & Commission Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="500000"
                        min="0"
                        step="1000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commission_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Expected Close Date */}
            <FormField
              control={form.control}
              name="expected_close_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expected Close Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this deal..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Financials Section */}
            <Collapsible open={financialsOpen} onOpenChange={setFinancialsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Financials</span>
                  {financialsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="earnest_money" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Earnest Money ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="5000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="option_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Option Fee ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="500" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Key Dates Section */}
            <Collapsible open={keyDatesOpen} onOpenChange={setKeyDatesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Key Dates</span>
                  {keyDatesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="option_period_end" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Option Period End</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="inspection_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Inspection Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="appraisal_date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Appraisal Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="financing_deadline" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Financing Deadline</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Contingencies Section */}
            <Collapsible open={contingenciesOpen} onOpenChange={setContingenciesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Contingencies</span>
                  {contingenciesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <FormField control={form.control} name="has_inspection_contingency" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Inspection Contingency</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="has_financing_contingency" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Financing Contingency</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="has_appraisal_contingency" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Appraisal Contingency</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="has_sale_contingency" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Sale of Home Contingency</FormLabel>
                  </FormItem>
                )} />
              </CollapsibleContent>
            </Collapsible>

            {/* Lender Section */}
            <Collapsible open={lenderOpen} onOpenChange={setLenderOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Lender Information</span>
                  {lenderOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="loan_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {LOAN_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lender_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lender Name</FormLabel>
                      <FormControl><Input placeholder="Bank of America" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="loan_officer_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Officer Name</FormLabel>
                    <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="loan_officer_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Officer Phone</FormLabel>
                      <FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="loan_officer_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Officer Email</FormLabel>
                      <FormControl><Input type="email" placeholder="john@bank.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Title/Escrow Section */}
            <Collapsible open={titleOpen} onOpenChange={setTitleOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Title & Escrow</span>
                  {titleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField control={form.control} name="title_company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title Company</FormLabel>
                    <FormControl><Input placeholder="First American Title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="escrow_officer_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escrow Officer Name</FormLabel>
                      <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="escrow_officer_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Escrow Officer Phone</FormLabel>
                      <FormControl><Input placeholder="(555) 987-6543" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Deal
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
