import { useState } from "react";
import { ChevronLeft, ChevronRight, Home, Bath, Bed, Maximize, Calendar, DollarSign, Car, MapPin, Heart, ExternalLink, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MortgageCalculator } from "./MortgageCalculator";
import { useSaveProperty } from "@/hooks/usePropertySearch";
import { toast } from "sonner";
import type { EmbeddedComponents } from "@/types/property";

type PropertyDetailData = NonNullable<EmbeddedComponents["property_detail"]>;

interface PropertyDetailCardProps {
  detail: PropertyDetailData;
}

export function PropertyDetailCard({ detail }: PropertyDetailCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveProperty = useSaveProperty();

  const photos = detail.photos || [];
  const hasPhotos = photos.length > 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleSave = async () => {
    try {
      await saveProperty.mutateAsync({
        zpid: detail.zpid,
        address: {
          streetAddress: detail.address?.streetAddress || "",
          city: detail.address?.city || "",
          state: detail.address?.state || "",
          zipcode: detail.address?.zipcode || "",
          latitude: detail.address?.latitude,
          longitude: detail.address?.longitude,
        },
        price: detail.price,
        bedrooms: detail.bedrooms,
        bathrooms: detail.bathrooms,
        livingArea: detail.livingArea,
        lotSize: detail.lotSize,
        yearBuilt: detail.yearBuilt,
        propertyType: detail.propertyType,
        homeStatus: detail.homeStatus,
        imgSrc: photos[0],
      });
      setSaved(true);
      toast.success("Property saved!");
    } catch {
      toast.error("Failed to save property");
    }
  };

  const address = [
    detail.address?.streetAddress,
    detail.address?.city,
    detail.address?.state,
    detail.address?.zipcode,
  ].filter(Boolean).join(", ");

  return (
    <Card className="mt-4 overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
      {/* Hero Image / Photo Carousel */}
      {hasPhotos && (
        <div className="relative w-full h-64 sm:h-80 bg-muted">
          <img
            src={photos[photoIndex]}
            alt={`Property photo ${photoIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8"
                onClick={handlePrevPhoto}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8"
                onClick={handleNextPhoto}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
                {photoIndex + 1} / {photos.length}
              </div>
            </>
          )}
          {/* Status badge */}
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
            {detail.homeStatus}
          </Badge>
        </div>
      )}

      {/* Photo Thumbnails Row */}
      {photos.length > 1 && (
        <div className="flex gap-1 p-2 overflow-x-auto bg-muted/30">
          {photos.slice(0, 12).map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setPhotoIndex(idx)}
              className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                idx === photoIndex ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={photo}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </button>
          ))}
        </div>
      )}

      <CardContent className="p-4 space-y-4">
        {/* Price & Address */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-foreground">
              {formatPrice(detail.price)}
            </h3>
            <div className="flex gap-2">
              <Button
                variant={saved ? "secondary" : "outline"}
                size="sm"
                onClick={handleSave}
                disabled={saved}
              >
                <Heart className={`h-4 w-4 mr-1 ${saved ? "fill-current text-red-500" : ""}`} />
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {address}
          </p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatItem icon={<Bed className="h-4 w-4" />} label="Beds" value={String(detail.bedrooms)} />
          <StatItem icon={<Bath className="h-4 w-4" />} label="Baths" value={String(detail.bathrooms)} />
          <StatItem icon={<Maximize className="h-4 w-4" />} label="Sqft" value={detail.livingArea.toLocaleString()} />
          {detail.yearBuilt && (
            <StatItem icon={<Calendar className="h-4 w-4" />} label="Built" value={String(detail.yearBuilt)} />
          )}
          {detail.lotSize && (
            <StatItem icon={<Home className="h-4 w-4" />} label="Lot" value={`${detail.lotSize.toLocaleString()} sqft`} />
          )}
          {detail.pricePerSqFt && (
            <StatItem icon={<DollarSign className="h-4 w-4" />} label="$/Sqft" value={`$${detail.pricePerSqFt}`} />
          )}
        </div>

        {/* Additional Stats Row */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Building className="h-3 w-3 mr-1" />
            {detail.propertyType}
          </Badge>
          {detail.hoaFee && detail.hoaFee > 0 && (
            <Badge variant="outline" className="text-xs">
              HOA: ${detail.hoaFee}/mo
            </Badge>
          )}
          {detail.parkingSpaces && detail.parkingSpaces > 0 && (
            <Badge variant="outline" className="text-xs">
              <Car className="h-3 w-3 mr-1" />
              {detail.parkingSpaces} parking
            </Badge>
          )}
        </div>

        {/* Description */}
        {detail.description && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Description</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detail.description}
            </p>
          </div>
        )}

        {/* Features */}
        {detail.features && detail.features.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Features & Amenities</h4>
            <div className="flex flex-wrap gap-1.5">
              {detail.features.map((feature, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Price History */}
        {detail.priceHistory && detail.priceHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Price History</h4>
            <div className="space-y-1">
              {detail.priceHistory.map((entry, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                  <span>{entry.date}</span>
                  <span className="font-medium text-foreground">{formatPrice(entry.price)}</span>
                  <span>{entry.event}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax History */}
        {detail.taxHistory && detail.taxHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Tax History</h4>
            <div className="space-y-1">
              {detail.taxHistory.map((entry, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                  <span>{entry.year}</span>
                  <span className="font-medium text-foreground">{formatPrice(entry.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mortgage Calculator Toggle */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            {showCalculator ? "Hide" : "Show"} Mortgage Calculator
          </Button>
          {showCalculator && (
            <div className="mt-3">
              <MortgageCalculator propertyPrice={detail.price} />
            </div>
          )}
        </div>

        {/* Zillow Link */}
        <a
          href={`https://www.zillow.com/homedetails/${detail.zpid}_zpid/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View on Zillow
        </a>
      </CardContent>
    </Card>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center p-2 bg-muted/30 rounded-lg">
      <span className="text-muted-foreground mb-1">{icon}</span>
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
