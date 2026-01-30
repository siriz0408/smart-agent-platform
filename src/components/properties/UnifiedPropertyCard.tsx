import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResidentialProperty } from "@/hooks/usePropertySearch";
import type { PropertyCardData } from "@/types/property";

export interface UnifiedPropertyCardProps {
  property: ResidentialProperty | PropertyCardData;
  context: 'search' | 'saved' | 'ai-chat';
  onSave?: () => void;
  onView?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
}

export function UnifiedPropertyCard({
  property,
  context,
  onSave,
  onView,
  isSaved = false,
  isSaving = false,
}: UnifiedPropertyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Normalize data from both interfaces
  const normalizedPhotos = 'photos' in property && property.photos && property.photos.length > 0
    ? property.photos
    : 'imgSrc' in property && property.imgSrc
    ? [property.imgSrc]
    : [];

  const daysOnMarket = 'daysOnMarket' in property ? property.daysOnMarket : undefined;
  const brokerName = 'brokerName' in property ? property.brokerName : undefined;
  const homeStatus = 'homeStatus' in property ? property.homeStatus :
                     ('listingStatus' in property ? property.listingStatus : undefined);

  const formatPrice = (price?: number) => {
    if (!price) return "Price N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const navigatePhoto = (e: React.MouseEvent, direction: 'prev' | 'next') => {
    e.stopPropagation();
    if (direction === 'next') {
      setCurrentPhotoIndex((prev) => (prev + 1) % normalizedPhotos.length);
    } else {
      setCurrentPhotoIndex((prev) => (prev - 1 + normalizedPhotos.length) % normalizedPhotos.length);
    }
  };

  const currentPhoto = normalizedPhotos[currentPhotoIndex];

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onView}
    >
      {/* Photo Section */}
      <div className="relative aspect-video bg-muted">
        {currentPhoto && !imageError ? (
          <img
            src={currentPhoto}
            alt={property.address?.streetAddress || "Property"}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Home className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Days on Market Badge - Zillow style (top left) */}
        {daysOnMarket !== undefined && daysOnMarket > 0 && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md border-0">
              {daysOnMarket} days on Zillow
            </Badge>
          </div>
        )}

        {/* Save Button - Top right (always visible) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-11 w-11 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onSave?.();
          }}
          disabled={isSaving}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors",
              isSaved ? "fill-red-500 text-red-500" : "text-gray-700"
            )}
          />
        </Button>

        {/* Photo Navigation Arrows (visible when multiple photos) */}
        {normalizedPhotos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => navigatePhoto(e, 'prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => navigatePhoto(e, 'next')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Photo Count - Bottom right */}
        {normalizedPhotos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {currentPhotoIndex + 1} / {normalizedPhotos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4">
        {/* Price - Bold Zillow style */}
        <div className="text-3xl font-bold mb-2 text-foreground">
          {formatPrice(property.price)}
        </div>

        {/* Stats - Inline pipes (Zillow format) */}
        <div className="flex items-center gap-2 text-sm font-medium mb-2 flex-wrap text-foreground">
          {property.bedrooms !== undefined && property.bedrooms > 0 && (
            <>
              <span>{property.bedrooms} bds</span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          {property.bathrooms !== undefined && property.bathrooms > 0 && (
            <>
              <span>{property.bathrooms} ba</span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          {property.livingArea && property.livingArea > 0 && (
            <span>{property.livingArea.toLocaleString()} sqft</span>
          )}
          {homeStatus && (
            <>
              <span className="text-muted-foreground">|</span>
              <Badge variant="secondary" className="text-xs">
                {homeStatus}
              </Badge>
            </>
          )}
        </div>

        {/* Address */}
        <div className="text-sm text-foreground mb-3">
          {property.address?.streetAddress}
          <br />
          {property.address?.city}, {property.address?.state} {property.address?.zipcode}
        </div>

        {/* Broker Name - Zillow style (small gray uppercase) */}
        {brokerName && (
          <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">
            {brokerName}
          </div>
        )}

        {/* CTAs - Context-aware */}
        {context !== 'saved' && (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11"
              onClick={(e) => {
                e.stopPropagation();
                onView?.();
              }}
            >
              View details
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement contact agent flow
                window.open(`mailto:?subject=Property%20Inquiry%20-%20${property.address?.streetAddress}`, '_blank');
              }}
            >
              Contact agent
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UnifiedPropertyCard;
