import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { MapPin, Bed, Bath, Square, Calendar, DollarSign, FileText, Loader2, Home } from "lucide-react";

export default function MyListing() {
  const { user } = useAuth();

  // Fetch the seller's deal and linked property
  const { data: deal, isLoading, error } = useQuery({
    queryKey: ["seller-deal", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Find deals where this user is the seller
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          properties (
            id,
            address,
            city,
            state,
            zip_code,
            price,
            bedrooms,
            bathrooms,
            square_feet,
            lot_size,
            year_built,
            property_type,
            status,
            description,
            photos,
            features,
            mls_number
          )
        `)
        .eq("deal_type", "sell")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const property = deal?.properties as typeof deal extends { properties: infer P } ? P : null;

  const formatPrice = (price: number | null) => {
    if (!price) return "Price TBD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    sold: "bg-blue-100 text-blue-800",
    withdrawn: "bg-gray-100 text-gray-800",
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Listing</h1>
          <p className="text-muted-foreground mt-1">View and manage your property listing</p>
        </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error loading listing: {(error as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !property && (
            <Card>
              <CardContent className="py-12 text-center">
                <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No listing found</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have an active listing yet. Contact your agent to get started.
                </p>
                <Button asChild>
                  <Link to="/messages">Message Your Agent</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {property && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Property Card */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <div className="aspect-video relative bg-muted overflow-hidden rounded-t-lg">
                    {property.photos && property.photos.length > 0 ? (
                      <img
                        src={property.photos[0]}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className={`absolute top-4 left-4 ${statusColors[property.status || "active"] || statusColors.active}`}>
                      {property.status || "Active"}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-3xl font-bold text-primary">
                          {formatPrice(property.price)}
                        </h2>
                        <p className="text-lg font-medium mt-1">{property.address}</p>
                        <p className="text-muted-foreground">
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                        {property.mls_number && (
                          <p className="text-sm text-muted-foreground mt-1">
                            MLS# {property.mls_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 py-4 border-y">
                      <div className="text-center">
                        <Bed className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-2xl font-bold">{property.bedrooms || "-"}</p>
                        <p className="text-sm text-muted-foreground">Beds</p>
                      </div>
                      <div className="text-center">
                        <Bath className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-2xl font-bold">{property.bathrooms || "-"}</p>
                        <p className="text-sm text-muted-foreground">Baths</p>
                      </div>
                      <div className="text-center">
                        <Square className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-2xl font-bold">{property.square_feet?.toLocaleString() || "-"}</p>
                        <p className="text-sm text-muted-foreground">Sq Ft</p>
                      </div>
                      <div className="text-center">
                        <Calendar className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-2xl font-bold">{property.year_built || "-"}</p>
                        <p className="text-sm text-muted-foreground">Built</p>
                      </div>
                    </div>

                    {property.description && (
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{property.description}</p>
                      </div>
                    )}

                    {property.features && property.features.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-semibold mb-2">Features</h3>
                        <div className="flex flex-wrap gap-2">
                          {property.features.map((feature, i) => (
                            <Badge key={i} variant="secondary">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Photo Gallery */}
                {property.photos && property.photos.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Photos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {property.photos.slice(1).map((photo, i) => (
                          <div key={i} className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img
                              src={photo}
                              alt={`Property photo ${i + 2}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Listing Status</CardTitle>
                    <CardDescription>Current stage of your sale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`${statusColors[property.status || "active"] || statusColors.active} text-lg py-1 px-3`}>
                      {property.status || "Active"}
                    </Badge>
                    {deal?.stage && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Journey Stage: <span className="font-medium">{deal.stage.replace(/_/g, " ")}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full" asChild>
                      <Link to="/my-journey">
                        <DollarSign className="h-4 w-4 mr-2" />
                        View My Journey
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/documents">
                        <FileText className="h-4 w-4 mr-2" />
                        View Documents
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/messages">
                        Message Agent
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                {deal && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Deal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {deal.estimated_value && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Value</span>
                          <span className="font-medium">{formatPrice(deal.estimated_value)}</span>
                        </div>
                      )}
                      {deal.expected_close_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expected Close</span>
                          <span className="font-medium">
                            {new Date(deal.expected_close_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
      </div>
    </AppLayout>
  );
}
