import { format } from "date-fns";
import {
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  DollarSign,
  Home,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type Property = Tables<"properties">;

const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  off_market: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  coming_soon: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

interface PropertyDetailsViewProps {
  property: Property;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PropertyDetailsView({ property, onEdit, onDelete }: PropertyDetailsViewProps) {
  const queryClient = useQueryClient();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = property.photos || [];
  const hasPhotos = photos.length > 0;
  const placeholderImage = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop";

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      onDelete?.();
    },
    onError: (error) => {
      logger.error("Failed to delete property:", error);
      toast.error("Failed to delete property");
    },
  });

  return (
    <div className="space-y-6">
      {/* Hero Image Card */}
      <Card className="overflow-hidden">
        <div className="relative aspect-[21/9] bg-muted">
          <img
            src={hasPhotos ? photos[currentPhotoIndex] : placeholderImage}
            alt={property.address}
            className="object-cover w-full h-full"
          />
          <Badge
            className={`absolute top-4 left-4 ${statusColors[property.status || "active"]}`}
            variant="secondary"
          >
            {(property.status || "active").replace("_", " ").toUpperCase()}
          </Badge>
          {hasPhotos && photos.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                onClick={prevPhoto}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full opacity-80 hover:opacity-100"
                onClick={nextPhoto}
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-1.5 rounded-full">
                {currentPhotoIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Price and Address Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-3xl font-bold mb-2">
                <DollarSign className="h-8 w-8" />
                {(property.price || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-lg text-muted-foreground">
                <MapPin className="h-5 w-5" />
                {property.address}, {property.city}, {property.state} {property.zip_code}
              </div>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Property Features
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Bed className="h-6 w-6 text-muted-foreground" />
                <div>
                  <div className="text-xl font-semibold">{property.bedrooms}</div>
                  <div className="text-sm text-muted-foreground">Bedrooms</div>
                </div>
              </div>
            )}
            {property.bathrooms !== null && property.bathrooms !== undefined && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Bath className="h-6 w-6 text-muted-foreground" />
                <div>
                  <div className="text-xl font-semibold">{Number(property.bathrooms)}</div>
                  <div className="text-sm text-muted-foreground">Bathrooms</div>
                </div>
              </div>
            )}
            {property.square_feet && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Square className="h-6 w-6 text-muted-foreground" />
                <div>
                  <div className="text-xl font-semibold">{property.square_feet.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Sq Ft</div>
                </div>
              </div>
            )}
            {property.lot_size && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Square className="h-6 w-6 text-muted-foreground" />
                <div>
                  <div className="text-xl font-semibold">{Number(property.lot_size)}</div>
                  <div className="text-sm text-muted-foreground">Acres</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Information Card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Property Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
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
          {property.mls_number && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>MLS# {property.mls_number}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description Card */}
      {property.description && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{property.description}</p>
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
            <span>Added {format(new Date(property.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Updated {format(new Date(property.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
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
              <p className="text-sm font-medium">Delete this property</p>
              <p className="text-sm text-muted-foreground">
                Once you delete a property, there is no going back. Please be certain.
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
                  <AlertDialogTitle>Delete Property</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {property.address}? This action cannot be
                    undone.
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
