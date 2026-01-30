import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuyerJourney, SellerJourney, BUYER_STAGES, SELLER_STAGES } from "@/components/journey";
import { mapPipelineToJourneyStage } from "@/lib/stageMapping";

export default function MyJourney() {
  const { activeRole } = useRole();
  const { user } = useAuth();

  const isBuyer = activeRole === "buyer";
  const stages = isBuyer ? BUYER_STAGES : SELLER_STAGES;

  // Fetch the user's active deal
  // Uses buyer_user_id/seller_user_id when available, falls back to deal_type
  const { data: deal, isLoading, error } = useQuery({
    queryKey: ["my-deal", user?.id, activeRole],
    queryFn: async () => {
      if (!user) return null;

      // First try to find deals linked directly to the user
      const userIdColumn = isBuyer ? "buyer_user_id" : "seller_user_id";
      
      let { data, error } = await supabase
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
            photos
          ),
          deal_milestones (
            id,
            title,
            due_date,
            completed_at,
            notes
          )
        `)
        .eq(userIdColumn, user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no deal found with user ID, fallback to deal_type filtering
      if (!data && !error) {
        const fallbackQuery = supabase
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
              photos
            ),
            deal_milestones (
              id,
              title,
              due_date,
              completed_at,
              notes
            )
          `)
          .eq("deal_type", isBuyer ? "buyer" : "seller")
          .order("created_at", { ascending: false })
          .limit(1);

        const fallbackResult = await fallbackQuery.maybeSingle();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Map pipeline stage to journey stage
  const pipelineStage = deal?.stage;
  const currentStage = mapPipelineToJourneyStage(
    pipelineStage,
    isBuyer ? "buyer" : "seller"
  );

  const property = deal?.properties as { address: string; city: string; state: string; zip_code: string; price: number | null; photos: string[] | null } | null;
  const milestones = deal?.deal_milestones as Array<{ id: string; title: string; due_date: string | null; completed_at: string | null; notes: string | null }> | null;

  return (
    <AppLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My {isBuyer ? "Buying" : "Selling"} Journey</h1>
          <p className="text-muted-foreground mt-1">
            Track your progress through the {isBuyer ? "home buying" : "home selling"} process
          </p>
        </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">Error loading journey: {(error as Error).message}</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !deal && (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active {isBuyer ? "purchase" : "sale"} found</h3>
                <p className="text-muted-foreground">
                  {isBuyer
                    ? "Start by searching for properties and saving the ones you like!"
                    : "Contact your agent to get started with listing your property."
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {deal && (
            <div className="space-y-6">
              {/* Property Summary */}
              {property && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                        {property.photos && property.photos.length > 0 ? (
                          <img
                            src={property.photos[0]}
                            alt={property.address}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{property.address}</h3>
                        <p className="text-sm text-muted-foreground">
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                        {property.price && (
                          <p className="text-lg font-bold text-primary mt-1">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(property.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Journey Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Journey Progress</CardTitle>
                  <CardDescription>
                    {currentStage
                      ? `You're currently at: ${stages.find(s => s.key === currentStage)?.label || currentStage}`
                      : "Your journey is just beginning!"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isBuyer ? (
                    <BuyerJourney currentStage={currentStage ?? undefined} />
                  ) : (
                    <SellerJourney currentStage={currentStage ?? undefined} />
                  )}
                </CardContent>
              </Card>

              {/* Milestones */}
              {milestones && milestones.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Milestones</CardTitle>
                    <CardDescription>Key dates and tasks for your transaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {milestones.map((milestone) => (
                        <div
                          key={milestone.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border",
                            milestone.completed_at && "bg-muted"
                          )}
                        >
                          <div className={cn(
                            "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center",
                            milestone.completed_at
                              ? "bg-green-500 text-white"
                              : "border-2 border-muted-foreground"
                          )}>
                            {milestone.completed_at && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium",
                              milestone.completed_at && "line-through text-muted-foreground"
                            )}>
                              {milestone.title}
                            </p>
                            {milestone.due_date && !milestone.completed_at && (
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(milestone.due_date).toLocaleDateString()}
                              </p>
                            )}
                            {milestone.completed_at && (
                              <p className="text-sm text-green-600">
                                Completed: {new Date(milestone.completed_at).toLocaleDateString()}
                              </p>
                            )}
                            {milestone.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{milestone.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
      </div>
    </AppLayout>
  );
}
