import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, MessageSquare, Sparkles, Home, DollarSign, Users, ClipboardList, LucideIcon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import type { Database } from "@/integrations/supabase/types";
import {
  MortgageCalculator,
  AffordabilityCalculator,
  ClosingCostsCalculator,
  RentVsBuyCalculator,
  HomeBuyingChecklist,
  HomeSellingChecklist,
  SellerNetSheet,
  AgentCommissionCalculator,
} from "@/components/ai-chat";

type AppRole = Database["public"]["Enums"]["app_role"];

type TabConfig = {
  value: string;
  label: string;
  icon: LucideIcon;
  allowedRoles: AppRole[];
};

const ALL_TABS: TabConfig[] = [
  { 
    value: "buyers", 
    label: "Buyers", 
    icon: Home, 
    allowedRoles: ["super_admin", "admin", "agent", "buyer"] 
  },
  { 
    value: "sellers", 
    label: "Sellers", 
    icon: DollarSign, 
    allowedRoles: ["super_admin", "admin", "agent", "seller"] 
  },
  { 
    value: "agents", 
    label: "Agents", 
    icon: Users, 
    allowedRoles: ["super_admin", "admin", "agent"] 
  },
  { 
    value: "planning", 
    label: "Checklists", 
    icon: ClipboardList, 
    allowedRoles: ["super_admin", "admin", "agent", "buyer", "seller"] 
  },
];

const GRID_COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2", 
  3: "grid-cols-3",
  4: "grid-cols-4"
};

export default function Tools() {
  const { activeRole, isAdmin } = useRole();

  // Compute visible tabs based on role
  const visibleTabs = useMemo(() => {
    if (isAdmin) return ALL_TABS;
    return ALL_TABS.filter(tab => tab.allowedRoles.includes(activeRole));
  }, [activeRole, isAdmin]);

  const defaultTab = visibleTabs[0]?.value || "buyers";
  const gridColsClass = GRID_COLS_CLASS[visibleTabs.length] || "grid-cols-4";

  // Compute checklist visibility
  const checklistConfig = useMemo(() => {
    const canSeeBuying = isAdmin || ["agent", "buyer"].includes(activeRole);
    const canSeeSelling = isAdmin || ["agent", "seller"].includes(activeRole);
    
    return {
      showBuying: canSeeBuying,
      showSelling: canSeeSelling,
      defaultChecklist: canSeeBuying ? "buying" : "selling",
      // For grid columns in checklist sub-tabs
      checklistCount: (canSeeBuying ? 1 : 0) + (canSeeSelling ? 1 : 0)
    };
  }, [activeRole, isAdmin]);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Tools</h1>
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                FREE
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            Financial calculators, checklists, and guides for buyers, sellers, and agents
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className={`grid w-full ${gridColsClass} h-auto gap-1 p-1`}>
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm py-2 gap-1.5">
                <tab.icon className="h-3.5 w-3.5 hidden sm:inline" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Buyers Tab */}
          <TabsContent value="buyers" className="mt-4">
            <Tabs defaultValue="mortgage" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto gap-1 p-1 bg-muted/50">
                <TabsTrigger value="mortgage" className="text-xs py-1.5">
                  Mortgage
                </TabsTrigger>
                <TabsTrigger value="affordability" className="text-xs py-1.5">
                  Affordability
                </TabsTrigger>
                <TabsTrigger value="closing" className="text-xs py-1.5">
                  Closing Costs
                </TabsTrigger>
                <TabsTrigger value="rent-vs-buy" className="text-xs py-1.5">
                  Rent vs Buy
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="mortgage" className="m-0">
                  <MortgageCalculator propertyPrice={450000} />
                </TabsContent>
                <TabsContent value="affordability" className="m-0">
                  <AffordabilityCalculator />
                </TabsContent>
                <TabsContent value="closing" className="m-0">
                  <ClosingCostsCalculator initialView="buyer" />
                </TabsContent>
                <TabsContent value="rent-vs-buy" className="m-0">
                  <RentVsBuyCalculator />
                </TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="mt-4">
            <Tabs defaultValue="net-sheet" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1 bg-muted/50">
                <TabsTrigger value="net-sheet" className="text-xs py-1.5">
                  Net Sheet
                </TabsTrigger>
                <TabsTrigger value="closing" className="text-xs py-1.5">
                  Closing Costs
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <TabsContent value="net-sheet" className="m-0">
                  <SellerNetSheet />
                </TabsContent>
                <TabsContent value="closing" className="m-0">
                  <ClosingCostsCalculator initialView="seller" />
                </TabsContent>
              </div>
            </Tabs>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4">
            <AgentCommissionCalculator />
          </TabsContent>

          {/* Planning/Checklists Tab */}
          <TabsContent value="planning" className="mt-4">
            {checklistConfig.showBuying && checklistConfig.showSelling ? (
              // Show both checklists with sub-tabs
              <Tabs defaultValue={checklistConfig.defaultChecklist} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1 bg-muted/50">
                  <TabsTrigger value="buying" className="text-xs py-1.5">
                    Buying Checklist
                  </TabsTrigger>
                  <TabsTrigger value="selling" className="text-xs py-1.5">
                    Selling Checklist
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <TabsContent value="buying" className="m-0">
                    <HomeBuyingChecklist />
                  </TabsContent>
                  <TabsContent value="selling" className="m-0">
                    <HomeSellingChecklist />
                  </TabsContent>
                </div>
              </Tabs>
            ) : checklistConfig.showBuying ? (
              // Show only buying checklist directly
              <HomeBuyingChecklist />
            ) : (
              // Show only selling checklist directly
              <HomeSellingChecklist />
            )}
          </TabsContent>
        </Tabs>

        {/* AI Chat CTA */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Need personalized analysis?</p>
                  <p className="text-sm text-muted-foreground">
                    Chat with our AI assistant for tailored recommendations based on your specific situation.
                  </p>
                </div>
              </div>
              <Link to="/chat">
                <Button className="gap-2 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                  Open AI Chat
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
