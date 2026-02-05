import { X, MapPin, Bed, Bath, Square, Calendar, DollarSign, Home, Ruler, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { SavedProperty } from "@/hooks/useSavedProperties";

interface PropertyComparisonTableProps {
  properties: SavedProperty[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveProperty: (id: string) => void;
}

export function PropertyComparisonTable({
  properties,
  open,
  onOpenChange,
  onRemoveProperty,
}: PropertyComparisonTableProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return "—";
    return num.toLocaleString();
  };

  // Extract property data from either internal or external source
  const getPropertyData = (property: SavedProperty) => {
    const data = property.property_type === "internal"
      ? property.internal_property
      : property.external_property;

    if (!data) return null;

    let address: string;
    if (property.property_type === "internal" && property.internal_property) {
      address = `${property.internal_property.address}, ${property.internal_property.city}, ${property.internal_property.state}`;
    } else if (property.external_property?.address) {
      const extAddr = property.external_property.address;
      address = extAddr.formatted_address || `${extAddr.street_address}, ${extAddr.city}, ${extAddr.state} ${extAddr.zip_code}`;
    } else {
      address = "Address unavailable";
    }

    // Calculate estimated monthly payment (assuming 20% down, 6.5% rate, 30 years)
    const calculateMonthlyPayment = (price: number | null) => {
      if (!price) return null;
      const downPayment = price * 0.20;
      const loanAmount = price - downPayment;
      const monthlyRate = 0.065 / 12;
      const numberOfPayments = 30 * 12;
      const monthlyPrincipalInterest = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      // Add estimated property tax (1.2% annually) and insurance ($100/month)
      const propertyTax = (price * 0.012) / 12;
      const insurance = 100;
      return Math.round(monthlyPrincipalInterest + propertyTax + insurance);
    };

    return {
      id: property.id,
      address,
      photo: data.photos?.[0],
      price: data.price,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      sqft: data.square_feet,
      lotSize: data.lot_size,
      yearBuilt: data.year_built,
      propertyType: data.property_type,
      status: data.status,
      pricePerSqft: data.price && data.square_feet 
        ? Math.round(data.price / data.square_feet) 
        : null,
      estimatedMonthly: calculateMonthlyPayment(data.price),
    };
  };

  const formatLotSize = (lotSize: number | null | undefined) => {
    if (lotSize === null || lotSize === undefined) return "—";
    // If lot size is large (likely in sqft), convert to acres for display
    if (lotSize >= 43560) {
      return `${(lotSize / 43560).toFixed(2)} acres`;
    }
    return `${formatNumber(lotSize)} sqft`;
  };

  const comparisonRows = [
    { 
      label: "Price", 
      icon: DollarSign, 
      getValue: (d: ReturnType<typeof getPropertyData>) => formatPrice(d?.price ?? null),
      highlight: true,
    },
    { 
      label: "Est. Monthly", 
      icon: DollarSign, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.estimatedMonthly ? formatPrice(d.estimatedMonthly) + "/mo" : "—",
      highlight: true,
    },
    { 
      label: "Bedrooms", 
      icon: Bed, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.bedrooms ? `${d.bedrooms} beds` : "—",
    },
    { 
      label: "Bathrooms", 
      icon: Bath, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.bathrooms ? `${d.bathrooms} baths` : "—",
    },
    { 
      label: "Square Feet", 
      icon: Square, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.sqft ? `${formatNumber(d.sqft)} sqft` : "—",
    },
    { 
      label: "Lot Size", 
      icon: Ruler, 
      getValue: (d: ReturnType<typeof getPropertyData>) => formatLotSize(d?.lotSize),
    },
    { 
      label: "Year Built", 
      icon: Building, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.yearBuilt ? d.yearBuilt.toString() : "—",
    },
    { 
      label: "Price/Sqft", 
      icon: DollarSign, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.pricePerSqft ? `$${formatNumber(d.pricePerSqft)}/sqft` : "—",
    },
    { 
      label: "Property Type", 
      icon: Home, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.propertyType || "—",
    },
    { 
      label: "Status", 
      icon: Calendar, 
      getValue: (d: ReturnType<typeof getPropertyData>) => d?.status?.replace(/_/g, ' ') || "—",
    },
  ];

  // Find best values for highlighting
  const propertyDataList = properties.map(getPropertyData).filter(Boolean);
  
  const findBest = (getValue: (d: ReturnType<typeof getPropertyData>) => number | null) => {
    const values = propertyDataList.map(d => getValue(d)).filter((v): v is number => v !== null);
    return values.length > 0 ? Math.min(...values) : null; // Lower is better for price
  };

  const findHighest = (getValue: (d: ReturnType<typeof getPropertyData>) => number | null) => {
    const values = propertyDataList.map(d => getValue(d)).filter((v): v is number => v !== null);
    return values.length > 0 ? Math.max(...values) : null; // Higher is better for sqft
  };

  const lowestPrice = findBest(d => d?.price ?? null);
  const lowestMonthly = findBest(d => d?.estimatedMonthly ?? null);
  const highestSqft = findHighest(d => d?.sqft ?? null);
  const highestLotSize = findHighest(d => d?.lotSize ?? null);
  const newestBuilt = findHighest(d => d?.yearBuilt ?? null);
  const lowestPricePerSqft = findBest(d => d?.pricePerSqft ?? null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Compare Properties ({properties.length})</DialogTitle>
        </DialogHeader>

        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 bg-muted/50 font-medium text-muted-foreground w-36">
                    Property
                  </th>
                  {properties.map((property) => {
                    const data = getPropertyData(property);
                    return (
                      <th key={property.id} className="p-3 bg-muted/50 min-w-[200px]">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-1 -right-1 h-6 w-6"
                            onClick={() => onRemoveProperty(property.id)}
                            aria-label="Remove from comparison"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          
                          <div className="aspect-video w-full mb-2 rounded-lg overflow-hidden bg-muted">
                            {data?.photo ? (
                              <img
                                src={data.photo}
                                alt={data.address}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm font-normal text-foreground line-clamp-2">
                            {data?.address}
                          </p>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => (
                  <tr key={row.label} className={idx % 2 === 0 ? "bg-muted/20" : ""}>
                    <td className="p-3 font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <row.icon className="h-4 w-4" />
                        {row.label}
                      </div>
                    </td>
                    {properties.map((property) => {
                      const data = getPropertyData(property);
                      const value = row.getValue(data);
                      
                      // Determine if this cell should be highlighted as "best"
                      let isBest = false;
                      if (row.label === "Price" && data?.price === lowestPrice) {
                        isBest = true;
                      } else if (row.label === "Est. Monthly" && data?.estimatedMonthly === lowestMonthly) {
                        isBest = true;
                      } else if (row.label === "Square Feet" && data?.sqft === highestSqft) {
                        isBest = true;
                      } else if (row.label === "Lot Size" && data?.lotSize === highestLotSize) {
                        isBest = true;
                      } else if (row.label === "Year Built" && data?.yearBuilt === newestBuilt) {
                        isBest = true;
                      } else if (row.label === "Price/Sqft" && data?.pricePerSqft === lowestPricePerSqft) {
                        isBest = true;
                      }

                      return (
                        <td 
                          key={property.id} 
                          className={`p-3 text-center ${
                            row.highlight ? "text-lg font-bold" : ""
                          } ${isBest ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30" : ""}`}
                        >
                          {value}
                          {isBest && (
                            <span className="ml-1 text-xs font-normal">(Best)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Notes row */}
                <tr className="bg-muted/20">
                  <td className="p-3 font-medium text-muted-foreground">
                    Your Notes
                  </td>
                  {properties.map((property) => (
                    <td key={property.id} className="p-3 text-center text-sm">
                      {property.notes ? (
                        <p className="text-muted-foreground line-clamp-3">{property.notes}</p>
                      ) : (
                        <span className="text-muted-foreground/50 italic">No notes</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
