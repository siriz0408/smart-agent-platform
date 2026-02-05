import { useState } from "react";
import { Building, User, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ContactOwnershipSwitchProps {
  contactId: string;
  currentOwnershipType: "personal" | "workspace";
  createdBy: string;
  currentUserId: string;
  isWorkspaceAdmin: boolean;
  className?: string;
}

export function ContactOwnershipSwitch({
  contactId,
  currentOwnershipType,
  createdBy,
  currentUserId,
  isWorkspaceAdmin,
  className,
}: ContactOwnershipSwitchProps) {
  const queryClient = useQueryClient();
  const [ownershipType, setOwnershipType] = useState(currentOwnershipType);

  // Only contact creator or workspace admin can change ownership
  const canChangeOwnership = createdBy === currentUserId || isWorkspaceAdmin;

  const updateOwnershipMutation = useMutation({
    mutationFn: async (newType: "personal" | "workspace") => {
      const { error } = await supabase
        .from("contacts")
        .update({ ownership_type: newType })
        .eq("id", contactId);

      if (error) throw error;
      return newType;
    },
    onSuccess: (newType) => {
      setOwnershipType(newType);
      toast.success(
        `Contact ownership changed to ${newType === "personal" ? "Personal" : "Workspace"}`
      );
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error) => {
      logger.error("Error updating contact ownership:", error);
      toast.error("Failed to update contact ownership");
      // Revert the optimistic update
      setOwnershipType(currentOwnershipType);
    },
  });

  const handleToggle = (checked: boolean) => {
    if (!canChangeOwnership) {
      toast.error("Only the contact creator or workspace admin can change ownership");
      return;
    }

    const newType = checked ? "workspace" : "personal";
    setOwnershipType(newType);
    updateOwnershipMutation.mutate(newType);
  };

  const isWorkspace = ownershipType === "workspace";

  return (
    <div className={className}>
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="ownership-switch" className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Ownership:</span>
          <Badge variant={isWorkspace ? "default" : "secondary"} className="gap-1">
            {isWorkspace ? (
              <>
                <Building className="h-3 w-3" />
                Workspace
              </>
            ) : (
              <>
                <User className="h-3 w-3" />
                Personal
              </>
            )}
          </Badge>
        </Label>

        {canChangeOwnership ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Personal</span>
                  <Switch
                    id="ownership-switch"
                    checked={isWorkspace}
                    onCheckedChange={handleToggle}
                    disabled={updateOwnershipMutation.isPending}
                  />
                  <span className="text-xs text-muted-foreground">Workspace</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-2 max-w-xs">
                  <p className="font-medium">Contact Ownership</p>
                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Personal:</strong> Belongs to you, travels with you if you leave
                    </p>
                    <p>
                      <strong>Workspace:</strong> Belongs to the brokerage/team, stays if you
                      leave
                    </p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Locked
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Only the contact creator or workspace admin can change ownership
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2">
        {isWorkspace
          ? "This contact belongs to the workspace and will remain with the brokerage."
          : "This contact is personal and will travel with you if you change brokerages."}
      </p>
    </div>
  );
}
