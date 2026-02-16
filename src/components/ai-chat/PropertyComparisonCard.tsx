import { useState } from "react";
import { ArrowUpDown, Check, Home, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZillowPropertyDetailSheet } from "./ZillowPropertyDetailSheet";
import type { EmbeddedComponents, PropertyCardData } from "@/types/property";

type PropertyComparisonData = NonNullable<EmbeddedComponents["property_comparison"]>;

interface PropertyComparisonCardProps {
  comparison: PropertyComparisonData;
}

type SortKey = "price" | "livingArea" | "bedrooms" | "bathrooms" | "pricePerSqFt" | "yearBuilt";

export function PropertyComparisonCard({ comparison }: PropertyComparisonCardProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyCardData | null>(null);

  const { properties } = comparison;

  if (!properties || properties.length === 0) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  // Find best values for highlighting
  const bestValues = {
    price: Math.min(...properties.map((p) => p.price)),
    livingArea: Math.max(...properties.map((p) => p.livingArea)),
    pricePerSqFt: Math.min(...properties.filter((p) => p.pricePerSqFt).map((p) => p.pricePerSqFt!)),
    bedrooms: Math.max(...properties.map((p) => p.bedrooms)),
    bathrooms: Math.max(...properties.map((p) => p.bathrooms)),
    yearBuilt: Math.max(...properties.filter((p) => p.yearBuilt).map((p) => p.yearBuilt!)),
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      // Lower is better for price/pricePerSqFt, higher is better for the rest
      setSortAsc(key === "price" || key === "pricePerSqFt");
    }
  };

  const sortedProperties = [...properties].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const handlePropertyClick = (prop: PropertyComparisonData["properties"][number]) => {
    // Convert comparison data to PropertyCardData for the detail sheet
    const cardData: PropertyCardData = {
      zpid: prop.zpid,
      address: {
        streetAddress: prop.address.split(",")[0]?.trim() || "",
        city: prop.address.split(",")[1]?.trim() || "",
        state: prop.address.split(",")[2]?.trim().split(" ")[0] || "",
        zipcode: prop.address.split(",")[2]?.trim().split(" ")[1] || "",
      },
      price: prop.price,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      livingArea: prop.livingArea,
      yearBuilt: prop.yearBuilt,
      propertyType: prop.propertyType,
      imgSrc: prop.imgSrc,
      photos: prop.imgSrc ? [prop.imgSrc] : [],
      pricePerSqFt: prop.pricePerSqFt,
    };
    setSelectedProperty(cardData);
  };

  return (
    <>
      <Card className="mt-4 overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5" />
            Property Comparison ({properties.length} properties)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left p-3 font-medium">Property</th>
                  <SortableHeader label="Price" sortKey="price" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortableHeader label="Beds" sortKey="bedrooms" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortableHeader label="Baths" sortKey="bathrooms" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortableHeader label="Sqft" sortKey="livingArea" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortableHeader label="$/Sqft" sortKey="pricePerSqFt" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <SortableHeader label="Year" sortKey="yearBuilt" currentKey={sortKey} asc={sortAsc} onSort={handleSort} />
                  <th className="text-left p-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {sortedProperties.map((prop, idx) => (
                  <tr
                    key={prop.zpid || idx}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => handlePropertyClick(prop)}
                  >
                    {/* Property with thumbnail */}
                    <td className="p-3">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        {prop.imgSrc ? (
                          <img
                            src={prop.imgSrc}
                            alt={prop.address}
                            className="w-12 h-10 rounded object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Home className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[160px]">{prop.address}</p>
                          <button className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                            <ExternalLink className="h-2.5 w-2.5" /> Details
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="p-3">
                      <span className={`font-semibold ${prop.price === bestValues.price ? "text-green-600 dark:text-green-400" : ""}`}>
                        {formatPrice(prop.price)}
                      </span>
                      {prop.price === bestValues.price && properties.length > 1 && (
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400 inline ml-1" />
                      )}
                    </td>

                    {/* Beds */}
                    <td className="p-3 text-center">
                      <span className={prop.bedrooms === bestValues.bedrooms ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                        {prop.bedrooms}
                      </span>
                    </td>

                    {/* Baths */}
                    <td className="p-3 text-center">
                      <span className={prop.bathrooms === bestValues.bathrooms ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                        {prop.bathrooms}
                      </span>
                    </td>

                    {/* Sqft */}
                    <td className="p-3">
                      <span className={prop.livingArea === bestValues.livingArea ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                        {prop.livingArea.toLocaleString()}
                      </span>
                    </td>

                    {/* $/Sqft */}
                    <td className="p-3">
                      {prop.pricePerSqFt ? (
                        <span className={prop.pricePerSqFt === bestValues.pricePerSqFt ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                          ${prop.pricePerSqFt}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Year */}
                    <td className="p-3">
                      {prop.yearBuilt ? (
                        <span className={prop.yearBuilt === bestValues.yearBuilt ? "font-semibold text-green-600 dark:text-green-400" : ""}>
                          {prop.yearBuilt}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {prop.propertyType}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HOA Info */}
          {properties.some((p) => p.hoaFee && p.hoaFee > 0) && (
            <div className="p-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <strong>HOA Fees:</strong>{" "}
              {properties.map((p, i) => (
                <span key={i}>
                  {p.address.split(",")[0]}: {p.hoaFee ? `$${p.hoaFee}/mo` : "None"}
                  {i < properties.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Detail Sheet */}
      <ZillowPropertyDetailSheet
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
      />
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th className="p-3 font-medium">
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-0 font-medium text-xs hover:bg-transparent ${isActive ? "text-primary" : ""}`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ml-1 ${isActive ? "opacity-100" : "opacity-40"}`} />
        {isActive && <span className="text-[10px] ml-0.5">{asc ? "↑" : "↓"}</span>}
      </Button>
    </th>
  );
}
