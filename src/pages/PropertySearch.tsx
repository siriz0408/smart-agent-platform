import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePropertySearch, useSaveProperty, type ResidentialProperty } from "@/hooks/usePropertySearch";
import { useSavedPropertyIds } from "@/hooks/useSavedPropertyIds";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Search, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { PropertySearchResults } from "@/components/properties/PropertySearchResults";

export default function PropertySearch() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [location, setLocation] = useState("");
  const [beds, setBeds] = useState("any");
  const [baths, setBaths] = useState("any");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sqftMin, setSqftMin] = useState("");
  const [sqftMax, setSqftMax] = useState("");
  const [listType, setListType] = useState<"for-sale" | "for-rent">("for-sale");
  const [propertyType, setPropertyType] = useState("All");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const { data, isLoading, error, searchParams, search, nextPage, prevPage } = usePropertySearch();
  const saveProperty = useSaveProperty();
  const { savedIds, invalidate: invalidateSavedIds } = useSavedPropertyIds();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      toast.error("Please enter a location");
      return;
    }
    search({
      location,
      listType,
      propertyType: propertyType !== "All" ? propertyType : undefined,
      beds: beds !== "any" ? parseInt(beds) : undefined,
      baths: baths !== "any" ? parseInt(baths) : undefined,
      minPrice: priceMin ? parseInt(priceMin) : undefined,
      maxPrice: priceMax ? parseInt(priceMax) : undefined,
      minSqft: sqftMin ? parseInt(sqftMin) : undefined,
      maxSqft: sqftMax ? parseInt(sqftMax) : undefined,
    });
    // Close drawer on mobile after search
    if (isMobile) {
      setIsFilterDrawerOpen(false);
    }
  };

  const handleSave = async (property: ResidentialProperty) => {
    try {
      await saveProperty.mutateAsync(property);
      invalidateSavedIds(); // Refresh saved IDs after successful save
      toast.success("Property saved!");
    } catch {
      toast.error("Failed to save property");
    }
  };

  // Inline form JSX to prevent component recreation on state change
  const filterFormContent = (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="City, State (e.g., Austin, TX)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="listType">List Type</Label>
          <Select value={listType} onValueChange={(v) => setListType(v as "for-sale" | "for-rent")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="for-sale">For Sale</SelectItem>
              <SelectItem value="for-rent">For Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="propertyType">Property Type</Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Types</SelectItem>
              <SelectItem value="Single Family">Single Family</SelectItem>
              <SelectItem value="Condo">Condo</SelectItem>
              <SelectItem value="Townhouse">Townhouse</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Land">Land</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="beds">Min Beds</Label>
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="baths">Min Baths</Label>
          <Select value={baths} onValueChange={setBaths}>
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceMin">Min Price</Label>
          <Input
            id="priceMin"
            type="number"
            placeholder="$0"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceMax">Max Price</Label>
          <Input
            id="priceMax"
            type="number"
            placeholder="Any"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sqftMin">Min Sqft</Label>
          <Input
            id="sqftMin"
            type="number"
            placeholder="0"
            value={sqftMin}
            onChange={(e) => setSqftMin(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sqftMax">Max Sqft</Label>
          <Input
            id="sqftMax"
            type="number"
            placeholder="Any"
            value={sqftMax}
            onChange={(e) => setSqftMax(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" className="w-full h-11" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Search className="h-4 w-4 mr-2" />
        )}
        Search Properties
      </Button>
    </form>
  );

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Property Search</h1>
          <p className="text-muted-foreground mt-1">Find your perfect home</p>
        </div>

        {/* Mobile: Filter Drawer | Desktop: Inline Card */}
        {isMobile ? (
          <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
            <SheetTrigger asChild>
              <Button className="w-full mb-4 h-11 bg-glean-purple hover:bg-glean-purple/90">
                <Filter className="h-5 w-5 mr-2" />
                Filters & Search
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Search Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                {filterFormContent}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
            </CardHeader>
            <CardContent>
              {filterFormContent}
            </CardContent>
          </Card>
        )}

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error: {(error as Error).message}</p>
              </CardContent>
            </Card>
          )}

        {/* Results */}
        <PropertySearchResults
          results={data?.results || []}
          totalResults={data?.totalResults || 0}
          totalPages={data?.totalPages || 0}
          currentPage={searchParams.page || 1}
          isLoading={isLoading}
          isMock={data?._mock}
          hasSearched={!!searchParams.location}
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onSave={handleSave}
          isSaving={saveProperty.isPending}
          savedPropertyIds={savedIds}
        />
      </div>
    </AppLayout>
  );
}
