import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export interface SearchParams {
  location: string;
  beds?: number;
  baths?: number;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
}

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchParams: SearchParams;
}

export function SaveSearchDialog({
  open,
  onOpenChange,
  searchParams,
}: SaveSearchDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchName, setSearchName] = useState(
    `Homes in ${searchParams.location || "your area"}`
  );
  const [notificationFrequency, setNotificationFrequency] = useState<string>("daily");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!profile?.tenant_id) {
      toast({
        title: "Error",
        description: "You must be logged in to save searches",
        variant: "destructive",
      });
      return;
    }

    if (!searchName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for this search",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("property_searches").insert({
        tenant_id: profile.tenant_id,
        user_id: profile.user_id,
        search_name: searchName,
        criteria: searchParams as unknown as Json,
        notification_frequency: notificationFrequency,
        email_notifications: emailNotifications,
        last_results: [],
      });

      if (error) throw error;

      toast({
        title: "Search Saved",
        description: `You'll receive ${notificationFrequency} notifications for "${searchName}"`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving search:", error);
      toast({
        title: "Error",
        description: "Failed to save search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatCriteria = () => {
    const parts: string[] = [];
    if (searchParams.beds) parts.push(`${searchParams.beds}+ beds`);
    if (searchParams.baths) parts.push(`${searchParams.baths}+ baths`);
    if (searchParams.priceMin)
      parts.push(`$${(searchParams.priceMin / 1000).toFixed(0)}k+`);
    if (searchParams.priceMax)
      parts.push(`up to $${(searchParams.priceMax / 1000).toFixed(0)}k`);
    if (searchParams.propertyType) parts.push(searchParams.propertyType);
    return parts;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Property Search</DialogTitle>
          <DialogDescription>
            Get notified when new properties match your search criteria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Name */}
          <div className="space-y-2">
            <Label htmlFor="search-name">Search Name</Label>
            <Input
              id="search-name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="e.g., Family homes in Denver"
            />
          </div>

          {/* Notification Frequency */}
          <div className="space-y-2">
            <Label htmlFor="notification-frequency">Notification Frequency</Label>
            <Select
              value={notificationFrequency}
              onValueChange={setNotificationFrequency}
            >
              <SelectTrigger id="notification-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (as soon as new matches found)</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
                <SelectItem value="off">Off (no notifications)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
            />
            <Label htmlFor="email-notifications" className="cursor-pointer">
              Send email notifications
            </Label>
          </div>

          {/* Search Criteria Preview */}
          <div className="space-y-2">
            <Label>Search Criteria</Label>
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
              <Badge variant="secondary">{searchParams.location}</Badge>
              {formatCriteria().map((criterion, i) => (
                <Badge key={i} variant="outline">
                  {criterion}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Search"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
