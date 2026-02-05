import { useState } from "react";
import { 
  X, Heart, Share2, MapPin, Bed, Bath, Square, Calendar, 
  ChevronLeft, ChevronRight, Home, DollarSign, Calculator 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MortgageCalculator } from "./MortgageCalculator";
import type { PropertyCardData } from "@/types/property";

interface ZillowPropertyDetailSheetProps {
  property: PropertyCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (property: PropertyCardData) => void;
  isSaved?: boolean;
}

export function ZillowPropertyDetailSheet({
  property,
  open,
  onOpenChange,
  onSave,
  isSaved = false,
}: ZillowPropertyDetailSheetProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showMortgageCalc, setShowMortgageCalc] = useState(false);

  if (!property) return null;

  const photos = property.photos?.length ? property.photos : (property.imgSrc ? [property.imgSrc] : []);
  const hasPhotos = photos.length > 0;

  const formatPrice = (price?: number) => {
    if (!price) return "Price N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num?: number) => {
    if (!num) return "—";
    return num.toLocaleString();
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const fullAddress = [
    property.address?.streetAddress,
    property.address?.city,
    property.address?.state,
    property.address?.zipcode,
  ]
    .filter(Boolean)
    .join(", ");

  // Estimate monthly payment (rough calculation for display)
  const estimatedMonthly = property.price
    ? Math.round((property.price * 0.8 * 0.065) / 12 + property.price * 0.012 / 12 + 100)
    : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Property Details</SheetTitle>
          </SheetHeader>
          
          {/* Photo Gallery */}
          <div className="relative h-64 bg-muted">
            {hasPhotos ? (
              <>
                <img
                  src={photos[currentPhotoIndex]}
                  alt={`Property photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                      onClick={handlePrevPhoto}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-80 hover:opacity-100"
                      onClick={handleNextPhoto}
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="h-16 w-16 text-muted-foreground/40" />
              </div>
            )}
            
            {/* Close button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)]">
            <div className="p-6 space-y-6">
              {/* Price and Actions */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(property.price)}
                  </div>
                  {estimatedMonthly && (
                    <button
                      onClick={() => setShowMortgageCalc(true)}
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      Est. ${formatNumber(estimatedMonthly)}/mo
                      <Calculator className="h-3 w-3 ml-1" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="icon"
                    onClick={() => onSave?.(property)}
                    aria-label={isSaved ? "Unsave property" : "Save property"}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Share property">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-lg">{fullAddress || "Address not available"}</span>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Bed className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">{property.bedrooms ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Beds</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Bath className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">{property.bathrooms ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Baths</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Square className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">{formatNumber(property.livingArea)}</div>
                  <div className="text-xs text-muted-foreground">Sq Ft</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <div className="font-semibold">{property.yearBuilt ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">Built</div>
                </div>
              </div>

              {/* Status and Type */}
              <div className="flex flex-wrap gap-2">
                {property.listingStatus && (
                  <Badge variant="secondary">{property.listingStatus}</Badge>
                )}
                {property.propertyType && (
                  <Badge variant="outline">{property.propertyType}</Badge>
                )}
                {property.daysOnMarket !== undefined && (
                  <Badge variant="outline">{property.daysOnMarket} days on market</Badge>
                )}
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                <h3 className="font-semibold">Property Details</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {property.pricePerSqFt && (
                    <>
                      <span className="text-muted-foreground">Price per Sq Ft</span>
                      <span className="font-medium">${formatNumber(property.pricePerSqFt)}</span>
                    </>
                  )}
                  {property.lotSize && (
                    <>
                      <span className="text-muted-foreground">Lot Size</span>
                      <span className="font-medium">{formatNumber(property.lotSize)} sq ft</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Property ID</span>
                  <span className="font-medium font-mono text-xs">{property.zpid}</span>
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button className="flex-1" onClick={() => onSave?.(property)}>
                  <Heart className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save Property"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setShowMortgageCalc(true)}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Payment
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Mortgage Calculator Dialog */}
      <Dialog open={showMortgageCalc} onOpenChange={setShowMortgageCalc}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Estimate</DialogTitle>
          </DialogHeader>
          <MortgageCalculator propertyPrice={property.price || 300000} />
        </DialogContent>
      </Dialog>
    </>
  );
}
