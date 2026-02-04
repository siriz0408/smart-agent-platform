import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bookmark, Trash2, Bell, BellOff, Search, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SearchParams } from "@/components/properties/SaveSearchDialog";

export default function SavedSearches() {
  const navigate = useNavigate();
  const { savedSearches, isLoading, updateSearch, deleteSearch } = useSavedSearches();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatSearchCriteria = (criteria: SearchParams): string => {
    const parts: string[] = [criteria.location];
    if (criteria.beds) parts.push(`${criteria.beds}+ beds`);
    if (criteria.baths) parts.push(`${criteria.baths}+ baths`);
    if (criteria.priceMin)
      parts.push(`$${(criteria.priceMin / 1000).toFixed(0)}k+`);
    if (criteria.priceMax)
      parts.push(`up to $${(criteria.priceMax / 1000).toFixed(0)}k`);
    if (criteria.propertyType) parts.push(criteria.propertyType);
    return parts.join(" • ");
  };

  const handleRunSearch = (criteria: SearchParams) => {
    // Navigate to chat page with property search message pre-filled
    const message = `Find properties in ${criteria.location}${
      criteria.beds ? ` with ${criteria.beds}+ bedrooms` : ""
    }${criteria.baths ? ` and ${criteria.baths}+ bathrooms` : ""}${
      criteria.priceMax ? ` under $${criteria.priceMax.toLocaleString()}` : ""
    }`;
    navigate("/", { state: { initialMessage: message } });
  };

  const handleDeleteSearch = async (id: string) => {
    await deleteSearch.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Bookmark className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Saved Property Searches</h1>
              <p className="text-muted-foreground mt-1">
                Manage your saved searches and notification preferences
              </p>
            </div>
          </div>
        </div>

        {/* Saved Searches List */}
        {savedSearches.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Saved Searches</h3>
              <p className="text-muted-foreground text-center mb-4">
                Save property searches to get notified when new matches are found
              </p>
              <Button onClick={() => navigate("/")}>
                <Search className="h-4 w-4 mr-2" />
                Start Searching
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {savedSearches.map((search) => (
              <Card key={search.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {search.search_name}
                        {search.notification_frequency !== "off" ? (
                          <Badge variant="secondary" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            {search.notification_frequency}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <BellOff className="h-3 w-3 mr-1" />
                            No notifications
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {formatSearchCriteria(search.criteria)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {search.last_checked ? (
                        <span>
                          Last checked{" "}
                          {formatDistanceToNow(new Date(search.last_checked), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span>Never checked yet</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Notification Frequency Selector */}
                      <Select
                        value={search.notification_frequency}
                        onValueChange={(value) =>
                          updateSearch.mutate({
                            id: search.id,
                            updates: { notification_frequency: value },
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant">Instant</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="off">Off</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Run Search Now Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunSearch(search.criteria)}
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Run Search
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteConfirm(search.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Search?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this saved search and stop all notifications.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteSearch(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
