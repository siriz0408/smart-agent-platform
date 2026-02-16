import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, LayoutGrid, List, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { CreateDealDialog } from "@/components/deals/CreateDealDialog";
import { EditDealDialog } from "@/components/deals/EditDealDialog";
import { DealDetailSheet } from "@/components/deals/DealDetailSheet";
import { DealHealthAudit } from "@/components/deals/DealHealthAudit";
import { StageColumn } from "@/components/pipeline/StageColumn";
import { PipelineAnalytics } from "@/components/pipeline/PipelineAnalytics";
import { RevenueForecast } from "@/components/pipeline/RevenueForecast";
import { useDeals, useUpdateDealStage, getStagesForType } from "@/hooks/useDeals";
import { usePipelineFilters } from "@/hooks/usePipeline";
import { useMilestoneIndicators } from "@/hooks/useMilestoneIndicators";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import type { DealWithRelations } from "@/hooks/useDeals";

export default function Pipeline() {
  const { type = "buyers" } = useParams<{ type: string }>();
  const dealType = type === "sellers" ? "seller" : "buyer";
  const stages = getStagesForType(dealType);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Tables<"deals"> | null>(null);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [viewMode, setViewMode] = useState<"auto" | "list" | "kanban">("auto");
  const [recentlyMovedDealId, setRecentlyMovedDealId] = useState<string | null>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Determine if we should use mobile accordion layout
  const useMobileLayout = viewMode === "list" || (viewMode === "auto" && isMobileView);

  // Data hooks - single source of truth
  const { data: deals = [], isLoading } = useDeals(dealType);

  // Pipeline filters (includes milestone indicators internally)
  const {
    activeFilters,
    toggleFilter,
    clearFilters,
    filteredDeals,
    getDealsByStage,
    totalFilteredValue,
  } = usePipelineFilters(dealType);

  // Milestone indicators for visual badges on stage columns
  const dealIds = deals.map((d) => d.id);
  const { data: milestoneIndicators = {} } = useMilestoneIndicators(dealIds);

  // Stage mutation via hook
  const updateStageMutation = useUpdateDealStage(dealType);

  const handleMoveToStage = (dealId: string, newStage: string) => {
    setMovingDealId(dealId);
    const deal = deals.find((d) => d.id === dealId);
    updateStageMutation.mutate(
      {
        dealId,
        newStage,
        expectedCloseDate: deal?.expected_close_date || null,
        previousStage: deal?.stage || null, // Pass previous stage for notification (TRX-011)
      },
      {
        onSuccess: () => {
          setRecentlyMovedDealId(dealId);
          setTimeout(() => setRecentlyMovedDealId(null), 2000);
        },
        onSettled: () => {
          setMovingDealId(null);
        },
      }
    );
  };

  const handleOpenDetail = (dealId: string) => {
    setSelectedDealId(dealId);
    setDetailSheetOpen(true);
  };

  const handleEdit = async (deal: DealWithRelations) => {
    // Fetch full deal data with all fields
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal.id)
      .single();

    if (error) {
      toast.error("Error", { description: "Failed to load deal details." });
      return;
    }

    setEditingDeal(data);
    setEditDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">
              {type === "sellers" ? "Seller" : "Buyer"} Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage your {type === "sellers" ? "listing" : "buyer"} deals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle - only show on larger screens */}
            <div className="hidden sm:flex border rounded-lg p-0.5" role="group" aria-label="View mode toggle">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode(viewMode === "list" ? "auto" : "list")}
                title="List view"
                aria-label="Switch to list view"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode(viewMode === "kanban" ? "auto" : "kanban")}
                title="Kanban view"
                aria-label="Switch to kanban view"
                aria-pressed={viewMode === "kanban"}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="h-9"
              aria-label="Add new deal"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Add Deal</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <CreateDealDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dealType={dealType}
        />

        <EditDealDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          deal={editingDeal}
        />

        <DealDetailSheet
          dealId={selectedDealId}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          stages={stages}
        />

        {/* Pipeline Analytics */}
        <PipelineAnalytics dealType={dealType} stages={stages} />

        {/* Revenue Forecast */}
        <RevenueForecast dealType={dealType} />

        {/* Deal Health Audit */}
        <DealHealthAudit dealType={dealType} />

        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
          <Badge
            variant={activeFilters.has("stalled") ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={() => toggleFilter("stalled")}
          >
            Stalled
          </Badge>
          <Badge
            variant={activeFilters.has("overdue") ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={() => toggleFilter("overdue")}
          >
            Overdue Milestones
          </Badge>
          <Badge
            variant={activeFilters.has("upcoming") ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={() => toggleFilter("upcoming")}
          >
            Due Soon
          </Badge>
          <Badge
            variant={activeFilters.has("active") ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={() => toggleFilter("active")}
          >
            Active
          </Badge>
          {activeFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Pipeline Tabs */}
        <Tabs defaultValue={type} className="flex-1 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="buyers" asChild className="flex-1 sm:flex-initial">
                <Link to="/pipeline/buyers">Buyers</Link>
              </TabsTrigger>
              <TabsTrigger value="sellers" asChild className="flex-1 sm:flex-initial">
                <Link to="/pipeline/sellers">Sellers</Link>
              </TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground text-center sm:text-right">
              Pipeline Value:{" "}
              <span className="font-semibold text-foreground">
                ${totalFilteredValue.toLocaleString()}
              </span>
            </div>
          </div>

          <TabsContent value={type} className="flex-1 mt-4 md:mt-6">
            {/* Pipeline Board - Responsive layout */}
            {useMobileLayout ? (
              // Mobile: Accordion/List view
              <div className="space-y-2 pb-20 md:pb-0">
                {stages.map((stage, index) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    deals={getDealsByStage(stage.id)}
                    allStages={stages}
                    isLoading={isLoading}
                    movingDealId={movingDealId}
                    onMoveToStage={handleMoveToStage}
                    onOpenDetail={handleOpenDetail}
                    onEdit={handleEdit}
                    milestoneIndicators={milestoneIndicators}
                    isMobileView={true}
                    defaultOpen={index === 0}
                    recentlyMovedDealId={recentlyMovedDealId}
                  />
                ))}
              </div>
            ) : (
              // Desktop: Kanban Board
              <div className="flex gap-4 h-full overflow-x-auto pb-4">
                {stages.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    deals={getDealsByStage(stage.id)}
                    allStages={stages}
                    isLoading={isLoading}
                    movingDealId={movingDealId}
                    onEdit={handleEdit}
                    onMoveToStage={handleMoveToStage}
                    onOpenDetail={handleOpenDetail}
                    milestoneIndicators={milestoneIndicators}
                    isMobileView={false}
                    recentlyMovedDealId={recentlyMovedDealId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
