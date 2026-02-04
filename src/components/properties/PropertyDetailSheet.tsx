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
  ChevronDown,
  Loader2,
  Thermometer,
  Car,
  GraduationCap,
  Receipt,
  Clock,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const PARKING_TYPES = [
  { value: "garage", label: "Garage" },
  { value: "carport", label: "Carport" },
  { value: "street", label: "Street" },
  { value: "none", label: "None" },
];

const propertySchema = z.object({
  // Location
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Please select a state"),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
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
  const [hoaOpen, setHoaOpen] = useState(false);
  const [parkingHvacOpen, setParkingHvacOpen] = useState(false);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
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
        hoa_fee: property.hoa_fee || "",
        hoa_name: property.hoa_name || "",
        parking_spaces: property.parking_spaces || "",
        parking_type: property.parking_type || "",
        heating_type: property.heating_type || "",
        cooling_type: property.cooling_type || "",
        school_district: property.school_district || "",
        elementary_school: property.elementary_school || "",
        middle_school: property.middle_school || "",
        high_school: property.high_school || "",
        annual_taxes: property.annual_taxes || "",
        tax_assessment: property.tax_assessment || "",
        days_on_market: property.days_on_market || "",
        listing_date: property.listing_date || "",
        listing_agent_name: property.listing_agent_name || "",
        listing_agent_phone: property.listing_agent_phone || "",
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
          hoa_fee: data.hoa_fee || null,
          hoa_name: data.hoa_name || null,
          parking_spaces: data.parking_spaces || null,
          parking_type: data.parking_type || null,
          heating_type: data.heating_type || null,
          cooling_type: data.cooling_type || null,
          school_district: data.school_district || null,
          elementary_school: data.elementary_school || null,
          middle_school: data.middle_school || null,
          high_school: data.high_school || null,
          annual_taxes: data.annual_taxes || null,
          tax_assessment: data.tax_assessment || null,
          days_on_market: data.days_on_market || null,
          listing_date: data.listing_date || null,
          listing_agent_name: data.listing_agent_name || null,
          listing_agent_phone: data.listing_agent_phone || null,
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

            <TabsContent value="details" className="mt-6">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-6 pr-4">
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

                  {/* HOA Info */}
                  {(property.hoa_fee || property.hoa_name) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        HOA Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        {property.hoa_fee && <p>Monthly Fee: ${property.hoa_fee.toLocaleString()}</p>}
                        {property.hoa_name && <p className="text-muted-foreground">{property.hoa_name}</p>}
                      </div>
                    </div>
                  )}

                  {/* Parking & HVAC */}
                  {(property.parking_spaces || property.parking_type || property.heating_type || property.cooling_type) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Parking & HVAC
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(property.parking_spaces || property.parking_type) && (
                          <div className="flex items-center gap-3">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {property.parking_spaces && `${property.parking_spaces} spaces`}
                              {property.parking_spaces && property.parking_type && ' - '}
                              {property.parking_type && PARKING_TYPES.find(t => t.value === property.parking_type)?.label}
                            </span>
                          </div>
                        )}
                        {(property.heating_type || property.cooling_type) && (
                          <div className="flex items-center gap-3">
                            <Thermometer className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {property.heating_type && `Heat: ${property.heating_type}`}
                              {property.heating_type && property.cooling_type && ' / '}
                              {property.cooling_type && `Cool: ${property.cooling_type}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Schools */}
                  {(property.school_district || property.elementary_school || property.middle_school || property.high_school) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Schools
                      </h3>
                      <div className="space-y-2 text-sm">
                        {property.school_district && (
                          <div className="flex items-center gap-3">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{property.school_district}</span>
                          </div>
                        )}
                        <div className="ml-7 space-y-1 text-muted-foreground">
                          {property.elementary_school && <p>Elementary: {property.elementary_school}</p>}
                          {property.middle_school && <p>Middle: {property.middle_school}</p>}
                          {property.high_school && <p>High: {property.high_school}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Taxes */}
                  {(property.annual_taxes || property.tax_assessment) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Taxes
                      </h3>
                      <div className="space-y-2 text-sm">
                        {property.annual_taxes && (
                          <div className="flex items-center gap-3">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span>Annual Taxes: ${property.annual_taxes.toLocaleString()}</span>
                          </div>
                        )}
                        {property.tax_assessment && (
                          <p className="ml-7 text-muted-foreground">Assessment: ${property.tax_assessment.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Marketing */}
                  {(property.days_on_market || property.listing_date || property.listing_agent_name) && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Marketing Info
                      </h3>
                      <div className="space-y-2 text-sm">
                        {property.days_on_market !== null && property.days_on_market !== undefined && (
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{property.days_on_market} days on market</span>
                          </div>
                        )}
                        {property.listing_date && (
                          <p className="ml-7 text-muted-foreground">Listed: {format(new Date(property.listing_date), "MMM d, yyyy")}</p>
                        )}
                        {property.listing_agent_name && (
                          <p className="ml-7">Agent: {property.listing_agent_name} {property.listing_agent_phone && `(${property.listing_agent_phone})`}</p>
                        )}
                      </div>
                    </div>
                  )}

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
                </div>
              </ScrollArea>
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
                          <Textarea rows={3} {...field} />
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
                        <ChevronDown className={`h-4 w-4 transition-transform ${hoaOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="hoa_fee" render={({ field }) => (
                          <FormItem>
                            <FormLabel>HOA Fee ($/mo)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="hoa_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>HOA Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                        <ChevronDown className={`h-4 w-4 transition-transform ${parkingHvacOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="parking_spaces" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parking Spaces</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="parking_type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parking Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="heating_type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Heating</FormLabel>
                            <FormControl><Input placeholder="Forced Air, Radiant" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="cooling_type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cooling</FormLabel>
                            <FormControl><Input placeholder="Central Air" {...field} /></FormControl>
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
                        <ChevronDown className={`h-4 w-4 transition-transform ${schoolsOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <FormField control={form.control} name="school_district" render={({ field }) => (
                        <FormItem>
                          <FormLabel>School District</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-3 gap-2">
                        <FormField control={form.control} name="elementary_school" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Elementary</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="middle_school" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="high_school" render={({ field }) => (
                          <FormItem>
                            <FormLabel>High</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
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
                        <ChevronDown className={`h-4 w-4 transition-transform ${taxesOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="annual_taxes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Taxes ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="tax_assessment" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assessment ($)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
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
                        <ChevronDown className={`h-4 w-4 transition-transform ${marketingOpen ? '' : '-rotate-90'}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="days_on_market" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days on Market</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
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
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="listing_agent_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="listing_agent_phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Phone</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

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
