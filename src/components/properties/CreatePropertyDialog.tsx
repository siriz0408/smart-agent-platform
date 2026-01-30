import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";
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

const formSchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().length(2, "Please select a state"),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format"),
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
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePropertyDialog({ open, onOpenChange }: CreatePropertyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      toast({
        title: "Property created",
        description: "The property has been added successfully.",
      });
      handleClose();
    },
    onError: (error) => {
      logger.error("Error creating property:", error);
      toast({
        title: "Error",
        description: "Failed to create property. Please try again.",
        variant: "destructive",
      });
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
