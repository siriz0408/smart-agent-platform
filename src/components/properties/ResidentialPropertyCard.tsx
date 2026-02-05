import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Home, Bed, Bath, Square, Calendar, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResidentialProperty } from "@/hooks/usePropertySearch";

export interface ResidentialPropertyCardProps {
  property: ResidentialProperty;
  onSave: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onClick?: () => void;
}

export function ResidentialPropertyCard({
  property,
  onSave,
  isSaved = false,
  isSaving = false,
  onClick,
}: ResidentialPropertyCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price: number, _isRent: boolean) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatAddress = () => {
    return `${property.address.city}, ${property.address.state} ${property.address.zipcode}`;
  };

  const isRent = property.homeStatus?.toLowerCase().includes("rent");

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("rent")) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    }
    if (s.includes("pending")) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="aspect-video relative bg-muted">
        {property.imgSrc && !imageError ? (
          <img
            src={property.imgSrc}
            alt={property.address.streetAddress}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <Home className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Status Badge */}
        <Badge
          className={cn(
            "absolute top-3 left-3",
            getStatusColor(property.homeStatus)
          )}
        >
          {property.homeStatus}
        </Badge>

        {/* Property Type Badge */}
        <Badge variant="secondary" className="absolute top-3 left-24">
          {property.propertyType}
        </Badge>

        {/* Save Button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 right-3"
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          disabled={isSaving}
          aria-label="Save property"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isSaved && "fill-red-500 text-red-500"
            )}
          />
        </Button>

        {/* Source Badge */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs bg-black/70 text-white px-2 py-1 rounded flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Zillow
          </span>
        </div>
      </div>

      {/* Details Section */}
      <CardContent className="p-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(property.price, isRent)}
          </span>
          {isRent && (
            <span className="text-sm text-muted-foreground">/mo</span>
          )}
        </div>
        
        <p className="font-medium truncate">{property.address.streetAddress}</p>
        <p className="text-sm text-muted-foreground truncate">{formatAddress()}</p>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            {property.bathrooms} bath
          </span>
          {property.livingArea > 0 && (
            <span className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              {property.livingArea.toLocaleString()} sqft
            </span>
          )}
          {property.yearBuilt && property.yearBuilt > 0 && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {property.yearBuilt}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ResidentialPropertyCard;
