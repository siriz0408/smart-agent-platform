import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, LayoutGrid, List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { CreateDealDialog } from "@/components/deals/CreateDealDialog";
import { EditDealDialog } from "@/components/deals/EditDealDialog";
import { DealDetailSheet } from "@/components/deals/DealDetailSheet";
import { StageColumn } from "@/components/pipeline/StageColumn";
import { useMilestoneIndicators } from "@/hooks/useMilestoneIndicators";
import { toast } from "@/hooks/use-toast";

interface DealWithRelations {
  id: string;
  deal_type: string;
  stage: string | null;
  estimated_value: number | null;
  expected_close_date: string | null;
  contacts: { first_name: string; last_name: string } | null;
  properties: { address: string } | null;
}

const buyerStages = [
  { id: "lead", label: "New Lead", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { id: "showing", label: "Showing", color: "bg-purple-500" },
  { id: "offer", label: "Offer Made", color: "bg-orange-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-green-500" },
  { id: "closed", label: "Closed", color: "bg-emerald-600" },
];

const sellerStages = [
  { id: "lead", label: "Prospect", color: "bg-blue-500" },
  { id: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { id: "listing", label: "Listing Signed", color: "bg-purple-500" },
  { id: "active", label: "Active", color: "bg-orange-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-green-500" },
  { id: "closed", label: "Closed", color: "bg-emerald-600" },
];

// Standard milestones to create when moving to Under Contract
const standardMilestones = [
  { title: "Earnest Money Deposit", daysFromNow: 3 },
  { title: "Home Inspection", daysFromNow: 7 },
  { title: "Appraisal", daysFromNow: 14 },
  { title: "Closing Disclosure", daysFromClose: 3 },
  { title: "Final Walkthrough", daysFromClose: 1 },
  { title: "Closing Day", daysFromClose: 0 },
];

export default function Pipeline() {
  const { type = "buyers" } = useParams<{ type: string }>();
  const dealType = type === "sellers" ? "seller" : "buyer";
  const stages = type === "sellers" ? sellerStages : buyerStages;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealWithRelations | null>(null);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [viewMode, setViewMode] = useState<"auto" | "list" | "kanban">("auto");
  const queryClient = useQueryClient();

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

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", dealType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          id,
          deal_type,
          stage,
          estimated_value,
          expected_close_date,
          contacts!contact_id(first_name, last_name),
          properties!property_id(address)
        `)
        .eq("deal_type", dealType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DealWithRelations[];
    },
  });

  // Fetch milestone indicators for all deals
  const dealIds = deals.map((d) => d.id);
  const { data: milestoneIndicators = {} } = useMilestoneIndicators(dealIds);

  const createMilestonesMutation = useMutation({
    mutationFn: async ({ dealId, expectedCloseDate }: { dealId: string; expectedCloseDate: string | null }) => {
      const now = new Date();
      const closeDate = expectedCloseDate ? new Date(expectedCloseDate) : addDays(now, 30);

      const milestones = standardMilestones.map((m) => {
        let dueDate: Date;
        if (m.daysFromNow !== undefined) {
          dueDate = addDays(now, m.daysFromNow);
        } else if (m.daysFromClose !== undefined) {
          dueDate = addDays(closeDate, -m.daysFromClose);
        } else {
          dueDate = closeDate;
        }

        return {
          deal_id: dealId,
          title: m.title,
          due_date: format(dueDate, "yyyy-MM-dd"),
        };
      });

      const { error } = await supabase.from("deal_milestones").insert(milestones);
      if (error) throw error;
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, newStage, expectedCloseDate }: { dealId: string; newStage: string; expectedCloseDate: string | null }) => {
      setMovingDealId(dealId);
      const { error } = await supabase
        .from("deals")
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq("id", dealId);
      if (error) throw error;

      // If moving to under_contract, auto-create milestones
      if (newStage === "under_contract") {
        // Check if milestones already exist
        const { data: existingMilestones } = await supabase
          .from("deal_milestones")
          .select("id")
          .eq("deal_id", dealId)
          .limit(1);

        if (!existingMilestones || existingMilestones.length === 0) {
          await createMilestonesMutation.mutateAsync({ dealId, expectedCloseDate });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", dealType] });
      queryClient.invalidateQueries({ queryKey: ["milestone-indicators"] });
      toast({
        title: "Deal moved",
        description: "Stage updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to move deal",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setMovingDealId(null);
    },
  });

  const handleMoveToStage = (dealId: string, newStage: string) => {
    const deal = deals.find((d) => d.id === dealId);
    updateStageMutation.mutate({ 
      dealId, 
      newStage, 
      expectedCloseDate: deal?.expected_close_date || null 
    });
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
      toast({
        title: "Error",
        description: "Failed to load deal details.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingDeal(data as any);
    setEditDialogOpen(true);
  };

  const getDealsByStage = (stageId: string) => deals.filter((d) => d.stage === stageId);

  const totalValue = deals.reduce((acc, deal) => acc + (deal.estimated_value || 0), 0);

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
            <div className="hidden sm:flex border rounded-lg p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode(viewMode === "list" ? "auto" : "list")}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode(viewMode === "kanban" ? "auto" : "kanban")}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="h-9">
              <Plus className="h-4 w-4 mr-2" />
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
                ${totalValue.toLocaleString()}
              </span>
            </div>
          </div>

          <TabsContent value={type} className="flex-1 mt-4 md:mt-6">
            {/* Pipeline Board - Responsive layout */}
            {useMobileLayout ? (
              // Mobile: Accordion/List view
              <div className="space-y-2">
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
                    defaultOpen={index === 0} // First stage open by default
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
