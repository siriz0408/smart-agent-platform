import { useQuery } from "@tanstack/react-query";
import { FileText, Users, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: typeof FileText;
  label: string;
  value: number | null;
  isLoading: boolean;
  onClick?: () => void;
}

function StatCard({ icon: Icon, label, value, isLoading, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold">
                {value?.toLocaleString() ?? 0}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ml-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsOverviewProps {
  className?: string;
  onStatClick?: (stat: "documents" | "contacts" | "deals" | "conversations") => void;
}

export function StatsOverview({ className, onStatClick }: StatsOverviewProps) {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) {
        return {
          documents: 0,
          contacts: 0,
          deals: 0,
          conversations: 0,
        };
      }

      const [documentsResult, contactsResult, dealsResult, conversationsResult] = await Promise.all([
        supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("deals")
          .select("*", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("ai_conversations")
          .select("*", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
      ]);

      return {
        documents: documentsResult.count ?? 0,
        contacts: contactsResult.count ?? 0,
        deals: dealsResult.count ?? 0,
        conversations: conversationsResult.count ?? 0,
      };
    },
    enabled: !!workspaceId && !!user,
  });

  if (!workspaceId) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4", className)}>
      <StatCard
        icon={FileText}
        label="Documents"
        value={stats?.documents ?? null}
        isLoading={isLoading}
        onClick={onStatClick ? () => onStatClick("documents") : undefined}
      />
      <StatCard
        icon={Users}
        label="Contacts"
        value={stats?.contacts ?? null}
        isLoading={isLoading}
        onClick={onStatClick ? () => onStatClick("contacts") : undefined}
      />
      <StatCard
        icon={TrendingUp}
        label="Deals"
        value={stats?.deals ?? null}
        isLoading={isLoading}
        onClick={onStatClick ? () => onStatClick("deals") : undefined}
      />
      <StatCard
        icon={MessageSquare}
        label="Conversations"
        value={stats?.conversations ?? null}
        isLoading={isLoading}
        onClick={onStatClick ? () => onStatClick("conversations") : undefined}
      />
    </div>
  );
}
