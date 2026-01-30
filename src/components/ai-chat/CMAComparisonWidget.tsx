import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

interface ComparableProperty {
  zpid: string;
  address: string;
  price: number;
  priceFormatted: string;
  pricePerSqFt?: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  homeType: string;
  photo?: string;
  soldDate?: string;
  distance?: number; // miles from subject
}

interface CMAComparisonWidgetProps {
  subjectProperty?: {
    address: string;
    price?: number;
    bedrooms?: number;
    bathrooms?: number;
    livingArea?: number;
  };
  comparables: ComparableProperty[];
  analysis?: {
    avgPrice: number;
    avgPricePerSqFt: number;
    minPrice: number;
    maxPrice: number;
    medianPrice?: number;
  };
}

export function CMAComparisonWidget({ 
  subjectProperty, 
  comparables, 
  analysis 
}: CMAComparisonWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPricePerSqFt = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const estimatedValue = analysis && subjectProperty?.livingArea 
    ? Math.round(analysis.avgPricePerSqFt * subjectProperty.livingArea)
    : null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 3));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(comparables.length - 3, prev + 3));
  };

  const visibleComps = comparables.slice(currentIndex, currentIndex + 3);

  if (!comparables || comparables.length === 0) {
    return (
      <Card className="my-4 border-border">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No comparable sales found for this property.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-4 border-border overflow-hidden">
      <CardHeader className="pb-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Comparable Market Analysis (CMA)
            </CardTitle>
            {subjectProperty?.address && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Subject: {subjectProperty.address}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {comparables.length} Comps
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Analysis Summary */}
        {analysis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Price</p>
              <p className="text-lg font-bold text-foreground">{formatPrice(analysis.avgPrice)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg $/SqFt</p>
              <p className="text-lg font-bold text-foreground">{formatPricePerSqFt(analysis.avgPricePerSqFt)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Price Range</p>
              <p className="text-lg font-bold text-foreground">
                {formatPrice(analysis.minPrice)} - {formatPrice(analysis.maxPrice)}
              </p>
            </div>
            {estimatedValue && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Est. Value</p>
                <p className="text-lg font-bold text-primary">{formatPrice(estimatedValue)}</p>
              </div>
            )}
          </div>
        )}

        {/* Comparable Properties Carousel */}
        <div className="relative">
          {/* Navigation buttons */}
          {comparables.length > 3 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 h-8 w-8 rounded-full shadow-md"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 h-8 w-8 rounded-full shadow-md"
                onClick={goToNext}
                disabled={currentIndex >= comparables.length - 3}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Property Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
            {visibleComps.map((comp) => (
              <Card key={comp.zpid} className="overflow-hidden border-border hover:shadow-md transition-shadow">
                {/* Property Image */}
                <div className="h-32 bg-muted relative">
                  {comp.photo ? (
                    <img
                      src={comp.photo}
                      alt={comp.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs">
                    SOLD
                  </Badge>
                </div>

                {/* Property Details */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-foreground">
                      {comp.priceFormatted || formatPrice(comp.price)}
                    </span>
                    {comp.pricePerSqFt && (
                      <span className="text-xs text-muted-foreground">
                        {formatPricePerSqFt(comp.pricePerSqFt)}/sqft
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground truncate" title={comp.address}>
                    {comp.address}
                  </p>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{comp.bedrooms} bd</span>
                    <span>|</span>
                    <span>{comp.bathrooms} ba</span>
                    <span>|</span>
                    <span>{comp.livingArea?.toLocaleString()} sqft</span>
                  </div>

                  {comp.soldDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Sold {comp.soldDate}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pagination indicator */}
        {comparables.length > 3 && (
          <div className="flex justify-center gap-1">
            {Array.from({ length: Math.ceil(comparables.length / 3) }).map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  Math.floor(currentIndex / 3) === idx 
                    ? "bg-primary scale-110" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                onClick={() => setCurrentIndex(idx * 3)}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Recently sold comparable properties. Estimated values are for informational purposes only.
          Consult a licensed appraiser for official valuations.
        </p>
      </CardContent>
    </Card>
  );
}
