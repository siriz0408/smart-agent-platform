import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { PropertyPhotoUpload, type PhotoFile } from "./PropertyPhotoUpload";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const PROPERTY_STATUSES = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "off_market", label: "Off Market" },
  { value: "coming_soon", label: "Coming Soon" },
];

const PARKING_TYPES = [
  { value: "garage", label: "Garage" },
  { value: "carport", label: "Carport" },
  { value: "street", label: "Street" },
  { value: "none", label: "None" },
];

const formSchema = z.object({
  // Location
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().length(2, "Please select a state"),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
  // Basic details
  property_type: z.string().optional(),
  status: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive").optional().or(z.literal("")),
  bedrooms: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  bathrooms: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  square_feet: z.coerce.number().positive().optional().or(z.literal("")),
  lot_size: z.coerce.number().positive().optional().or(z.literal("")),
  year_built: z.coerce.number().min(1800).max(new Date().getFullYear()).optional().or(z.literal("")),
  description: z.string().optional(),
  mls_number: z.string().optional(),
  // HOA
  hoa_fee: z.coerce.number().min(0).optional().or(z.literal("")),
  hoa_name: z.string().optional(),
  // Parking & HVAC
  parking_spaces: z.coerce.number().min(0).max(20).optional().or(z.literal("")),
  parking_type: z.string().optional(),
  heating_type: z.string().optional(),
  cooling_type: z.string().optional(),
  // Schools
  school_district: z.string().optional(),
  elementary_school: z.string().optional(),
  middle_school: z.string().optional(),
  high_school: z.string().optional(),
  // Taxes
  annual_taxes: z.coerce.number().min(0).optional().or(z.literal("")),
  tax_assessment: z.coerce.number().min(0).optional().or(z.literal("")),
  // Marketing
  days_on_market: z.coerce.number().min(0).optional().or(z.literal("")),
  listing_date: z.string().optional(),
  listing_agent_name: z.string().optional(),
  listing_agent_phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePropertyDialog({ open, onOpenChange }: CreatePropertyDialogProps) {
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hoaOpen, setHoaOpen] = useState(false);
  const [parkingHvacOpen, setParkingHvacOpen] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: "",
      city: "",
      state: "",
      zip_code: "",
      property_type: "single_family",
      status: "active",
      price: "",
      bedrooms: "",
      bathrooms: "",
      square_feet: "",
      lot_size: "",
      year_built: "",
      description: "",
      mls_number: "",
      hoa_fee: "",
      hoa_name: "",
      parking_spaces: "",
      parking_type: "",
      heating_type: "",
      cooling_type: "",
      school_district: "",
      elementary_school: "",
      middle_school: "",
      high_school: "",
      annual_taxes: "",
      tax_assessment: "",
      days_on_market: "",
      listing_date: "",
      listing_agent_name: "",
      listing_agent_phone: "",
    },
  });

  const uploadPhotos = async (propertyId: string, tenantId: string): Promise<string[]> => {
    const urls: string[] = [];

    for (const photo of photos) {
      const fileExt = photo.file.name.split(".").pop();
      const fileName = `${tenantId}/${propertyId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(fileName, photo.file);

      if (uploadError) {
        logger.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("property-photos")
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        urls.push(urlData.publicUrl);
      }
    }

    return urls;
  };

  const createProperty = useMutation({
    mutationFn: async (values: FormValues) => {
      // Get user profile for tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) throw new Error("Could not get user profile");

      // Create property first (without photos)
      const propertyData = {
        tenant_id: profile.tenant_id,
        address: values.address,
        city: values.city,
        state: values.state,
        zip_code: values.zip_code,
        property_type: values.property_type || "single_family",
        status: values.status || "active",
        price: values.price || null,
        bedrooms: values.bedrooms || null,
        bathrooms: values.bathrooms || null,
        square_feet: values.square_feet || null,
        lot_size: values.lot_size || null,
        year_built: values.year_built || null,
        description: values.description || null,
        mls_number: values.mls_number || null,
        listing_agent_id: user.id,
        // New fields
        hoa_fee: values.hoa_fee || null,
        hoa_name: values.hoa_name || null,
        parking_spaces: values.parking_spaces || null,
        parking_type: values.parking_type || null,
        heating_type: values.heating_type || null,
        cooling_type: values.cooling_type || null,
        school_district: values.school_district || null,
        elementary_school: values.elementary_school || null,
        middle_school: values.middle_school || null,
        high_school: values.high_school || null,
        annual_taxes: values.annual_taxes || null,
        tax_assessment: values.tax_assessment || null,
        days_on_market: values.days_on_market || null,
        listing_date: values.listing_date || null,
        listing_agent_name: values.listing_agent_name || null,
        listing_agent_phone: values.listing_agent_phone || null,
      };

      const { data: property, error: insertError } = await supabase
        .from("properties")
        .insert(propertyData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload photos if any
      if (photos.length > 0) {
        setIsUploading(true);
        const photoUrls = await uploadPhotos(property.id, profile.tenant_id);
        
        if (photoUrls.length > 0) {
          const { error: updateError } = await supabase
            .from("properties")
            .update({ photos: photoUrls })
            .eq("id", property.id);

          if (updateError) {
            logger.error("Error updating photos:", updateError);
          }
        }
        setIsUploading(false);
      }

      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Property created", { description: "The property has been added successfully." });
      handleClose();
    },
    onError: (error) => {
      logger.error("Error creating property:", error);
      toast.error("Error", { description: "Failed to create property. Please try again." });
      setIsUploading(false);
    },
  });

  const handleClose = () => {
    form.reset();
    setPhotos([]);
    onOpenChange(false);
  };

  const onSubmit = (values: FormValues) => {
    createProperty.mutate(values);
  };

  const isSubmitting = createProperty.isPending || isUploading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
          <DialogDescription>
            Enter the property details below. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-6 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="col-span-3">
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel>State *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="--" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Property Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROPERTY_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="500000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beds</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baths</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="square_feet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sq Ft</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year_built"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2020" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lot_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lot Size (acres)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mls_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MLS Number</FormLabel>
                    <FormControl>
                      <Input placeholder="MLS12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the property..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* HOA Section */}
            <Collapsible open={hoaOpen} onOpenChange={setHoaOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">HOA & Fees</span>
                  {hoaOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="hoa_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel>HOA Fee ($/month)</FormLabel>
                      <FormControl><Input type="number" placeholder="250" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hoa_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>HOA Name</FormLabel>
                      <FormControl><Input placeholder="Community HOA" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Parking & HVAC Section */}
            <Collapsible open={parkingHvacOpen} onOpenChange={setParkingHvacOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Parking & HVAC</span>
                  {parkingHvacOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="parking_spaces" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Spaces</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="2" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parking_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parking Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {PARKING_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="heating_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heating Type</FormLabel>
                      <FormControl><Input placeholder="Forced Air, Radiant, etc." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cooling_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooling Type</FormLabel>
                      <FormControl><Input placeholder="Central Air, Window Unit, etc." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Schools Section */}
            <Collapsible open={schoolsOpen} onOpenChange={setSchoolsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Schools</span>
                  {schoolsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <FormField control={form.control} name="school_district" render={({ field }) => (
                  <FormItem>
                    <FormLabel>School District</FormLabel>
                    <FormControl><Input placeholder="Unified School District" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="elementary_school" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Elementary</FormLabel>
                      <FormControl><Input placeholder="School name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="middle_school" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle</FormLabel>
                      <FormControl><Input placeholder="School name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="high_school" render={({ field }) => (
                    <FormItem>
                      <FormLabel>High</FormLabel>
                      <FormControl><Input placeholder="School name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Taxes Section */}
            <Collapsible open={taxesOpen} onOpenChange={setTaxesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Taxes</span>
                  {taxesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="annual_taxes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Taxes ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="5000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tax_assessment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Assessment ($)</FormLabel>
                      <FormControl><Input type="number" placeholder="400000" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Marketing Section */}
            <Collapsible open={marketingOpen} onOpenChange={setMarketingOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium">Marketing Info</span>
                  {marketingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="days_on_market" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days on Market</FormLabel>
                      <FormControl><Input type="number" min={0} placeholder="30" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="listing_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="listing_agent_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Agent Name</FormLabel>
                      <FormControl><Input placeholder="Agent name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="listing_agent_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listing Agent Phone</FormLabel>
                      <FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Photos */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Photos</h3>
              <PropertyPhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? "Uploading Photos..." : "Add Property"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
