import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FileText, MessageSquare, UserPlus, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type ActivityItem =
  | { type: "conversation"; data: Tables<"ai_conversations"> }
  | { type: "document"; data: Tables<"documents"> }
  | { type: "contact"; data: Tables<"contacts"> }
  | { type: "deal"; data: Tables<"deals"> };

interface RecentActivityFeedProps {
  limit?: number;
  className?: string;
}

export function RecentActivityFeed({ limit = 5, className }: RecentActivityFeedProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["recent-activity", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const activities: ActivityItem[] = [];

      // Fetch recent conversations
      const { data: conversations } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (conversations) {
        conversations.forEach((conv) => {
          activities.push({ type: "conversation", data: conv });
        });
      }

      // Fetch recent documents
      const { data: documents } = await supabase
        .from("documents")
        .select("id, name, created_at")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (documents) {
        documents.forEach((doc) => {
          activities.push({ type: "document", data: doc });
        });
      }

      // Fetch recent contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, created_at")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (contacts) {
        contacts.forEach((contact) => {
          activities.push({ type: "contact", data: contact });
        });
      }

      // Fetch recent deals
      const { data: deals } = await supabase
        .from("deals")
        .select("id, deal_type, stage, updated_at")
        .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`)
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (deals) {
        deals.forEach((deal) => {
          activities.push({ type: "deal", data: deal });
        });
      }

      // Sort all activities by date (most recent first)
      return activities.sort((a, b) => {
        const dateA = a.type === "conversation" || a.type === "deal" 
          ? new Date(a.data.updated_at).getTime()
          : new Date(a.data.created_at).getTime();
        const dateB = b.type === "conversation" || b.type === "deal"
          ? new Date(b.data.updated_at).getTime()
          : new Date(b.data.created_at).getTime();
        return dateB - dateA;
      }).slice(0, limit);
    },
    enabled: !!workspaceId && !!user,
  });

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "conversation":
        return MessageSquare;
      case "document":
        return FileText;
      case "contact":
        return UserPlus;
      case "deal":
        return TrendingUp;
    }
  };

  const getActivityLabel = (item: ActivityItem) => {
    switch (item.type) {
      case "conversation":
        return item.data.title || "Untitled conversation";
      case "document":
        return item.data.name || "Untitled document";
      case "contact":
        return `${item.data.first_name || ""} ${item.data.last_name || ""}`.trim() || "Unnamed contact";
      case "deal":
        return `${item.data.deal_type} deal - ${item.data.stage}`;
    }
  };

  const getActivityTime = (item: ActivityItem) => {
    const date = item.type === "conversation" || item.type === "deal"
      ? item.data.updated_at
      : item.data.created_at;
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (!workspaceId) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity. Start by uploading a document or creating a contact!
          </p>
        ) : (
          <ScrollArea className="h-[200px] sm:h-[250px]">
            <div className="space-y-3 pr-4">
              {activities.map((item, index) => {
                const Icon = getActivityIcon(item.type);
                return (
                  <div
                    key={`${item.type}-${item.data.id}-${index}`}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getActivityLabel(item)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getActivityTime(item)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
