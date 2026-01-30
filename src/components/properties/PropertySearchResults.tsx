import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronLeft, ChevronRight, Search, MapPin, List, Map, LayoutGrid } from "lucide-react";
import type { ResidentialProperty } from "@/hooks/usePropertySearch";
import { UnifiedPropertyCard } from "./UnifiedPropertyCard";
import { PropertySearchSkeleton } from "./PropertySearchSkeleton";
import { PropertyMap } from "./PropertyMap";
import { PropertyDetailViewSheet } from "./PropertyDetailViewSheet";

type ViewMode = "list" | "map" | "split";

interface PropertySearchResultsProps {
  results: ResidentialProperty[];
  totalResults: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  isMock?: boolean;
  hasSearched: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSave: (property: ResidentialProperty) => void;
  isSaving: boolean;
  savedPropertyIds?: Set<string>;
}

export function PropertySearchResults({
  results,
  totalResults,
  totalPages,
  currentPage,
  isLoading,
  isMock,
  hasSearched,
  onPrevPage,
  onNextPage,
  onSave,
  isSaving,
  savedPropertyIds = new Set(),
}: PropertySearchResultsProps) {
  // Selected property for detail view
  const [selectedProperty, setSelectedProperty] = useState<ResidentialProperty | null>(null);
  
  // Default to split on desktop, list on mobile
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "list";
    }
    return "split";
  });

  // Update view mode on resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === "split") {
        setViewMode("list");
      }
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  if (isLoading) {
    return <PropertySearchSkeleton />;
  }

  if (!hasSearched) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Search for properties</h3>
              <p className="text-muted-foreground mt-1">
                Enter a location above to find available properties
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">No properties found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search criteria or location
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Results Header with View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {totalResults.toLocaleString()} {totalResults === 1 ? "property" : "properties"}
          </span>
          {isMock && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Sample data
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="px-3">
              <List className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="Map view" className="px-3">
              <Map className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Map</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="split" aria-label="Split view" className="px-3 hidden md:flex">
              <LayoutGrid className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Split</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((property) => (
            <UnifiedPropertyCard
              key={property.zpid}
              property={property}
              context="search"
              onSave={() => onSave(property)}
              onView={() => setSelectedProperty(property)}
              isSaved={savedPropertyIds.has(property.zpid)}
              isSaving={isSaving}
            />
          ))}
        </div>
      )}

      {viewMode === "map" && (
        <PropertyMap
          properties={results}
          onSave={onSave}
          isSaving={isSaving}
          className="h-[600px]"
        />
      )}

      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property List - Scrollable */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
            {results.map((property) => (
              <UnifiedPropertyCard
                key={property.zpid}
                property={property}
                context="search"
                onSave={() => onSave(property)}
                onView={() => setSelectedProperty(property)}
                isSaved={savedPropertyIds.has(property.zpid)}
                isSaving={isSaving}
              />
            ))}
          </div>

          {/* Map */}
          <PropertyMap
            properties={results}
            onSave={onSave}
            isSaving={isSaving}
            className="h-[600px] sticky top-4"
          />
        </div>
      )}

      {/* Bottom Pagination for long lists (list view only) */}
      {viewMode === "list" && totalPages > 1 && results.length >= 6 && (
        <div className="flex justify-center pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Property Detail View Sheet */}
      <PropertyDetailViewSheet
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        onSave={onSave}
        isSaving={isSaving}
      />
    </div>
  );
}
