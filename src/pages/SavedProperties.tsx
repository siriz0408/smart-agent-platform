import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PropertyComparisonTable } from "@/components/properties/PropertyComparisonTable";
import { useSavedProperties, useUpdateSavedProperty, useRemoveSavedProperty, type SavedProperty } from "@/hooks/useSavedProperties";
import { Heart, Trash2, MapPin, Bed, Bath, Square, Loader2, StickyNote, Star, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SavedProperties() {
  const { data: properties, isLoading, error } = useSavedProperties();
  const updateProperty = useUpdateSavedProperty();
  const removeProperty = useRemoveSavedProperty();
  const [selectedProperty, setSelectedProperty] = useState<SavedProperty | null>(null);
  const [notes, setNotes] = useState("");
  
  // Comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const handleToggleFavorite = async (property: SavedProperty) => {
    try {
      await updateProperty.mutateAsync({
        id: property.id,
        is_favorite: !property.is_favorite,
      });
      toast.success(property.is_favorite ? "Removed from favorites" : "Added to favorites");
    } catch {
      toast.error("Failed to update property");
    }
  };

  const handleRemove = async (property: SavedProperty) => {
    try {
      await removeProperty.mutateAsync(property.id);
      // Also remove from comparison selection if present
      setSelectedForComparison(prev => {
        const next = new Set(prev);
        next.delete(property.id);
        return next;
      });
      toast.success("Property removed");
    } catch {
      toast.error("Failed to remove property");
    }
  };

  const handleOpenNotes = (property: SavedProperty) => {
    setSelectedProperty(property);
    setNotes(property.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!selectedProperty) return;
    try {
      await updateProperty.mutateAsync({
        id: selectedProperty.id,
        notes,
      });
      toast.success("Notes saved");
      setSelectedProperty(null);
    } catch {
      toast.error("Failed to save notes");
    }
  };

  // Toggle selection for comparison
  const handleToggleCompare = (propertyId: string) => {
    setSelectedForComparison(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        if (next.size >= 4) {
          toast.error("You can compare up to 4 properties at a time");
          return prev;
        }
        next.add(propertyId);
      }
      return next;
    });
  };

  // Get properties selected for comparison
  const comparisonProperties = properties?.filter(p => selectedForComparison.has(p.id)) || [];

  // Remove from comparison (from within the comparison table)
  const handleRemoveFromComparison = (id: string) => {
    setSelectedForComparison(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // Close dialog if less than 2 properties remain
    if (selectedForComparison.size <= 2) {
      setShowComparison(false);
    }
  };

  const favorites = properties?.filter((p) => p.is_favorite) || [];
  const others = properties?.filter((p) => !p.is_favorite) || [];

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Saved Properties</h1>
            <p className="text-muted-foreground mt-1">Properties you've saved for later</p>
          </div>
            
            {/* Compare button */}
            {selectedForComparison.size >= 2 && (
              <Button onClick={() => setShowComparison(true)} className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare ({selectedForComparison.size})
              </Button>
            )}
          </div>
          
          {/* Comparison selection hint */}
          {properties && properties.length >= 2 && selectedForComparison.size < 2 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <GitCompare className="h-4 w-4 inline mr-2" />
              Select 2-4 properties to compare them side by side
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error loading properties: {(error as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && properties && properties.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved properties yet</h3>
                <p className="text-muted-foreground">
                  Search for properties and save the ones you like!
                </p>
              </CardContent>
            </Card>
          )}

          {favorites.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                Favorites ({favorites.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((property) => (
                  <SavedPropertyCard
                    key={property.id}
                    property={property}
                    onToggleFavorite={() => handleToggleFavorite(property)}
                    onRemove={() => handleRemove(property)}
                    onOpenNotes={() => handleOpenNotes(property)}
                    isUpdating={updateProperty.isPending}
                    isRemoving={removeProperty.isPending}
                    isSelectedForComparison={selectedForComparison.has(property.id)}
                    onToggleCompare={() => handleToggleCompare(property.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                All Saved ({others.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {others.map((property) => (
                  <SavedPropertyCard
                    key={property.id}
                    property={property}
                    onToggleFavorite={() => handleToggleFavorite(property)}
                    onRemove={() => handleRemove(property)}
                    onOpenNotes={() => handleOpenNotes(property)}
                    isUpdating={updateProperty.isPending}
                    isRemoving={removeProperty.isPending}
                    isSelectedForComparison={selectedForComparison.has(property.id)}
                    onToggleCompare={() => handleToggleCompare(property.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes Dialog */}
          <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Property Notes</DialogTitle>
                <DialogDescription>
                  Add notes about this property to remember important details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Add your notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedProperty(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNotes} disabled={updateProperty.isPending}>
                  {updateProperty.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Notes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Comparison Table Dialog */}
          <PropertyComparisonTable
            properties={comparisonProperties}
            open={showComparison}
            onOpenChange={setShowComparison}
            onRemoveProperty={handleRemoveFromComparison}
          />
      </div>
    </AppLayout>
  );
}

interface SavedPropertyCardProps {
  property: SavedProperty;
  onToggleFavorite: () => void;
  onRemove: () => void;
  onOpenNotes: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
  isSelectedForComparison?: boolean;
  onToggleCompare?: () => void;
}

function SavedPropertyCard({
  property,
  onToggleFavorite,
  onRemove,
  onOpenNotes,
  isUpdating,
  isRemoving,
  isSelectedForComparison = false,
  onToggleCompare,
}: SavedPropertyCardProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return "Price N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get property data based on type
  const data = property.property_type === "internal"
    ? property.internal_property
    : property.external_property;

  if (!data) return null;

  // Build address string based on property type
  let address: string;
  if (property.property_type === "internal" && property.internal_property) {
    address = `${property.internal_property.address}, ${property.internal_property.city}, ${property.internal_property.state}`;
  } else if (property.external_property?.address) {
    const extAddr = property.external_property.address;
    address = extAddr.formatted_address || `${extAddr.street_address}, ${extAddr.city}, ${extAddr.state} ${extAddr.zip_code}`;
  } else {
    address = "Address unavailable";
  }

  const photo = data.photos?.[0];

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isSelectedForComparison && "ring-2 ring-primary"
    )}>
      <div className="aspect-video relative bg-muted">
        {photo ? (
          <img
            src={photo}
            alt={address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Comparison checkbox - top left */}
        {onToggleCompare && (
          <div 
            className="absolute top-2 left-2 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-md px-2 py-1.5 cursor-pointer hover:bg-background"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare();
            }}
          >
            <Checkbox 
              checked={isSelectedForComparison}
              onCheckedChange={onToggleCompare}
              id={`compare-${property.id}`}
            />
            <label 
              htmlFor={`compare-${property.id}`} 
              className="text-xs font-medium cursor-pointer"
            >
              Compare
            </label>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={onToggleFavorite}
            disabled={isUpdating}
          >
            <Star className={cn(
              "h-4 w-4",
              property.is_favorite && "text-yellow-500 fill-yellow-500"
            )} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onOpenNotes}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onRemove}
            disabled={isRemoving}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {property.property_type === "external" && (
          <div className="absolute bottom-2 left-2">
            <span className="text-xs bg-black/70 text-white px-2 py-1 rounded">
              {property.external_property?.source}
            </span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <div className="text-2xl font-bold text-primary mb-1">
          {formatPrice(data.price)}
        </div>
        <p className="text-sm text-muted-foreground truncate">{address}</p>
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {data.bedrooms && (
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {data.bedrooms} beds
            </span>
          )}
          {data.bathrooms && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {data.bathrooms} baths
            </span>
          )}
          {data.square_feet && (
            <span className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              {data.square_feet.toLocaleString()} sqft
            </span>
          )}
        </div>
        {property.notes && (
          <div className="mt-3 p-2 bg-muted rounded text-sm">
            <p className="line-clamp-2">{property.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
