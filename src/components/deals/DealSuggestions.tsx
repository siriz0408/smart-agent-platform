import { useQueryClient } from "@tanstack/react-query";
import { useDealSuggestions, type DealSuggestion } from "@/hooks/useDealSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  TrendingUp, 
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DealSuggestionsProps {
  dealId: string | null;
  onSuggestionAction?: (suggestion: DealSuggestion) => void;
}

const suggestionIcons = {
  action: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  opportunity: TrendingUp,
};

const suggestionColors = {
  action: "text-blue-600",
  warning: "text-orange-600",
  info: "text-gray-600",
  opportunity: "text-green-600",
};

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

export function DealSuggestions({ dealId, onSuggestionAction }: DealSuggestionsProps) {
  const { data: suggestions = [], isLoading, error } = useDealSuggestions(dealId);
  const queryClient = useQueryClient();

  const handleAction = async (suggestion: DealSuggestion) => {
    if (!suggestion.action || !dealId) return;

    try {
      switch (suggestion.action.type) {
        case "move_stage": {
          const newStage = suggestion.action.params?.stage as string;
          if (newStage) {
            const { error } = await supabase
              .from("deals")
              .update({ 
                stage: newStage,
                updated_at: new Date().toISOString(),
              })
              .eq("id", dealId);
            
            if (error) throw error;
            
            toast.success("Deal stage updated", {
              description: `Moved to ${newStage.replace("_", " ")}`,
            });
            
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["deal-detail", dealId] });
            queryClient.invalidateQueries({ queryKey: ["deal-suggestions", dealId] });
          }
          break;
        }
        
        case "add_milestone": {
          // This would typically open a dialog, but for now we'll just show a message
          toast.info("Add milestone", {
            description: "Use the milestones section to add a new milestone.",
          });
          break;
        }
        
        case "contact_client": {
          // This would typically open contact dialog or email composer
          toast.info("Contact client", {
            description: "Use the contact section to reach out.",
          });
          break;
        }
        
        case "update_date": {
          // This would typically open edit dialog
          toast.info("Update date", {
            description: "Use the deal details to update dates.",
          });
          break;
        }
        
        default:
          // Call custom handler if provided
          if (onSuggestionAction) {
            onSuggestionAction(suggestion);
          }
      }
    } catch (error) {
      console.error("Error executing suggestion action:", error);
      toast.error("Failed to execute action", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load suggestions. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No suggestions at this time. Your deal looks good!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered recommendations to help move your deal forward
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestionIcons[suggestion.type] || Info;
          const iconColor = suggestionColors[suggestion.type] || "text-gray-600";
          
          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border",
                suggestion.priority === "high" && "bg-red-50 border-red-200",
                suggestion.priority === "medium" && "bg-yellow-50 border-yellow-200",
                suggestion.priority === "low" && "bg-blue-50 border-blue-200",
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <Badge
                    variant="outline"
                    className={cn("text-xs flex-shrink-0", priorityColors[suggestion.priority])}
                  >
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {suggestion.description}
                </p>
                {suggestion.action && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(suggestion)}
                    className="h-7 text-xs"
                  >
                    {suggestion.action.label}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
