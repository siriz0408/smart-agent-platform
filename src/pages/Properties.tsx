import { useState } from "react";
import { Plus, Search, Filter, Grid, List, Bed, Bath, Square, MapPin, DollarSign, Home, Heart, Users, X, Bookmark, BookmarkCheck, Scale, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreatePropertyDialog } from "@/components/properties/CreatePropertyDialog";
import { PropertyDetailSheet } from "@/components/properties/PropertyDetailSheet";
import { UnifiedPropertyCard } from "@/components/properties/UnifiedPropertyCard";
import { SaveSearchDialog } from "@/components/properties/SaveSearchDialog";
import { PropertyComparisonTable } from "@/components/properties/PropertyComparisonTable";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { useSavedProperties, useRemoveSavedProperty } from "@/hooks/useSavedProperties";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { PropertyCardData } from "@/types/property";

type Property = Tables<"properties">;

interface BuyerInterest {
  contactId: string;
  contactName: string;
  savedCount: number;
  properties: Array<{
    id: string;
    propertyType: "internal" | "external";
    address: string;
    price: number | null;
    photo: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  off_market: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  coming_soon: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function Properties() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [filterMinBeds, setFilterMinBeds] = useState<string>("");
  const [filterMinBaths, setFilterMinBaths] = useState<string>("");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterMinSqft, setFilterMinSqft] = useState<string>("");
  const [filterPropertyTypes, setFilterPropertyTypes] = useState<string[]>([]);
  const [isSaveSearchDialogOpen, setIsSaveSearchDialogOpen] = useState(false);
  const [comparisonProperties, setComparisonProperties] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  
  const { savedSearches } = useSavedSearches();
  const { data: savedProperties = [] } = useSavedProperties();
  const removeSavedProperty = useRemoveSavedProperty();

  const activeFilterCount =
    filterStatuses.length +
    (filterMinBeds ? 1 : 0) +
    (filterMinBaths ? 1 : 0) +
    (filterMinPrice ? 1 : 0) +
    (filterMaxPrice ? 1 : 0) +
    (filterMinSqft ? 1 : 0) +
    filterPropertyTypes.length;

  const clearAllFilters = () => {
    setFilterStatuses([]);
    setFilterMinBeds("");
    setFilterMinBaths("");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMinSqft("");
    setFilterPropertyTypes([]);
  };

  // Get saved property IDs for current user
  const savedPropertyIds = new Set(
    savedProperties
      .filter(sp => sp.property_type === "internal" && sp.internal_property)
      .map(sp => sp.internal_property!.id)
  );

  // Convert Property to PropertyCardData for UnifiedPropertyCard
  const convertToPropertyCardData = (property: Property): PropertyCardData => {
    return {
      zpid: property.id,
      address: {
        streetAddress: property.address,
        city: property.city,
        state: property.state,
        zipcode: property.zip_code,
      },
      price: property.price ?? undefined,
      bedrooms: property.bedrooms ?? undefined,
      bathrooms: property.bathrooms ?? undefined,
      livingArea: property.square_feet ?? undefined,
      lotSize: property.lot_size ?? undefined,
      yearBuilt: property.year_built ?? undefined,
      propertyType: property.property_type ?? undefined,
      listingStatus: property.status?.toUpperCase() ?? undefined,
      daysOnMarket: property.days_on_market ?? undefined,
      photos: property.photos && property.photos.length > 0 ? property.photos : [],
      brokerName: property.listing_agent_name ?? undefined,
      listingAgentName: property.listing_agent_name ?? undefined,
      listingAgentPhone: property.listing_agent_phone ?? undefined,
      listingDate: property.listing_date ?? undefined,
    };
  };

  // Save property mutation
  const savePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("saved_properties")
        .insert({
          user_id: user.id,
          property_type: "internal",
          internal_property_id: propertyId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-properties"] });
      toast.success("Property saved");
    },
    onError: () => {
      toast.error("Failed to save property");
    },
  });

  const handleSaveProperty = (propertyId: string) => {
    if (savedPropertyIds.has(propertyId)) {
      // Find the saved property and remove it
      const savedProperty = savedProperties.find(
        sp => sp.property_type === "internal" && sp.internal_property?.id === propertyId
      );
      if (savedProperty) {
        removeSavedProperty.mutate(savedProperty.id);
      }
    } else {
      savePropertyMutation.mutate(propertyId);
    }
  };

  const handleLoadSavedSearch = (searchId: string) => {
    const search = savedSearches.find(s => s.id === searchId);
    if (!search) return;
    
    const criteria = search.criteria;
    if (criteria.location) setSearchQuery(criteria.location);
    if (criteria.beds) setFilterMinBeds(criteria.beds.toString());
    if (criteria.baths) setFilterMinBaths(criteria.baths.toString());
    if (criteria.priceMin) setFilterMinPrice(criteria.priceMin.toString());
    if (criteria.priceMax) setFilterMaxPrice(criteria.priceMax.toString());
    
    resetPage();
    toast.success(`Loaded search: ${search.search_name}`);
  };

  const handleSaveCurrentSearch = () => {
    if (!searchQuery && !filterMinBeds && !filterMinBaths && !filterMinPrice && !filterMaxPrice) {
      toast.error("Please add search criteria before saving");
      return;
    }
    setIsSaveSearchDialogOpen(true);
  };

  const handleCompareProperties = () => {
    if (comparisonProperties.length < 2) {
      toast.error("Select at least 2 properties to compare");
      return;
    }
    setIsComparisonOpen(true);
  };

  const handleToggleComparison = (propertyId: string) => {
    setComparisonProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId].slice(0, 5) // Max 5 properties
    );
  };

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailSheetOpen(true);
  };

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
  });

  // Fetch buyer interests (saved properties grouped by contact)
  const { data: buyerInterests = [], isLoading: isLoadingBuyerInterests } = useQuery({
    queryKey: ["buyer-interests"],
    queryFn: async (): Promise<BuyerInterest[]> => {
      // Fetch saved properties with contact info
      const { data: savedProperties, error } = await supabase
        .from("saved_properties")
        .select(`
          id,
          property_type,
          user_id,
          properties:internal_property_id (
            id,
            address,
            city,
            state,
            price,
            photos
          ),
          external_properties:external_property_id (
            id,
            price,
            photos,
            addresses:address_id (
              street_address,
              city,
              state
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles to get user names
      const userIds = [...new Set((savedProperties || []).map(sp => sp.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Group by user
      const groupedByUser = new Map<string, BuyerInterest>();

      for (const sp of savedProperties || []) {
        const userId = sp.user_id;
        const profile = profileMap.get(userId);

        if (!groupedByUser.has(userId)) {
          groupedByUser.set(userId, {
            contactId: userId,
            contactName: profile?.full_name || profile?.email || "Unknown Buyer",
            savedCount: 0,
            properties: [],
          });
        }

        const group = groupedByUser.get(userId)!;
        group.savedCount++;

        let propertyData: BuyerInterest["properties"][0] | null = null;

        if (sp.property_type === "internal" && sp.properties) {
          const prop = sp.properties as Record<string, unknown>;
          propertyData = {
            id: prop.id as string,
            propertyType: "internal",
            address: `${prop.address}, ${prop.city}, ${prop.state}`,
            price: prop.price as number | null,
            photo: (prop.photos as string[] | null)?.[0] || null,
          };
        } else if (sp.property_type === "external" && sp.external_properties) {
          const extProp = sp.external_properties as Record<string, unknown>;
          const addr = extProp.addresses as Record<string, unknown> | null;
          propertyData = {
            id: extProp.id as string,
            propertyType: "external",
            address: addr
              ? `${addr.street_address}, ${addr.city}, ${addr.state}`
              : "Address unavailable",
            price: extProp.price as number | null,
            photo: (extProp.photos as string[] | null)?.[0] || null,
          };
        }

        if (propertyData) {
          group.properties.push(propertyData);
        }
      }

      return Array.from(groupedByUser.values());
    },
    enabled: activeTab === "interests",
  });

  const filteredProperties = properties.filter((property) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      property.address.toLowerCase().includes(query) ||
      property.city.toLowerCase().includes(query) ||
      property.state.toLowerCase().includes(query) ||
      property.zip_code.toLowerCase().includes(query);
    const matchesStatus =
      filterStatuses.length === 0 || filterStatuses.includes(property.status || "");
    const matchesBeds =
      !filterMinBeds || (property.bedrooms ?? 0) >= parseInt(filterMinBeds);
    const matchesBaths =
      !filterMinBaths || (property.bathrooms ?? 0) >= parseInt(filterMinBaths);
    const matchesMinPrice =
      !filterMinPrice || (property.price ?? 0) >= parseInt(filterMinPrice);
    const matchesMaxPrice =
      !filterMaxPrice || (property.price ?? 0) <= parseInt(filterMaxPrice);
    const matchesSqft =
      !filterMinSqft || (property.square_feet ?? 0) >= parseInt(filterMinSqft);
    const matchesPropertyType =
      filterPropertyTypes.length === 0 || filterPropertyTypes.includes(property.property_type || "");
    return matchesSearch && matchesStatus && matchesBeds && matchesBaths && 
           matchesMinPrice && matchesMaxPrice && matchesSqft && matchesPropertyType;
  });

  const totalPages = Math.ceil(filteredProperties.length / pageSize);
  const paginatedProperties = filteredProperties.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetPage = () => setCurrentPage(1);

  const activeListings = properties.filter((p) => p.status === "active").length;
  const totalValue = properties
    .filter((p) => p.status === "active")
    .reduce((acc, p) => acc + (p.price || 0), 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Properties</h1>
            <p className="text-muted-foreground">
              Manage your property listings and buyer interests
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>

        <CreatePropertyDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />

        {/* Tabs for Listings vs Buyer Interests */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              My Listings
            </TabsTrigger>
            <TabsTrigger value="interests" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Buyer Interests
            </TabsTrigger>
          </TabsList>

          {/* My Listings Tab */}
          <TabsContent value="listings" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-semibold">{properties.length}</div>
                  )}
                  <div className="text-sm text-muted-foreground">Total Properties</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-semibold">{activeListings}</div>
                  )}
                  <div className="text-sm text-muted-foreground">Active Listings</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <div className="text-2xl font-semibold">
                      ${(totalValue / 1000000).toFixed(1)}M
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
                  className="pl-10"
                />
              </div>
              
              {/* Saved Searches Dropdown */}
              {savedSearches.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Saved Searches
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {savedSearches.map((search) => (
                      <DropdownMenuItem
                        key={search.id}
                        onClick={() => handleLoadSavedSearch(search.id)}
                      >
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        <div className="flex-1">
                          <div className="font-medium">{search.search_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {search.criteria.location || "Any location"}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Save Current Search */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveCurrentSearch}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Search
              </Button>

              {/* Comparison Button */}
              {comparisonProperties.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareProperties}
                  className="relative"
                >
                  <Scale className="h-4 w-4 mr-2" />
                  Compare ({comparisonProperties.length})
                </Button>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative" aria-label="Filter properties">
                    <Filter className="h-4 w-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 max-h-[80vh] overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Filters</h4>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={clearAllFilters}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear all
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      {Object.keys(statusColors).map((status) => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filterStatuses.includes(status)}
                            onCheckedChange={(checked) => {
                              setFilterStatuses((prev) =>
                                checked
                                  ? [...prev, status]
                                  : prev.filter((s) => s !== status)
                              );
                            }}
                          />
                          <Badge variant="secondary" className={statusColors[status]}>
                            {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Property Type</p>
                      {["single_family", "condo", "townhouse", "multi_family", "land", "commercial"].map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filterPropertyTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              setFilterPropertyTypes((prev) =>
                                checked
                                  ? [...prev, type]
                                  : prev.filter((t) => t !== type)
                              );
                            }}
                          />
                          <span className="text-sm">{type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Min Bedrooms</p>
                      <Select value={filterMinBeds} onValueChange={(v) => setFilterMinBeds(v === "any" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs">
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
                      <p className="text-xs font-medium text-muted-foreground">Min Bathrooms</p>
                      <Select value={filterMinBaths} onValueChange={(v) => setFilterMinBaths(v === "any" ? "" : v)}>
                        <SelectTrigger className="h-8 text-xs">
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
                      <p className="text-xs font-medium text-muted-foreground">Price Range</p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filterMinPrice}
                          onChange={(e) => setFilterMinPrice(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filterMaxPrice}
                          onChange={(e) => setFilterMaxPrice(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Min Square Feet</p>
                      <Input
                        type="number"
                        placeholder="Any"
                        value={filterMinSqft}
                        onChange={(e) => setFilterMinSqft(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
              <div className={cn(
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "space-y-4"
              )}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No properties found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search" : "Add your first property listing"}
                </p>
              </div>
            ) : (
              <div className={cn(
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "space-y-4"
              )}>
                {paginatedProperties.map((property) => {
                  const propertyCardData = convertToPropertyCardData(property);
                  const isSaved = savedPropertyIds.has(property.id);
                  const isInComparison = comparisonProperties.includes(property.id);

                  return (
                    <div key={property.id} className="relative">
                      {isInComparison && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-blue-600 text-white">
                            <Scale className="h-3 w-3 mr-1" />
                            Compare
                          </Badge>
                        </div>
                      )}
                      <UnifiedPropertyCard
                        property={propertyCardData}
                        context="search"
                        isSaved={isSaved}
                        isSaving={savePropertyMutation.isPending || removeSavedProperty.isPending}
                        onSave={() => handleSaveProperty(property.id)}
                        onView={() => handlePropertyClick(property)}
                      />
                      {viewMode === "grid" && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant={isInComparison ? "default" : "outline"}
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComparison(property.id);
                            }}
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            {isInComparison ? "Remove" : "Compare"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredProperties.length)} of {filteredProperties.length}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            isActive={currentPage === pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          {/* Buyer Interests Tab */}
          <TabsContent value="interests" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  {isLoadingBuyerInterests ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-semibold">{buyerInterests.length}</div>
                  )}
                  <div className="text-sm text-muted-foreground">Active Buyers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  {isLoadingBuyerInterests ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <div className="text-2xl font-semibold">
                      {buyerInterests.reduce((acc, b) => acc + b.savedCount, 0)}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">Total Saved Properties</div>
                </CardContent>
              </Card>
            </div>

            {/* Buyer Interest Cards */}
            {isLoadingBuyerInterests ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <div className="flex gap-4">
                        <Skeleton className="h-20 w-20 rounded" />
                        <Skeleton className="h-20 w-20 rounded" />
                        <Skeleton className="h-20 w-20 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : buyerInterests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No buyer interests yet</h3>
                <p className="text-muted-foreground">
                  When buyers save properties, they'll appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {buyerInterests.map((buyer) => (
                  <Card key={buyer.contactId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        {buyer.contactName}
                        <Badge variant="secondary" className="ml-auto">
                          {buyer.savedCount} saved
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {buyer.properties.slice(0, 5).map((prop) => (
                          <div
                            key={prop.id}
                            className="shrink-0 w-40"
                          >
                            <div className="aspect-[4/3] relative bg-muted rounded-lg overflow-hidden mb-2">
                              {prop.photo ? (
                                <img
                                  src={prop.photo}
                                  alt={prop.address}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              {prop.propertyType === "external" && (
                                <span className="absolute bottom-1 left-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
                                  External
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">
                              {prop.price
                                ? `$${prop.price.toLocaleString()}`
                                : "Price N/A"}
                            </p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground truncate">
                                  {prop.address}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent>{prop.address}</TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                        {buyer.properties.length > 5 && (
                          <div className="shrink-0 w-40 aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">
                              +{buyer.properties.length - 5} more
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Property Detail Sheet */}
        <PropertyDetailSheet
          property={selectedProperty}
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
        />

        {/* Save Search Dialog */}
        <SaveSearchDialog
          open={isSaveSearchDialogOpen}
          onOpenChange={setIsSaveSearchDialogOpen}
          searchParams={{
            location: searchQuery,
            beds: filterMinBeds ? parseInt(filterMinBeds) : undefined,
            baths: filterMinBaths ? parseInt(filterMinBaths) : undefined,
            priceMin: filterMinPrice ? parseInt(filterMinPrice) : undefined,
            priceMax: filterMaxPrice ? parseInt(filterMaxPrice) : undefined,
          }}
        />

        {/* Property Comparison Table */}
        {comparisonProperties.length > 0 && (
          <PropertyComparisonTable
            open={isComparisonOpen}
            onOpenChange={setIsComparisonOpen}
            properties={comparisonProperties
              .map(propertyId => {
                // First try to find in saved properties
                const savedProperty = savedProperties.find(sp => 
                  sp.property_type === "internal" && 
                  sp.internal_property?.id === propertyId
                );
                if (savedProperty) return savedProperty;
                
                // If not saved, create a temporary SavedProperty from the property
                const property = properties.find(p => p.id === propertyId);
                if (!property) return null;
                
                return {
                  id: `temp-${property.id}`,
                  property_type: "internal" as const,
                  notes: null,
                  is_favorite: false,
                  created_at: property.created_at,
                  updated_at: property.updated_at,
                  internal_property: {
                    id: property.id,
                    address: property.address,
                    city: property.city,
                    state: property.state,
                    zip_code: property.zip_code,
                    price: property.price,
                    bedrooms: property.bedrooms,
                    bathrooms: property.bathrooms,
                    square_feet: property.square_feet,
                    lot_size: property.lot_size,
                    year_built: property.year_built,
                    property_type: property.property_type,
                    status: property.status,
                    photos: property.photos,
                  },
                };
              })
              .filter((p): p is NonNullable<typeof p> => p !== null)}
            onRemoveProperty={(savedPropertyId) => {
              // Extract property ID from saved property ID
              const propertyId = savedPropertyId.startsWith("temp-")
                ? savedPropertyId.replace("temp-", "")
                : savedProperties.find(sp => sp.id === savedPropertyId)?.internal_property?.id;
              
              if (propertyId) {
                setComparisonProperties(prev => 
                  prev.filter(id => id !== propertyId)
                );
              }
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
