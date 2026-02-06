import { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Bot,
  User,
  Mail,
  UserPlus,
  FileText,
  Tag,
  Calendar,
  Bell,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckSquare,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useActionQueue, ActionQueueItem } from "@/hooks/useActionQueue";
import { formatDistanceToNow } from "date-fns";

const actionTypeIcons: Record<string, React.ElementType> = {
  create_contact: UserPlus,
  update_contact: User,
  create_deal: FileText,
  move_deal_stage: ArrowRight,
  send_email: Mail,
  add_note: FileText,
  schedule_task: Calendar,
  enroll_drip: Mail,
  notify_user: Bell,
  assign_tags: Tag,
};

const actionTypeLabels: Record<string, string> = {
  create_contact: "Create Contact",
  update_contact: "Update Contact",
  create_deal: "Create Deal",
  move_deal_stage: "Move Deal Stage",
  send_email: "Send Email",
  add_note: "Add Note",
  schedule_task: "Schedule Task",
  enroll_drip: "Enroll in Campaign",
  notify_user: "Send Notification",
  assign_tags: "Assign Tags",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  executing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  executing: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  rejected: XCircle,
  cancelled: XCircle,
};

function ActionCard({
  action,
  selected,
  onSelect,
  onApprove,
  onReject,
  onExecute,
  isApproving,
  isRejecting,
  isExecuting,
}: {
  action: ActionQueueItem;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onExecute: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isExecuting: boolean;
}) {
  const ActionIcon = actionTypeIcons[action.action_type] || FileText;
  const StatusIcon = statusIcons[action.status] || AlertCircle;
  const agentName = action.agent_run?.ai_agents?.name || "Unknown Agent";

  return (
    <Card className={`transition-all ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {action.status === "pending" && (
              <Checkbox
                checked={selected}
                onCheckedChange={onSelect}
                className="mt-1"
              />
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ActionIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {actionTypeLabels[action.action_type] || action.action_type}
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <Bot className="h-3 w-3" />
                {agentName}
                <span className="text-muted-foreground">•</span>
                {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColors[action.status]}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {action.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Action Reason */}
        {action.action_reason && (
          <p className="mb-3 text-sm text-muted-foreground">
            <span className="font-medium">Reason:</span> {action.action_reason}
          </p>
        )}

        {/* Action Parameters Preview */}
        <div className="mb-4 rounded-md bg-muted p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Parameters</p>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(action.action_params, null, 2)}
          </pre>
        </div>

        {/* Error Message */}
        {action.error_message && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <span className="font-medium">Error:</span> {action.error_message}
          </div>
        )}

        {/* Result Preview */}
        {action.result && (
          <div className="mb-4 rounded-md bg-green-50 p-3">
            <p className="mb-1 text-xs font-medium text-green-800">Result</p>
            <pre className="text-xs text-green-700 overflow-x-auto">
              {JSON.stringify(action.result, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {action.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isApproving}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isRejecting}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {action.status === "approved" && (
            <Button
              size="sm"
              onClick={onExecute}
              disabled={isExecuting}
            >
              <Play className="mr-1 h-4 w-4" />
              Execute Now
            </Button>
          )}
          {action.status === "failed" && action.retry_count < 3 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExecute}
              disabled={isExecuting}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActionQueue() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectActionId, setRejectActionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Get filter based on selected tab
  const getStatusFilter = () => {
    switch (selectedTab) {
      case "pending":
        return ["pending"];
      case "approved":
        return ["approved"];
      case "completed":
        return ["completed"];
      case "failed":
        return ["failed", "rejected"];
      default:
        return undefined;
    }
  };

  const {
    actions,
    isLoading,
    refetch,
    pendingCount,
    approvedCount,
    approveAction,
    rejectAction,
    batchApprove,
    executeAction,
    executeApproved,
    isApproving,
    isRejecting,
    isExecuting,
  } = useActionQueue({
    status: getStatusFilter(),
    action_type: filterTypes.length > 0 ? filterTypes : undefined,
  });

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedActions(new Set(actions.filter(a => a.status === "pending").map(a => a.id)));
    } else {
      setSelectedActions(new Set());
    }
  };

  const handleSelectAction = (actionId: string, selected: boolean) => {
    const newSelected = new Set(selectedActions);
    if (selected) {
      newSelected.add(actionId);
    } else {
      newSelected.delete(actionId);
    }
    setSelectedActions(newSelected);
  };

  const handleBatchApprove = () => {
    batchApprove(Array.from(selectedActions));
    setSelectedActions(new Set());
  };

  const handleReject = (actionId: string) => {
    setRejectActionId(actionId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (rejectActionId) {
      rejectAction({ actionId: rejectActionId, reason: rejectReason || undefined });
      setRejectDialogOpen(false);
      setRejectActionId(null);
      setRejectReason("");
    }
  };

  const allActionTypes = Object.keys(actionTypeLabels);

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Action Queue</h1>
            <p className="text-muted-foreground">
              Review and approve actions recommended by AI agents
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            {approvedCount > 0 && (
              <Button 
                size="sm" 
                onClick={() => executeApproved()}
                disabled={isExecuting}
              >
                <Play className="mr-2 h-4 w-4" />
                Execute All Approved ({approvedCount})
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Approval</CardDescription>
              <CardTitle className="text-3xl">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ready to Execute</CardDescription>
              <CardTitle className="text-3xl">{approvedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Today</CardDescription>
              <CardTitle className="text-3xl">
                {actions.filter(a => 
                  a.status === "completed" && 
                  new Date(a.executed_at || a.created_at).toDateString() === new Date().toDateString()
                ).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-3xl text-destructive">
                {actions.filter(a => a.status === "failed").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedTab === "pending" && selectedActions.size > 0 && (
              <>
                <Button size="sm" onClick={handleBatchApprove} disabled={isApproving}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Approve Selected ({selectedActions.size})
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedActions(new Set())}
                >
                  Clear Selection
                </Button>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Filter by type">
                <Filter className="mr-2 h-4 w-4" />
                Filter by Type
                {filterTypes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filterTypes.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Action Types</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allActionTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilterTypes([...filterTypes, type]);
                    } else {
                      setFilterTypes(filterTypes.filter(t => t !== type));
                    }
                  }}
                >
                  {actionTypeLabels[type]}
                </DropdownMenuCheckboxItem>
              ))}
              {filterTypes.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setFilterTypes([])}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {approvedCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {approvedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-4">
            {/* Select All for pending */}
            {selectedTab === "pending" && actions.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={
                    actions.filter(a => a.status === "pending").length > 0 &&
                    selectedActions.size === actions.filter(a => a.status === "pending").length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : actions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No actions found</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTab === "pending" 
                      ? "No actions are waiting for approval."
                      : `No ${selectedTab} actions to display.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      selected={selectedActions.has(action.id)}
                      onSelect={(selected) => handleSelectAction(action.id, selected)}
                      onApprove={() => approveAction(action.id)}
                      onReject={() => handleReject(action.id)}
                      onExecute={() => executeAction(action.id)}
                      isApproving={isApproving}
                      isRejecting={isRejecting}
                      isExecuting={isExecuting}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Action</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this action (optional).
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmReject} disabled={isRejecting}>
                Reject Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
