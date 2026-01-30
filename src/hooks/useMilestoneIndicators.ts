import { useQuery } from "@tanstack/react-query";
import { isPast, isToday, addDays, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Milestone {
  id: string;
  deal_id: string;
  due_date: string | null;
  completed_at: string | null;
}

interface MilestoneIndicator {
  overdueCount: number;
  upcomingCount: number;
  hasUrgent: boolean;
}

export function useMilestoneIndicators(dealIds: string[]) {
  return useQuery({
    queryKey: ["milestone-indicators", dealIds],
    queryFn: async () => {
      if (dealIds.length === 0) return {};

      const { data, error } = await supabase
        .from("deal_milestones")
        .select("id, deal_id, due_date, completed_at")
        .in("deal_id", dealIds)
        .is("completed_at", null);

      if (error) throw error;

      const indicators: Record<string, MilestoneIndicator> = {};

      // Initialize all deals with zero counts
      dealIds.forEach((id) => {
        indicators[id] = { overdueCount: 0, upcomingCount: 0, hasUrgent: false };
      });

      // Process milestones
      (data as Milestone[]).forEach((milestone) => {
        if (!milestone.due_date) return;

        const dueDate = new Date(milestone.due_date);
        const indicator = indicators[milestone.deal_id];

        if (isPast(dueDate) && !isToday(dueDate)) {
          indicator.overdueCount++;
          indicator.hasUrgent = true;
        } else if (isToday(dueDate) || isBefore(dueDate, addDays(new Date(), 3))) {
          indicator.upcomingCount++;
          if (isToday(dueDate)) {
            indicator.hasUrgent = true;
          }
        }
      });

      return indicators;
    },
    enabled: dealIds.length > 0,
  });
}
