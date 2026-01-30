import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { CreateDealDialog } from "@/components/deals/CreateDealDialog";
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
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const queryClient = useQueryClient();

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
          contacts(first_name, last_name),
          properties(address)
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

  const getDealsByStage = (stageId: string) => deals.filter((d) => d.stage === stageId);

  const totalValue = deals.reduce((acc, deal) => acc + (deal.estimated_value || 0), 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {type === "sellers" ? "Seller" : "Buyer"} Pipeline
            </h1>
            <p className="text-muted-foreground">
              Track and manage your {type === "sellers" ? "listing" : "buyer"} deals
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        </div>

        <CreateDealDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dealType={dealType}
        />

        <DealDetailSheet
          dealId={selectedDealId}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          stages={stages}
        />

        {/* Pipeline Tabs */}
        <Tabs defaultValue={type} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="buyers" asChild>
                <Link to="/pipeline/buyers">Buyers</Link>
              </TabsTrigger>
              <TabsTrigger value="sellers" asChild>
                <Link to="/pipeline/sellers">Sellers</Link>
              </TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground">
              Pipeline Value:{" "}
              <span className="font-semibold text-foreground">
                ${totalValue.toLocaleString()}
              </span>
            </div>
          </div>

          <TabsContent value={type} className="flex-1 mt-6">
            {/* Kanban Board */}
            <div className="flex gap-4 h-full overflow-x-auto pb-4">
              {stages.map((stage) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  deals={getDealsByStage(stage.id)}
                  allStages={stages}
                  isLoading={isLoading}
                  movingDealId={movingDealId}
                  onMoveToStage={handleMoveToStage}
                  onOpenDetail={handleOpenDetail}
                  milestoneIndicators={milestoneIndicators}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
