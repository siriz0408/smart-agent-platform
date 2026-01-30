import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  DollarSign,
  Home,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
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

type Property = Tables<"properties">;

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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  off_market: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  coming_soon: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const propertySchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Please select a state"),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
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

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyDetailSheetProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "details" | "edit";
}

export function PropertyDetailSheet({
  property,
  open,
  onOpenChange,
  defaultTab = "details",
}: PropertyDetailSheetProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const queryClient = useQueryClient();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
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

  useEffect(() => {
    if (property) {
      form.reset({
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip_code || "",
        property_type: property.property_type || "single_family",
        status: property.status || "active",
        price: property.price || "",
        bedrooms: property.bedrooms || "",
        bathrooms: property.bathrooms ? Number(property.bathrooms) : "",
        square_feet: property.square_feet || "",
        lot_size: property.lot_size ? Number(property.lot_size) : "",
        year_built: property.year_built || "",
        description: property.description || "",
        mls_number: property.mls_number || "",
      });
      setCurrentPhotoIndex(0);
    }
  }, [property, form]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: PropertyFormData) => {
      if (!property) throw new Error("No property selected");
      const { error } = await supabase
        .from("properties")
        .update({
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code,
          property_type: data.property_type || null,
          status: data.status || null,
          price: data.price || null,
          bedrooms: data.bedrooms || null,
          bathrooms: data.bathrooms || null,
          square_feet: data.square_feet || null,
          lot_size: data.lot_size || null,
          year_built: data.year_built || null,
          description: data.description || null,
          mls_number: data.mls_number || null,
        })
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property updated successfully");
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Failed to update property:", error);
      toast.error("Failed to update property");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!property) throw new Error("No property selected");
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setShowDeleteDialog(false);
      onOpenChange(false);
    },
    onError: (error) => {
      logger.error("Failed to delete property:", error);
      toast.error("Failed to delete property");
    },
  });

  const onSubmit = (data: PropertyFormData) => {
    updateMutation.mutate(data);
  };

  if (!property) return null;

  const photos = property.photos || [];
  const hasPhotos = photos.length > 0;
  const placeholderImage = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop";

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4 pb-4 border-b">
            {/* Photo Gallery */}
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img
                src={hasPhotos ? photos[currentPhotoIndex] : placeholderImage}
                alt={property.address}
                className="object-cover w-full h-full"
              />
              <Badge
                className={`absolute top-3 left-3 ${statusColors[property.status || "active"]}`}
              >
                {(property.status || "active").replace("_", " ")}
              </Badge>
              {hasPhotos && photos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>

            <div>
              <SheetTitle className="text-xl flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {(property.price || 0).toLocaleString()}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {property.address}, {property.city}, {property.state}
              </SheetDescription>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "details" | "edit")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{property.bedrooms}</div>
                      <div className="text-xs text-muted-foreground">Beds</div>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{Number(property.bathrooms)}</div>
                      <div className="text-xs text-muted-foreground">Baths</div>
                    </div>
                  </div>
                )}
                {property.square_feet && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Square className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-semibold">{property.square_feet.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Sq Ft</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Property Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {property.address}<br />
                      {property.city}, {property.state} {property.zip_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {PROPERTY_TYPES.find(t => t.value === property.property_type)?.label || "Single Family"}
                    </span>
                  </div>
                  {property.year_built && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Built in {property.year_built}</span>
                    </div>
                  )}
                  {property.lot_size && (
                    <div className="flex items-center gap-3">
                      <Square className="h-4 w-4 text-muted-foreground" />
                      <span>{Number(property.lot_size)} acres</span>
                    </div>
                  )}
                  {property.mls_number && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      MLS# {property.mls_number}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{property.description}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Added {format(new Date(property.created_at), "MMM d, yyyy")}</span>
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
                  Delete Property
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-6 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                          <FormLabel>ZIP</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Type and Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="property_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                                <SelectValue />
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

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Property Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beds</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
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
                            <Input type="number" step="0.5" {...field} />
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
                            <Input type="number" {...field} />
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
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Lot Size and MLS */}
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="lot_size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lot Size (acres)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                          <FormLabel>MLS #</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <Textarea rows={4} {...field} />
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
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
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
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {property.address}? This action cannot be undone.
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
