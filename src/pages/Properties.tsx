import { useState } from "react";
import { Plus, Search, Filter, Grid, List, Bed, Bath, Square, MapPin, DollarSign, Home, Heart, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { CreatePropertyDialog } from "@/components/properties/CreatePropertyDialog";
import { PropertyDetailSheet } from "@/components/properties/PropertyDetailSheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const [activeTab, setActiveTab] = useState("listings");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);

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
    return (
      property.address.toLowerCase().includes(query) ||
      property.city.toLowerCase().includes(query)
    );
  });

  const activeListings = properties.filter((p) => p.status === "active").length;
  const totalValue = properties
    .filter((p) => p.status === "active")
    .reduce((acc, p) => acc + (p.price || 0), 0);

  const getPlaceholderImage = (index: number) => {
    const images = [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop",
    ];
    return images[index % images.length];
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
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
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
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
                {filteredProperties.map((property, index) => {
                  const photoUrl = property.photos?.[0] || getPlaceholderImage(index);

                  return (
                    <Card key={property.id} className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handlePropertyClick(property)}>
                      {viewMode === "grid" ? (
                        <>
                          <div className="relative aspect-[4/3]">
                            <img
                              src={photoUrl}
                              alt={property.address}
                              className="object-cover w-full h-full"
                            />
                            <Badge
                              className={cn(
                                "absolute top-3 left-3",
                                statusColors[property.status || "active"]
                              )}
                            >
                              {(property.status || "active").replace("_", " ")}
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-1 text-2xl font-semibold mb-1">
                              <DollarSign className="h-5 w-5" />
                              {(property.price || 0).toLocaleString()}
                            </div>
                            <div className="font-medium mb-1">{property.address}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-3.5 w-3.5" />
                              {property.city}, {property.state}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {property.bedrooms && (
                                <div className="flex items-center gap-1">
                                  <Bed className="h-4 w-4" />
                                  {property.bedrooms}
                                </div>
                              )}
                              {property.bathrooms && (
                                <div className="flex items-center gap-1">
                                  <Bath className="h-4 w-4" />
                                  {Number(property.bathrooms)}
                                </div>
                              )}
                              {property.square_feet && (
                                <div className="flex items-center gap-1">
                                  <Square className="h-4 w-4" />
                                  {property.square_feet.toLocaleString()} sqft
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </>
                      ) : (
                        <CardContent className="p-4 flex gap-4">
                          <img
                            src={photoUrl}
                            alt={property.address}
                            className="w-32 h-24 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-xl font-semibold">
                                ${(property.price || 0).toLocaleString()}
                              </div>
                              <Badge className={statusColors[property.status || "active"]}>
                                {(property.status || "active").replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="font-medium">{property.address}</div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3.5 w-3.5" />
                              {property.city}, {property.state}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {property.bedrooms && (
                                <div className="flex items-center gap-1">
                                  <Bed className="h-4 w-4" />
                                  {property.bedrooms} beds
                                </div>
                              )}
                              {property.bathrooms && (
                                <div className="flex items-center gap-1">
                                  <Bath className="h-4 w-4" />
                                  {Number(property.bathrooms)} baths
                                </div>
                              )}
                              {property.square_feet && (
                                <div className="flex items-center gap-1">
                                  <Square className="h-4 w-4" />
                                  {property.square_feet.toLocaleString()} sqft
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
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
                            <p className="text-xs text-muted-foreground truncate">
                              {prop.address}
                            </p>
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
      </div>
    </AppLayout>
  );
}
