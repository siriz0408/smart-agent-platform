import { useState, useCallback, useMemo } from "react";
import {
  differenceInDays,
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { useDeals, useDealStats, getStagesForType } from "@/hooks/useDeals";
import { useMilestoneIndicators } from "@/hooks/useMilestoneIndicators";
import type { DealWithRelations, StageDefinition } from "@/hooks/useDeals";

// usePipelineMetrics - Aggregated pipeline metrics with stage breakdowns

export interface StageMetric {
  stage: StageDefinition;
  count: number;
  totalValue: number;
  avgDaysInStage: number;
  percentage: number;
}

export interface PipelineMetrics {
  totalDeals: number;
  totalValue: number;
  stalledCount: number;
  closedCount: number;
  winRate: number;
  stageMetrics: StageMetric[];
}

export function usePipelineMetrics(dealType: "buyer" | "seller"): {
  data: PipelineMetrics;
  isLoading: boolean;
} {
  const { data: deals = [], isLoading } = useDeals(dealType);
  const { data: stats } = useDealStats(dealType);
  const stages = getStagesForType(dealType);

  const stageMetrics: StageMetric[] = useMemo(() => {
    return stages.map((stage) => {
      const dealsInStage = deals.filter((d) => d.stage === stage.id);
      const totalValue = dealsInStage.reduce(
        (acc, d) => acc + (d.estimated_value ?? 0),
        0
      );

      // Calculate average time in stage using updated_at as proxy
      let avgDaysInStage = 0;
      if (dealsInStage.length > 0) {
        const now = new Date();
        const totalDays = dealsInStage.reduce((acc, deal) => {
          const updatedAt = new Date(deal.updated_at);
          return acc + Math.max(0, differenceInDays(now, updatedAt));
        }, 0);
        avgDaysInStage = Math.round(totalDays / dealsInStage.length);
      }

      const percentage =
        deals.length > 0 ? (dealsInStage.length / deals.length) * 100 : 0;

      return {
        stage,
        count: dealsInStage.length,
        totalValue,
        avgDaysInStage,
        percentage,
      };
    });
  }, [deals, stages]);

  return {
    data: {
      totalDeals: stats.totalDeals,
      totalValue: stats.totalValue,
      stalledCount: stats.stalledCount,
      closedCount: stats.closedCount,
      winRate: stats.winRate,
      stageMetrics,
    },
    isLoading,
  };
}

// usePipelineFilters - Filter state management for pipeline views

export type PipelineFilterId = "stalled" | "overdue" | "upcoming" | "active";

export interface PipelineFilterResult {
  activeFilters: Set<PipelineFilterId>;
  toggleFilter: (filterId: PipelineFilterId) => void;
  clearFilters: () => void;
  filteredDeals: DealWithRelations[];
  getDealsByStage: (stageId: string) => DealWithRelations[];
  totalFilteredValue: number;
}

export function usePipelineFilters(
  dealType: "buyer" | "seller"
): PipelineFilterResult {
  const [activeFilters, setActiveFilters] = useState<Set<PipelineFilterId>>(
    new Set()
  );
  const { data: deals = [] } = useDeals(dealType);

  // Fetch milestone indicators for filtering
  const dealIds = useMemo(() => deals.map((d) => d.id), [deals]);
  const { data: milestoneIndicators = {} } = useMilestoneIndicators(dealIds);

  const toggleFilter = useCallback((filterId: PipelineFilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters(new Set());
  }, []);

  const filteredDeals = useMemo(() => {
    if (activeFilters.size === 0) return deals;

    return deals.filter((deal) => {
      const hasOverdue = milestoneIndicators[deal.id]?.overdueCount > 0;
      const hasUpcoming = milestoneIndicators[deal.id]?.upcomingCount > 0;
      const isStalled = deal.is_stalled === true;

      if (activeFilters.has("stalled") && !isStalled) return false;
      if (activeFilters.has("overdue") && !hasOverdue) return false;
      if (activeFilters.has("upcoming") && !hasUpcoming) return false;
      if (activeFilters.has("active") && (isStalled || hasOverdue))
        return false;

      return true;
    });
  }, [deals, activeFilters, milestoneIndicators]);

  const getDealsByStage = useCallback(
    (stageId: string) => filteredDeals.filter((d) => d.stage === stageId),
    [filteredDeals]
  );

  const totalFilteredValue = useMemo(
    () =>
      filteredDeals.reduce((acc, deal) => acc + (deal.estimated_value || 0), 0),
    [filteredDeals]
  );

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    filteredDeals,
    getDealsByStage,
    totalFilteredValue,
  };
}

// useRevenueForecast - Commission forecast derived from shared useDeals cache

/** Stage-based probability weights for pipeline forecasting (PRD Section 8). */
export const STAGE_WEIGHTS: Record<string, { probability: number; label: string }> = {
  // Buyer stages (PRD 8.1)
  lead: { probability: 0.1, label: "10%" },
  active_buyer: { probability: 0.2, label: "20%" },
  property_search: { probability: 0.3, label: "30%" },
  making_offers: { probability: 0.5, label: "50%" },
  // Seller stages (PRD 8.2)
  prospect: { probability: 0.1, label: "10%" },
  pre_listing: { probability: 0.2, label: "20%" },
  active_listing: { probability: 0.4, label: "40%" },
  offer_review: { probability: 0.6, label: "60%" },
  // Shared stages
  under_contract: { probability: 0.8, label: "80%" },
  closing: { probability: 0.9, label: "90%" },
  closing_prep: { probability: 0.9, label: "90%" },
  closed_won: { probability: 1.0, label: "100%" },
  closed: { probability: 1.0, label: "100%" },
  closed_lost: { probability: 0.0, label: "0%" },
};

export interface MonthlyForecast {
  month: string; // "YYYY-MM"
  label: string; // "Feb 2026"
  dealCount: number;
  totalCommission: number;
  weightedCommission: number;
}

export interface RevenueForecastData {
  activeDeals: DealWithRelations[];
  closedDealsYTD: DealWithRelations[];
  monthlyForecasts: MonthlyForecast[];
  unscheduledDeals: DealWithRelations[];
  unscheduledCommission: number;
  unscheduledWeighted: number;
  totalPipelineCommission: number;
  totalWeightedCommission: number;
  ytdEarnings: number;
}

function calcCommission(deal: DealWithRelations): number {
  if (!deal.estimated_value) return 0;
  const rate = deal.commission_rate || 3; // Default 3% if not set
  return (deal.estimated_value * rate) / 100;
}

function calcWeightedCommission(deal: DealWithRelations): number {
  const commission = calcCommission(deal);
  const weight = STAGE_WEIGHTS[deal.stage || "lead"]?.probability || 0.1;
  return commission * weight;
}

export function useRevenueForecast(dealType: "buyer" | "seller"): {
  data: RevenueForecastData;
  isLoading: boolean;
} {
  const { data: allDeals = [], isLoading } = useDeals(dealType);

  return useMemo(() => {
    const activeDeals = allDeals.filter((d) => d.stage !== "closed");

    // Filter closed deals in current year using actual_close_date or updated_at
    const yearStart = format(
      startOfMonth(new Date(new Date().getFullYear(), 0, 1)),
      "yyyy-MM-dd"
    );
    const closedDealsYTD = allDeals.filter((d) => {
      if (d.stage !== "closed") return false;
      const closeDate = d.actual_close_date || d.updated_at;
      return closeDate >= yearStart;
    });

    // Generate monthly forecast for the next 6 months
    const now = new Date();
    const monthlyForecasts: MonthlyForecast[] = [];

    for (let i = 0; i < 6; i++) {
      const monthStart = startOfMonth(addMonths(now, i));
      const monthEnd = endOfMonth(addMonths(now, i));
      const monthKey = format(monthStart, "yyyy-MM");
      const monthLabel = format(monthStart, "MMM yyyy");

      const dealsInMonth = activeDeals.filter((deal) => {
        if (!deal.expected_close_date) return false;
        try {
          const closeDate = parseISO(deal.expected_close_date);
          return isWithinInterval(closeDate, {
            start: monthStart,
            end: monthEnd,
          });
        } catch {
          return false;
        }
      });

      monthlyForecasts.push({
        month: monthKey,
        label: monthLabel,
        dealCount: dealsInMonth.length,
        totalCommission: dealsInMonth.reduce(
          (sum, deal) => sum + calcCommission(deal),
          0
        ),
        weightedCommission: dealsInMonth.reduce(
          (sum, deal) => sum + calcWeightedCommission(deal),
          0
        ),
      });
    }

    const unscheduledDeals = activeDeals.filter((d) => !d.expected_close_date);
    const unscheduledCommission = unscheduledDeals.reduce(
      (sum, deal) => sum + calcCommission(deal),
      0
    );
    const unscheduledWeighted = unscheduledDeals.reduce(
      (sum, deal) => sum + calcWeightedCommission(deal),
      0
    );

    const totalPipelineCommission = activeDeals.reduce(
      (sum, deal) => sum + calcCommission(deal),
      0
    );
    const totalWeightedCommission = activeDeals.reduce(
      (sum, deal) => sum + calcWeightedCommission(deal),
      0
    );
    const ytdEarnings = closedDealsYTD.reduce(
      (sum, deal) => sum + calcCommission(deal),
      0
    );

    return {
      data: {
        activeDeals,
        closedDealsYTD,
        monthlyForecasts,
        unscheduledDeals,
        unscheduledCommission,
        unscheduledWeighted,
        totalPipelineCommission,
        totalWeightedCommission,
        ytdEarnings,
      },
      isLoading,
    };
  }, [allDeals, isLoading]);
}
