import { DollarSign, Home, Calendar, Building, TrendingUp, Phone, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { format } from "date-fns";

// Safe date formatter to prevent crashes from invalid dates
const formatSafeDate = (dateString: string | null | undefined, formatString: string): string => {
  if (!dateString) return "Invalid date";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, formatString);
  } catch {
    return "Invalid date";
  }
};

interface UserPreferencesPanelProps {
  userId: string | null;
  className?: string;
}

export function UserPreferencesPanel({ userId, className }: UserPreferencesPanelProps) {
  const { data: preferences, isLoading, error } = useUserPreferences(userId);

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load user preferences</AlertDescription>
      </Alert>
    );
  }

  if (!preferences) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This user hasn't set their preferences yet. They can update their preferences in Settings → My Preferences.
        </AlertDescription>
      </Alert>
    );
  }

  const hasSearchPreferences =
    preferences.price_min ||
    preferences.price_max ||
    preferences.preferred_beds ||
    preferences.preferred_baths ||
    preferences.preferred_areas?.length ||
    preferences.preferred_property_types?.length;

  const hasFinancialInfo =
    preferences.pre_approval_status ||
    preferences.pre_approval_amount ||
    preferences.lender_name;

  const hasTimelineInfo = preferences.target_move_date || preferences.urgency_level;

  const hasCommunicationPrefs =
    preferences.preferred_contact_method || preferences.best_time_to_call;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🔒 User's Preferences (Read-Only)
        </CardTitle>
        <CardDescription>
          These preferences are controlled by the user and updated in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Criteria */}
        {hasSearchPreferences && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Home className="h-4 w-4" />
              Property Search
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(preferences.price_min || preferences.price_max) && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">
                    {preferences.price_min
                      ? `$${Number(preferences.price_min).toLocaleString()}`
                      : "Any"}{" "}
                    -{" "}
                    {preferences.price_max
                      ? `$${Number(preferences.price_max).toLocaleString()}`
                      : "Any"}
                  </span>
                </div>
              )}
              {preferences.preferred_beds && (
                <div className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Beds:</span>
                  <span className="font-medium">{preferences.preferred_beds}+</span>
                </div>
              )}
              {preferences.preferred_baths && (
                <div className="flex items-center gap-2">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Baths:</span>
                  <span className="font-medium">{preferences.preferred_baths}+</span>
                </div>
              )}
            </div>
            {preferences.preferred_areas && preferences.preferred_areas.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-sm text-muted-foreground">Areas:</span>
                {preferences.preferred_areas.map((area, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            )}
            {preferences.preferred_property_types &&
              preferences.preferred_property_types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-muted-foreground">Property Types:</span>
                  {preferences.preferred_property_types.map((type, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Financial Info */}
        {hasFinancialInfo && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Financial Status
            </h4>
            <div className="space-y-1 text-sm">
              {preferences.pre_approval_status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pre-Approval:</span>
                  <Badge
                    variant={
                      preferences.pre_approval_status === "approved"
                        ? "default"
                        : preferences.pre_approval_status === "pending"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {preferences.pre_approval_status}
                  </Badge>
                </div>
              )}
              {preferences.pre_approval_amount && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pre-Approval Amount:</span>
                  <span className="font-medium">
                    ${Number(preferences.pre_approval_amount).toLocaleString()}
                  </span>
                </div>
              )}
              {preferences.lender_name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lender:</span>
                  <span className="font-medium">{preferences.lender_name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        {hasTimelineInfo && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h4>
            <div className="space-y-1 text-sm">
              {preferences.urgency_level && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Urgency:</span>
                  <Badge
                    variant={
                      preferences.urgency_level === "high"
                        ? "destructive"
                        : preferences.urgency_level === "medium"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {preferences.urgency_level}
                  </Badge>
                </div>
              )}
              {preferences.target_move_date && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Target Move Date:</span>
                  <span className="font-medium">
                    {formatSafeDate(preferences.target_move_date, "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Communication Preferences */}
        {hasCommunicationPrefs && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Communication
            </h4>
            <div className="space-y-1 text-sm">
              {preferences.preferred_contact_method && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Preferred Method:</span>
                  <Badge variant="outline">{preferences.preferred_contact_method}</Badge>
                </div>
              )}
              {preferences.best_time_to_call && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Best Time:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {preferences.best_time_to_call}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {preferences.updated_at && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last updated:{" "}
            {formatSafeDate(preferences.updated_at, "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
