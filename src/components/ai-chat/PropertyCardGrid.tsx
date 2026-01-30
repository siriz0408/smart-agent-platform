import { useState } from "react";
import { Heart, Home, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZillowPropertyDetailSheet } from "./ZillowPropertyDetailSheet";
import { useSaveProperty } from "@/hooks/usePropertySearch";
import { useToast } from "@/hooks/use-toast";
import type { PropertyCardData } from "@/types/property";

interface PropertyCardGridProps {
  properties: PropertyCardData[];
  title?: string;
}

export function PropertyCardGrid({ properties, title }: PropertyCardGridProps) {
  const [selectedProperty, setSelectedProperty] = useState<PropertyCardData | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [photoIndices, setPhotoIndices] = useState<Record<string, number>>({});
  const saveProperty = useSaveProperty();
  const { toast } = useToast();

  if (!properties || properties.length === 0) {
    return null;
  }

  const formatPrice = (price?: number) => {
    if (!price) return "Price N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSaveProperty = async (e: React.MouseEvent, property: PropertyCardData) => {
    e.stopPropagation();
    try {
      const saveData = {
        zpid: property.zpid,
        address: {
          streetAddress: property.address?.streetAddress || "",
          city: property.address?.city || "",
          state: property.address?.state || "",
          zipcode: property.address?.zipcode || "",
          latitude: property.address?.latitude,
          longitude: property.address?.longitude,
        },
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        livingArea: property.livingArea || 0,
        lotSize: property.lotSize,
        yearBuilt: property.yearBuilt,
        propertyType: property.propertyType || "House",
        homeStatus: property.listingStatus || "FOR_SALE",
        imgSrc: property.imgSrc || property.photos?.[0],
      };
      
      await saveProperty.mutateAsync(saveData);
      
      setSavedIds((prev) => new Set(prev).add(property.zpid));
      toast({
        title: "Property saved",
        description: "Added to your saved properties",
      });
    } catch (error) {
      toast({
        title: "Error saving property",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const getPhotoIndex = (zpid: string) => photoIndices[zpid] || 0;
  
  const navigatePhoto = (e: React.MouseEvent, zpid: string, photos: string[], direction: 'prev' | 'next') => {
    e.stopPropagation();
    const currentIndex = getPhotoIndex(zpid);
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % photos.length 
      : (currentIndex - 1 + photos.length) % photos.length;
    setPhotoIndices(prev => ({ ...prev, [zpid]: newIndex }));
  };

  // Format stats like Zillow: "3 bds | 2 ba | 1,350 sqft - House for sale"
  const formatStats = (property: PropertyCardData) => {
    const parts: string[] = [];
    
    if (property.bedrooms !== undefined && property.bedrooms > 0) {
      parts.push(`${property.bedrooms} bds`);
    }
    if (property.bathrooms !== undefined && property.bathrooms > 0) {
      parts.push(`${property.bathrooms} ba`);
    }
    if (property.livingArea && property.livingArea > 0) {
      parts.push(`${property.livingArea.toLocaleString()} sqft`);
    }
    
    const statsText = parts.join(' | ');
    const listingType = property.listingStatus === "FOR_RENT" 
      ? `${property.propertyType || 'Home'} for rent`
      : `${property.propertyType || 'House'} for sale`;
    
    return { statsText, listingType };
  };

  // Format full address with zip code
  const formatAddress = (property: PropertyCardData) => {
    const parts: string[] = [];
    if (property.address?.streetAddress) parts.push(property.address.streetAddress);
    if (property.address?.city) parts.push(property.address.city);
    if (property.address?.state) {
      const stateZip = property.address.zipcode 
        ? `${property.address.state} ${property.address.zipcode}`
        : property.address.state;
      parts.push(stateZip);
    }
    return parts.join(', ');
  };

  return (
    <div className="my-4">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.slice(0, 6).map((property) => {
          const isSaved = savedIds.has(property.zpid);
          // Safety check: handle missing photos with fallback
          const photos = property.photos && property.photos.length > 0
            ? property.photos
            : property.imgSrc
            ? [property.imgSrc]
            : [];
          const currentPhotoIndex = getPhotoIndex(property.zpid);
          const currentPhoto = photos[currentPhotoIndex];
          const { statsText, listingType } = formatStats(property);
          const fullAddress = formatAddress(property);
          
          return (
            <Card 
              key={property.zpid} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group bg-card border-border"
              onClick={() => setSelectedProperty(property)}
            >
              {/* Image Section */}
              <div className="relative h-48 bg-muted">
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={property.address?.streetAddress || "Property"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Home className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* Days on market badge - top left (Zillow orange) */}
                {property.daysOnMarket !== undefined && property.daysOnMarket > 0 && (
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded shadow-md">
                    {property.daysOnMarket} days on Zillow
                  </div>
                )}
                
                {/* Heart save button - top right (always visible) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                  onClick={(e) => handleSaveProperty(e, property)}
                >
                  <Heart 
                    className={`h-5 w-5 ${isSaved ? "fill-red-500 text-red-500" : "text-foreground"}`} 
                  />
                </Button>
                
                {/* Photo navigation arrows (always visible when multiple photos) */}
                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={(e) => navigatePhoto(e, property.zpid, photos, 'prev')}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={(e) => navigatePhoto(e, property.zpid, photos, 'next')}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                
                {/* Photo carousel dots - clickable */}
                {photos.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.slice(0, 6).map((_, idx) => (
                      <button 
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentPhotoIndex 
                            ? 'bg-white scale-110' 
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoIndices(prev => ({ ...prev, [property.zpid]: idx }));
                        }}
                      />
                    ))}
                    {photos.length > 6 && (
                      <span className="text-white text-xs ml-1">+{photos.length - 6}</span>
                    )}
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                {/* Price and actions row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xl font-bold text-foreground">
                    {formatPrice(property.price)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                {/* Stats row: "3 bds | 2 ba | 1,350 sqft - House for sale" */}
                <div className="text-sm text-muted-foreground mb-1">
                  {statsText && <span>{statsText}</span>}
                  {statsText && listingType && <span> - </span>}
                  <span>{listingType}</span>
                </div>

                {/* Full address with zip */}
                <div className="text-sm text-foreground">
                  {fullAddress}
                </div>

                {/* Broker info if available */}
                {property.brokerName && (
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                    {property.brokerName}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {properties.length > 6 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          Showing 6 of {properties.length} properties. Ask me for more details or to narrow down.
        </p>
      )}

      {/* Property Detail Sheet */}
      <ZillowPropertyDetailSheet
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        onSave={(prop) => handleSaveProperty({ stopPropagation: () => {} } as React.MouseEvent, prop)}
        isSaved={selectedProperty ? savedIds.has(selectedProperty.zpid) : false}
      />
    </div>
  );
}
