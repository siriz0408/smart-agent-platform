import { useState } from "react";
import { Bot, Info, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIConnectorToggleProps {
  connectorName: string;
  connectorKey: string;
  isEnabled: boolean;
  isConnected: boolean;
  supportedActions: string[];
  onToggle: (enabled: boolean) => void;
  isUpdating?: boolean;
}

/**
 * MCP-style toggle for enabling AI chat access to a connector.
 * Shows a dialog with permissions explanation when enabling.
 */
export function AIConnectorToggle({
  connectorName,
  connectorKey,
  isEnabled,
  isConnected,
  supportedActions,
  onToggle,
  isUpdating = false,
}: AIConnectorToggleProps) {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState(false);

  const handleToggleClick = (checked: boolean) => {
    if (checked && !isEnabled) {
      // Show permission dialog when enabling
      setPendingValue(true);
      setShowPermissionDialog(true);
    } else {
      // Disable immediately without dialog
      onToggle(false);
    }
  };

  const confirmEnable = () => {
    onToggle(true);
    setShowPermissionDialog(false);
  };

  const cancelEnable = () => {
    setShowPermissionDialog(false);
    setPendingValue(false);
  };

  // Format action names for display
  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Group actions by type (read vs write)
  const readActions = supportedActions.filter(
    (a) =>
      a.includes("read") ||
      a.includes("list") ||
      a.includes("get") ||
      a.includes("search") ||
      a.includes("availability")
  );
  const writeActions = supportedActions.filter(
    (a) =>
      a.includes("create") ||
      a.includes("update") ||
      a.includes("delete") ||
      a.includes("send") ||
      a.includes("draft")
  );

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Label
            htmlFor={`ai-toggle-${connectorKey}`}
            className="text-sm font-medium cursor-pointer"
          >
            AI Chat Access
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>
                  When enabled, Smart Agent AI can query {connectorName} data to
                  answer your questions. You control what the AI can access.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id={`ai-toggle-${connectorKey}`}
          checked={isEnabled}
          onCheckedChange={handleToggleClick}
          disabled={isUpdating}
          className={cn(
            isEnabled && "data-[state=checked]:bg-green-600"
          )}
        />
      </div>

      {/* Permission Confirmation Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Enable AI Access to {connectorName}
            </DialogTitle>
            <DialogDescription>
              Review what data your AI assistant will be able to access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Read permissions */}
            {readActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  Read Access
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {readActions.map((action) => (
                    <li key={action} className="flex items-center gap-2">
                      <span className="text-muted-foreground/50">-</span>
                      {formatAction(action)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Write permissions */}
            {writeActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-orange-500" />
                  Write Access (requires approval)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {writeActions.map((action) => (
                    <li key={action} className="flex items-center gap-2">
                      <span className="text-muted-foreground/50">-</span>
                      {formatAction(action)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  You can disable AI access at any time. Write actions always
                  require your explicit approval before execution.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelEnable}>
              Cancel
            </Button>
            <Button onClick={confirmEnable} className="gap-2">
              <Bot className="h-4 w-4" />
              Enable AI Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
