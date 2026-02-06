import { useNavigate } from "react-router-dom";
import { Home, MapPin, DollarSign, Bed, Bath, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/hooks/useGlobalSearch";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  off_market: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  coming_soon: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const propertyTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  multi_family: "Multi-Family",
  land: "Land",
  commercial: "Commercial",
};

interface PropertyResultCardProps {
  result: SearchResult;
  /** Optional callback invoked before navigation (for click tracking) */
  onBeforeNavigate?: (entityType: string, entityId: string) => void;
}

export function PropertyResultCard({ result, onBeforeNavigate }: PropertyResultCardProps) {
  const navigate = useNavigate();

  const price = result.metadata?.price as number | undefined;
  const status = (result.metadata?.status as string) || "active";
  const propertyType = (result.metadata?.property_type as string) || "single_family";
  const bedrooms = result.metadata?.bedrooms as number | undefined;
  const bathrooms = result.metadata?.bathrooms as number | undefined;
  const squareFeet = result.metadata?.square_feet as number | undefined;

  const handleClick = () => {
    onBeforeNavigate?.("property", result.entity_id);
    navigate(`/properties/${result.entity_id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Price */}
            {price !== undefined && (
              <div className="flex items-center gap-1 text-lg font-semibold mb-1">
                <DollarSign className="h-4 w-4" />
                {price.toLocaleString()}
              </div>
            )}

            {/* Address */}
            <h3 className="font-medium truncate mb-1">{result.name}</h3>
            <p className="text-sm text-muted-foreground truncate mb-2">
              {result.subtitle}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge
                variant="secondary"
                className={`text-xs ${statusColors[status]}`}
              >
                {status.replace("_", " ").toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {propertyTypeLabels[propertyType] || propertyType}
              </span>
            </div>

            {/* Property Features */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {bedrooms !== undefined && (
                <div className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  <span>{bedrooms}</span>
                </div>
              )}
              {bathrooms !== undefined && (
                <div className="flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  <span>{Number(bathrooms)}</span>
                </div>
              )}
              {squareFeet !== undefined && (
                <div className="flex items-center gap-1">
                  <Square className="h-3 w-3" />
                  <span>{squareFeet.toLocaleString()} sq ft</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
