import { useState } from "react";
import { Plus, Trash2, Play, Pause, Zap, Clock, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TriggerConditionBuilder } from "./TriggerConditionBuilder";

interface AgentTrigger {
  id: string;
  tenant_id: string;
  agent_id: string;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  schedule_cron: string | null;
  is_active: boolean;
  requires_approval: boolean;
  priority: number;
  name: string | null;
  description: string | null;
  created_at: string;
}

interface TriggerConfigProps {
  agentId: string;
  agentName: string;
}

const triggerTypes = [
  { value: "contact_created", label: "Contact Created", description: "When a new contact is added" },
  { value: "contact_updated", label: "Contact Updated", description: "When a contact is modified" },
  { value: "deal_created", label: "Deal Created", description: "When a new deal is started" },
  { value: "deal_stage_changed", label: "Deal Stage Changed", description: "When a deal moves to a new stage" },
  { value: "deal_updated", label: "Deal Updated", description: "When deal details change" },
  { value: "document_uploaded", label: "Document Uploaded", description: "When a document is added" },
  { value: "document_indexed", label: "Document Indexed", description: "When a document finishes processing" },
  { value: "property_created", label: "Property Created", description: "When a new property is added" },
  { value: "property_updated", label: "Property Updated", description: "When property details change" },
  { value: "scheduled", label: "Scheduled", description: "Run on a schedule" },
];

const cronPresets = [
  { value: "0 9 * * *", label: "Every day at 9am" },
  { value: "0 9 * * 1", label: "Every Monday at 9am" },
  { value: "0 9 * * 1-5", label: "Weekdays at 9am" },
  { value: "0 9 1 * *", label: "First of each month at 9am" },
  { value: "0 */4 * * *", label: "Every 4 hours" },
  { value: "custom", label: "Custom cron expression" },
];

export function TriggerConfig({ agentId, agentName }: TriggerConfigProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<AgentTrigger | null>(null);
  
  // Form state
  const [triggerType, setTriggerType] = useState("contact_created");
  const [triggerName, setTriggerName] = useState("");
  const [triggerDescription, setTriggerDescription] = useState("");
  const [conditions, setConditions] = useState<Record<string, unknown>>({});
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [priority, setPriority] = useState(5);
  const [scheduleCron, setScheduleCron] = useState("");
  const [cronPreset, setCronPreset] = useState("0 9 * * *");
  const [isActive, setIsActive] = useState(true);

  // Fetch existing triggers
  const { data: triggers = [], isLoading } = useQuery({
    queryKey: ["agent_triggers", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_triggers")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AgentTrigger[];
    },
  });

  // Create trigger mutation
  const createTrigger = useMutation({
    mutationFn: async (newTrigger: Partial<AgentTrigger>) => {
      // Get tenant_id from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error("Tenant not found");

      const { data, error } = await supabase
        .from("agent_triggers")
        .insert({
          ...newTrigger,
          tenant_id: profile.tenant_id,
          agent_id: agentId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Trigger created", description: "The trigger has been saved." });
      queryClient.invalidateQueries({ queryKey: ["agent_triggers", agentId] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create trigger",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Update trigger mutation
  const updateTrigger = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentTrigger> }) => {
      const { data, error } = await supabase
        .from("agent_triggers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Trigger updated", description: "The trigger has been updated." });
      queryClient.invalidateQueries({ queryKey: ["agent_triggers", agentId] });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update trigger",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Delete trigger mutation
  const deleteTrigger = useMutation({
    mutationFn: async (triggerId: string) => {
      const { error } = await supabase
        .from("agent_triggers")
        .delete()
        .eq("id", triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trigger deleted", description: "The trigger has been removed." });
      queryClient.invalidateQueries({ queryKey: ["agent_triggers", agentId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete trigger",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("agent_triggers")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent_triggers", agentId] });
    },
  });

  const resetForm = () => {
    setEditingTrigger(null);
    setTriggerType("contact_created");
    setTriggerName("");
    setTriggerDescription("");
    setConditions({});
    setRequiresApproval(true);
    setPriority(5);
    setScheduleCron("");
    setCronPreset("0 9 * * *");
    setIsActive(true);
  };

  const openEditDialog = (trigger: AgentTrigger) => {
    setEditingTrigger(trigger);
    setTriggerType(trigger.trigger_type);
    setTriggerName(trigger.name || "");
    setTriggerDescription(trigger.description || "");
    setConditions(trigger.trigger_conditions || {});
    setRequiresApproval(trigger.requires_approval);
    setPriority(trigger.priority);
    setScheduleCron(trigger.schedule_cron || "");
    if (trigger.schedule_cron) {
      const preset = cronPresets.find((p) => p.value === trigger.schedule_cron);
      setCronPreset(preset ? preset.value : "custom");
    }
    setIsActive(trigger.is_active);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const triggerData = {
      trigger_type: triggerType,
      name: triggerName || null,
      description: triggerDescription || null,
      trigger_conditions: conditions,
      requires_approval: requiresApproval,
      priority,
      schedule_cron: triggerType === "scheduled" 
        ? (cronPreset === "custom" ? scheduleCron : cronPreset)
        : null,
      is_active: isActive,
    };

    if (editingTrigger) {
      updateTrigger.mutate({ id: editingTrigger.id, updates: triggerData });
    } else {
      createTrigger.mutate(triggerData);
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    return triggerTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Triggers
            </CardTitle>
            <CardDescription>
              Configure when this agent runs automatically
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Trigger
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTrigger ? "Edit Trigger" : "Create Trigger"}
                </DialogTitle>
                <DialogDescription>
                  Configure when "{agentName}" should run automatically
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Trigger Type */}
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schedule Cron (for scheduled triggers) */}
                {triggerType === "scheduled" && (
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Select value={cronPreset} onValueChange={setCronPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cronPresets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cronPreset === "custom" && (
                      <div className="mt-2">
                        <Input
                          placeholder="0 9 * * *"
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Cron format: minute hour day-of-month month day-of-week
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Conditions (for event triggers) */}
                {triggerType !== "scheduled" && (
                  <TriggerConditionBuilder
                    triggerType={triggerType}
                    conditions={conditions}
                    onChange={setConditions}
                  />
                )}

                {/* Trigger Name */}
                <div className="space-y-2">
                  <Label>Name (Optional)</Label>
                  <Input
                    placeholder="e.g., New Lead Follow-up"
                    value={triggerName}
                    onChange={(e) => setTriggerName(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Describe what this trigger does..."
                    value={triggerDescription}
                    onChange={(e) => setTriggerDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Settings */}
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Approval</Label>
                      <p className="text-xs text-muted-foreground">
                        Actions will wait for approval before executing
                      </p>
                    </div>
                    <Switch
                      checked={requiresApproval}
                      onCheckedChange={setRequiresApproval}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable or disable this trigger
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Priority (1-10)</Label>
                    <p className="text-xs text-muted-foreground">
                      Higher priority triggers run first
                    </p>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createTrigger.isPending || updateTrigger.isPending}
                >
                  {editingTrigger ? "Update" : "Create"} Trigger
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : triggers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No triggers configured</p>
            <p className="text-sm">Add a trigger to automate this agent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  trigger.is_active ? "" : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {trigger.trigger_type === "scheduled" ? (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">
                      {trigger.name || getTriggerTypeLabel(trigger.trigger_type)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {trigger.trigger_type === "scheduled"
                        ? `Schedule: ${trigger.schedule_cron}`
                        : getTriggerTypeLabel(trigger.trigger_type)}
                      {Object.keys(trigger.trigger_conditions || {}).length > 0 && (
                        <span> • {Object.keys(trigger.trigger_conditions).length} condition(s)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={trigger.requires_approval ? "outline" : "secondary"}>
                    {trigger.requires_approval ? "Needs Approval" : "Auto-execute"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive.mutate({ id: trigger.id, isActive: !trigger.is_active })}
                  >
                    {trigger.is_active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(trigger)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTrigger.mutate(trigger.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
