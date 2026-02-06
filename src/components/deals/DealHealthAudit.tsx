import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, isPast, isToday, addDays } from "date-fns";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileX, 
  UserX, 
  MapPinOff, 
  DollarSign, 
  Calendar,
  ChevronDown,
  RefreshCw,
  TrendingDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealHealthIssue {
  dealId: string;
  dealType: string;
  stage: string | null;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  recommendation: string;
  metadata?: Record<string, unknown>;
}

interface DealHealthSummary {
  totalActiveDeals: number;
  healthyDeals: number;
  issuesFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

interface DealHealthAuditProps {
  dealType?: "buyer" | "seller" | "all";
}

export function DealHealthAudit({ dealType = "all" }: DealHealthAuditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const { data: auditResult, isLoading, refetch } = useQuery({
    queryKey: ["deal-health-audit", dealType],
    queryFn: async () => {
      // Fetch all active deals (non-closed)
      const query = supabase
        .from("deals")
        .select(`
          id,
          deal_type,
          stage,
          estimated_value,
          expected_close_date,
          created_at,
          updated_at,
          contact_id,
          property_id,
          contacts:contact_id(id, first_name, last_name),
          properties:property_id(id, address)
        `)
        .not("stage", "eq", "closed")
        .not("stage", "eq", "lost");

      if (dealType !== "all") {
        query.eq("deal_type", dealType);
      }

      const { data: deals, error: dealsError } = await query.order("updated_at", { ascending: false });

      if (dealsError) throw dealsError;
      if (!deals || deals.length === 0) {
        return {
          summary: {
            totalActiveDeals: 0,
            healthyDeals: 0,
            issuesFound: 0,
            criticalIssues: 0,
            highIssues: 0,
            mediumIssues: 0,
            lowIssues: 0,
          },
          issues: [],
        };
      }

      const dealIds = deals.map((d) => d.id);
      const issues: DealHealthIssue[] = [];

      // Check stalled status
      const { data: stalledData } = await supabase.rpc("get_stalled_deals", {
        p_deal_ids: dealIds,
      });
      const stalledMap = new Map<string, boolean>();
      if (stalledData) {
        stalledData.forEach((item: { deal_id: string; is_stalled: boolean }) => {
          stalledMap.set(item.deal_id, item.is_stalled);
        });
      }

      // Fetch milestones for all deals
      const { data: milestones } = await supabase
        .from("deal_milestones")
        .select("id, deal_id, due_date, completed_at")
        .in("deal_id", dealIds);

      const milestonesByDeal = new Map<string, typeof milestones>();
      if (milestones) {
        milestones.forEach((m) => {
          if (!milestonesByDeal.has(m.deal_id)) {
            milestonesByDeal.set(m.deal_id, []);
          }
          milestonesByDeal.get(m.deal_id)!.push(m);
        });
      }

      // Audit each deal
      deals.forEach((deal) => {
        const dealMilestones = milestonesByDeal.get(deal.id) || [];
        const isStalled = stalledMap.get(deal.id) || false;
        const daysSinceUpdate = differenceInDays(new Date(), new Date(deal.updated_at));
        const daysSinceCreated = differenceInDays(new Date(), new Date(deal.created_at));

        // Critical: Stalled deals
        if (isStalled) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "stalled",
            severity: "critical",
            message: `Deal has been stalled for ${daysSinceUpdate} days`,
            recommendation: "Review deal status and take action to move forward",
            metadata: { daysSinceUpdate },
          });
        }

        // Critical: Under contract deals without milestones
        if (deal.stage === "under_contract" && dealMilestones.length === 0) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "missing_milestones",
            severity: "critical",
            message: "Deal is under contract but has no milestones",
            recommendation: "Create standard milestones for this deal",
            metadata: {},
          });
        }

        // High: Overdue milestones
        const overdueMilestones = dealMilestones.filter(
          (m) => m.due_date && !m.completed_at && isPast(new Date(m.due_date)) && !isToday(new Date(m.due_date))
        );
        if (overdueMilestones.length > 0) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "overdue_milestones",
            severity: "high",
            message: `${overdueMilestones.length} overdue milestone${overdueMilestones.length > 1 ? "s" : ""}`,
            recommendation: "Review and complete overdue milestones",
            metadata: { count: overdueMilestones.length },
          });
        }

        // High: Missing expected close date for under contract deals
        if (deal.stage === "under_contract" && !deal.expected_close_date) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "missing_close_date",
            severity: "high",
            message: "Deal is under contract but missing expected close date",
            recommendation: "Add expected close date to track timeline",
            metadata: {},
          });
        }

        // Medium: Missing contact
        if (!deal.contact_id && !deal.contacts) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "missing_contact",
            severity: "medium",
            message: "Deal has no associated contact",
            recommendation: "Link a contact to this deal",
            metadata: {},
          });
        }

        // Medium: Missing property
        if (!deal.property_id && !deal.properties) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "missing_property",
            severity: "medium",
            message: "Deal has no associated property",
            recommendation: "Link a property to this deal",
            metadata: {},
          });
        }

        // Medium: Missing estimated value
        if (!deal.estimated_value || deal.estimated_value === 0) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "missing_value",
            severity: "medium",
            message: "Deal has no estimated value",
            recommendation: "Add estimated value to track pipeline value",
            metadata: {},
          });
        }

        // Medium: Deals stuck in early stages too long
        if (
          (deal.stage === "lead" || deal.stage === "contacted") &&
          daysSinceCreated > 30
        ) {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "stuck_early_stage",
            severity: "medium",
            message: `Deal has been in ${deal.stage} stage for ${daysSinceCreated} days`,
            recommendation: "Review deal status and consider moving forward or closing",
            metadata: { daysSinceCreated },
          });
        }

        // Low: Upcoming milestones due soon
        const upcomingMilestones = dealMilestones.filter(
          (m) =>
            m.due_date &&
            !m.completed_at &&
            !isPast(new Date(m.due_date)) &&
            isPast(addDays(new Date(m.due_date), -3))
        );
        if (upcomingMilestones.length > 0 && deal.stage === "under_contract") {
          issues.push({
            dealId: deal.id,
            dealType: deal.deal_type,
            stage: deal.stage,
            issueType: "upcoming_milestones",
            severity: "low",
            message: `${upcomingMilestones.length} milestone${upcomingMilestones.length > 1 ? "s" : ""} due soon`,
            recommendation: "Prepare for upcoming milestones",
            metadata: { count: upcomingMilestones.length },
          });
        }
      });

      // Calculate summary
      const dealIdsWithIssues = new Set(issues.map((i) => i.dealId));
      const healthyDeals = deals.length - dealIdsWithIssues.size;

      const summary: DealHealthSummary = {
        totalActiveDeals: deals.length,
        healthyDeals,
        issuesFound: issues.length,
        criticalIssues: issues.filter((i) => i.severity === "critical").length,
        highIssues: issues.filter((i) => i.severity === "high").length,
        mediumIssues: issues.filter((i) => i.severity === "medium").length,
        lowIssues: issues.filter((i) => i.severity === "low").length,
      };

      return { summary, issues };
    },
    enabled: isOpen, // Only fetch when expanded
  });

  const toggleIssueExpansion = (dealId: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return AlertCircle;
      case "high":
        return AlertCircle;
      case "medium":
        return Clock;
      case "low":
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case "stalled":
        return TrendingDown;
      case "missing_milestones":
        return FileX;
      case "overdue_milestones":
        return Clock;
      case "missing_close_date":
        return Calendar;
      case "missing_contact":
        return UserX;
      case "missing_property":
        return MapPinOff;
      case "missing_value":
        return DollarSign;
      default:
        return AlertCircle;
    }
  };

  // Group issues by deal
  const issuesByDeal = new Map<string, DealHealthIssue[]>();
  auditResult?.issues.forEach((issue) => {
    if (!issuesByDeal.has(issue.dealId)) {
      issuesByDeal.set(issue.dealId, []);
    }
    issuesByDeal.get(issue.dealId)!.push(issue);
  });

  const healthScore =
    auditResult && auditResult.summary.totalActiveDeals > 0
      ? Math.round(
          (auditResult.summary.healthyDeals / auditResult.summary.totalActiveDeals) * 100
        )
      : 100;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto hover:bg-muted/50 border rounded-lg"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">Deal Health Audit</span>
            {auditResult && auditResult.summary.issuesFound > 0 && (
              <Badge variant="destructive" className="ml-2">
                {auditResult.summary.issuesFound}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : auditResult ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4",
                      healthScore >= 80 ? "text-green-500" : healthScore >= 60 ? "text-yellow-500" : "text-red-500"
                    )}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{healthScore}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {auditResult.summary.healthyDeals} of {auditResult.summary.totalActiveDeals} deals healthy
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {auditResult.summary.criticalIssues}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {auditResult.summary.highIssues}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Should be addressed soon</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditResult.summary.issuesFound}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {issuesByDeal.size} deal{issuesByDeal.size !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Issues List */}
            {auditResult.issues.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Deals Healthy!</h3>
                    <p className="text-sm text-muted-foreground">
                      No issues found in active deals. Great work!
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Issues Found</CardTitle>
                      <CardDescription>
                        Review and address issues to improve deal health
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {Array.from(issuesByDeal.entries()).map(([dealId, dealIssues]) => {
                        const highestSeverity = dealIssues.reduce((prev, current) => {
                          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                          return severityOrder[current.severity] < severityOrder[prev.severity]
                            ? current
                            : prev;
                        }, dealIssues[0]);

                        return (
                          <Collapsible
                            key={dealId}
                            open={expandedIssues.has(dealId)}
                            onOpenChange={() => toggleIssueExpansion(dealId)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between h-auto p-4"
                              >
                                <div className="flex items-center gap-3 flex-1 text-left">
                                  <div
                                    className={cn(
                                      "h-3 w-3 rounded-full",
                                      getSeverityColor(highestSeverity.severity)
                                    )}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">
                                      {dealIssues[0].dealType} Deal - {dealIssues[0].stage || "No Stage"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {dealIssues.length} issue{dealIssues.length > 1 ? "s" : ""}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="ml-auto">
                                    {highestSeverity.severity}
                                  </Badge>
                                </div>
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 ml-2 transition-transform",
                                    expandedIssues.has(dealId) && "rotate-180"
                                  )}
                                />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="space-y-2 pl-7">
                                {dealIssues.map((issue, idx) => {
                                  const Icon = getIssueIcon(issue.issueType);
                                  const SeverityIcon = getSeverityIcon(issue.severity);
                                  return (
                                    <div
                                      key={idx}
                                      className="p-3 border rounded-lg bg-muted/50"
                                    >
                                      <div className="flex items-start gap-2">
                                        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{issue.message}</span>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "text-xs",
                                                issue.severity === "critical" && "border-red-500 text-red-500",
                                                issue.severity === "high" && "border-orange-500 text-orange-500"
                                              )}
                                            >
                                              {issue.severity}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {issue.recommendation}
                                          </p>
                                        </div>
                                        <SeverityIcon
                                          className={cn(
                                            "h-4 w-4",
                                            issue.severity === "critical" && "text-red-500",
                                            issue.severity === "high" && "text-orange-500",
                                            issue.severity === "medium" && "text-yellow-500",
                                            issue.severity === "low" && "text-blue-500"
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
