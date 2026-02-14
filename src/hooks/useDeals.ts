import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// Shared Types

export interface DealWithRelations {
  id: string;
  deal_type: string;
  stage: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  actual_close_date?: string | null;
  commission_rate?: number | null;
  contacts: { first_name: string; last_name: string } | null;
  properties: { address: string } | null;
  is_stalled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface StageDefinition {
  id: string;
  label: string;
  color: string;
}

// Stage Constants (single source of truth)

// PRD Section 8.1 - Buyer Pipeline Stages (8 stages)
export const BUYER_STAGES: StageDefinition[] = [
  { id: "lead", label: "Lead", color: "bg-blue-500" },
  { id: "active_buyer", label: "Active Buyer", color: "bg-cyan-500" },
  { id: "property_search", label: "Property Search", color: "bg-purple-500" },
  { id: "making_offers", label: "Making Offers", color: "bg-yellow-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-orange-500" },
  { id: "closing", label: "Closing", color: "bg-green-500" },
  { id: "closed_won", label: "Closed Won", color: "bg-emerald-600" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-gray-500" },
];

// PRD Section 8.2 - Seller Pipeline Stages (7 stages)
export const SELLER_STAGES: StageDefinition[] = [
  { id: "prospect", label: "Prospect", color: "bg-blue-500" },
  { id: "pre_listing", label: "Pre-Listing", color: "bg-cyan-500" },
  { id: "active_listing", label: "Active Listing", color: "bg-purple-500" },
  { id: "offer_review", label: "Offer Review", color: "bg-yellow-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-orange-500" },
  { id: "closing_prep", label: "Closing Prep", color: "bg-green-500" },
  { id: "closed", label: "Closed", color: "bg-emerald-600" },
];

export function getStagesForType(dealType: "buyer" | "seller"): StageDefinition[] {
  return dealType === "seller" ? SELLER_STAGES : BUYER_STAGES;
}

/** Standard milestones auto-created when a deal moves to Under Contract. */
export const STANDARD_MILESTONES = [
  { title: "Earnest Money Deposit", daysFromNow: 3 },
  { title: "Home Inspection", daysFromNow: 7 },
  { title: "Appraisal", daysFromNow: 14 },
  { title: "Closing Disclosure", daysFromClose: 3 },
  { title: "Final Walkthrough", daysFromClose: 1 },
  { title: "Closing Day", daysFromClose: 0 },
] as const;

// Internal helpers

async function fetchStalledMap(dealIds: string[]): Promise<Map<string, boolean>> {
  const stalledMap = new Map<string, boolean>();
  if (dealIds.length === 0) return stalledMap;

  const { data: stalledData, error } = await supabase.rpc("get_stalled_deals", {
    p_deal_ids: dealIds,
  });

  if (!error && stalledData) {
    (stalledData as { deal_id: string; is_stalled: boolean }[]).forEach((item) => {
      stalledMap.set(item.deal_id, item.is_stalled);
    });
  }
  return stalledMap;
}

async function createStandardMilestones(dealId: string, expectedCloseDate: string | null) {
  const now = new Date();
  const closeDate = expectedCloseDate ? new Date(expectedCloseDate) : addDays(now, 30);

  const milestones = STANDARD_MILESTONES.map((m) => {
    let dueDate: Date;
    if ("daysFromNow" in m) {
      dueDate = addDays(now, m.daysFromNow);
    } else {
      dueDate = addDays(closeDate, -m.daysFromClose);
    }
    return {
      deal_id: dealId,
      title: m.title,
      due_date: format(dueDate, "yyyy-MM-dd"),
    };
  });

  const { error } = await supabase.from("deal_milestones").insert(milestones);
  if (error) throw error;
}

// useDeals - Fetch all deals by type with joins and stalled status

export function useDeals(dealType: "buyer" | "seller") {
  return useQuery({
    queryKey: ["deals", dealType],
    queryFn: async (): Promise<DealWithRelations[]> => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, deal_type, stage, estimated_value, expected_close_date, actual_close_date, commission_rate, created_at, updated_at, contacts!contact_id(first_name, last_name), properties!property_id(address)"
        )
        .eq("deal_type", dealType)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const deals = data as DealWithRelations[];
      const dealIds = deals.map((d) => d.id);
      const stalledMap = await fetchStalledMap(dealIds);

      return deals.map((deal) => ({
        ...deal,
        is_stalled: stalledMap.get(deal.id) || false,
      }));
    },
  });
}

// useDealsByStage - Filter deals by stage (derived, no extra fetch)

export function useDealsByStage(dealType: "buyer" | "seller", stage: string) {
  const query = useDeals(dealType);
  const filtered = (query.data ?? []).filter((d) => d.stage === stage);
  return { ...query, data: filtered };
}

// useDealStats - Aggregate statistics (derived, no extra fetch)

export interface DealStats {
  totalDeals: number;
  totalValue: number;
  countByStage: Record<string, number>;
  valueByStage: Record<string, number>;
  stalledCount: number;
  closedCount: number;
  winRate: number;
}

export function useDealStats(dealType: "buyer" | "seller"): {
  data: DealStats;
  isLoading: boolean;
} {
  const { data: deals = [], isLoading } = useDeals(dealType);

  const countByStage: Record<string, number> = {};
  const valueByStage: Record<string, number> = {};
  let totalValue = 0;
  let stalledCount = 0;
  let closedCount = 0;

  for (const deal of deals) {
    const stage = deal.stage ?? "unknown";
    countByStage[stage] = (countByStage[stage] ?? 0) + 1;
    valueByStage[stage] = (valueByStage[stage] ?? 0) + (deal.estimated_value ?? 0);
    totalValue += deal.estimated_value ?? 0;
    if (deal.is_stalled) stalledCount++;
    if (deal.stage === "closed") closedCount++;
  }

  const totalDeals = deals.length;
  const winRate = totalDeals > 0 ? (closedCount / totalDeals) * 100 : 0;

  return {
    data: {
      totalDeals,
      totalValue,
      countByStage,
      valueByStage,
      stalledCount,
      closedCount,
      winRate,
    },
    isLoading,
  };
}

// useCreateDeal - Mutation to insert a new deal

type CreateDealInput = Omit<
  Tables<"deals">,
  "id" | "created_at" | "updated_at" | "tenant_id"
>;

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (dealData: CreateDealInput) => {
      if (!profile?.tenant_id) throw new Error("Unable to determine tenant.");

      const { error } = await supabase.from("deals").insert({
        ...dealData,
        tenant_id: profile.tenant_id,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const type = variables.deal_type === "seller" ? "seller" : "buyer";
      queryClient.invalidateQueries({ queryKey: ["deals", type] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal created", {
        description: "New " + variables.deal_type + " deal added to pipeline.",
      });
    },
    onError: (error: Error) => {
      toast.error("Error creating deal", { description: error.message });
    },
  });
}

// useUpdateDealStage - Mutation to move a deal between pipeline stages

export function useUpdateDealStage(dealType: "buyer" | "seller") {
  const queryClient = useQueryClient();
  const stages = getStagesForType(dealType);

  return useMutation({
    mutationFn: async ({
      dealId,
      newStage,
      expectedCloseDate,
    }: {
      dealId: string;
      newStage: string;
      expectedCloseDate: string | null;
    }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;

      // Auto-create milestones when moving to under_contract
      if (newStage === "under_contract") {
        const { data: existing } = await supabase
          .from("deal_milestones")
          .select("id")
          .eq("deal_id", dealId)
          .limit(1);

        if (!existing || existing.length === 0) {
          await createStandardMilestones(dealId, expectedCloseDate);
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals", dealType] });
      queryClient.invalidateQueries({ queryKey: ["milestone-indicators"] });
      const label =
        stages.find((s) => s.id === variables.newStage)?.label ??
        variables.newStage;
      toast.success("Deal moved", { description: "Moved to " + label });
    },
    onError: (error: Error) => {
      toast.error("Failed to move deal", { description: error.message });
    },
  });
}
