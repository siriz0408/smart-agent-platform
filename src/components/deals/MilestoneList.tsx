import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, addDays, isBefore } from "date-fns";
import { Circle, Plus, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddMilestoneDialog } from "./AddMilestoneDialog";

interface Milestone {
  id: string;
  deal_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface MilestoneListProps {
  dealId: string;
}

export function MilestoneList({ dealId }: MilestoneListProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["deal-milestones", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_milestones")
        .select("*")
        .eq("deal_id", dealId)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Milestone[];
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("deal_milestones")
        .update({ 
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-milestones", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating milestone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("deal_milestones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-milestones", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({ title: "Milestone deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting milestone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getMilestoneStatus = (milestone: Milestone) => {
    if (milestone.completed_at) return "completed";
    if (!milestone.due_date) return "pending";
    
    const dueDate = new Date(milestone.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return "overdue";
    if (isToday(dueDate)) return "due-today";
    if (isBefore(dueDate, addDays(new Date(), 3))) return "due-soon";
    return "pending";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "due-today":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Due Today</Badge>;
      case "due-soon":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">Due Soon</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Milestones ({milestones.length})
        </h3>
        <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No milestones yet</p>
          <p className="text-sm">Add milestones to track key deadlines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const status = getMilestoneStatus(milestone);
            const isCompleted = !!milestone.completed_at;

            return (
              <div
                key={milestone.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  status === "overdue" && !isCompleted && "border-destructive/50 bg-destructive/5",
                  status === "due-today" && !isCompleted && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10",
                  isCompleted && "bg-muted/50 opacity-75"
                )}
              >
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) => {
                    toggleCompleteMutation.mutate({
                      id: milestone.id,
                      completed: !!checked,
                    });
                  }}
                  className="mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-medium",
                      isCompleted && "line-through text-muted-foreground"
                    )}>
                      {milestone.title}
                    </span>
                    {getStatusBadge(status)}
                  </div>

                  {milestone.due_date && (
                    <p className={cn(
                      "text-sm mt-0.5",
                      status === "overdue" && !isCompleted ? "text-destructive" : "text-muted-foreground"
                    )}>
                      Due: {format(new Date(milestone.due_date), "MMM d, yyyy")}
                    </p>
                  )}

                  {milestone.notes && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {milestone.notes}
                    </p>
                  )}

                  {milestone.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {format(new Date(milestone.completed_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingMilestone(milestone)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(milestone.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddMilestoneDialog
        open={addDialogOpen || !!editingMilestone}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingMilestone(null);
          }
        }}
        dealId={dealId}
        milestone={editingMilestone}
      />
    </div>
  );
}
