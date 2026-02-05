import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Check, ChevronsUpDown, Building2, Plus, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export function WorkspaceSwitcher({ collapsed = false, className }: WorkspaceSwitcherProps) {
  const { 
    activeWorkspace, 
    workspaces, 
    loading,
    isSuperAdmin,
    switchWorkspace, 
    createWorkspace,
    isWorkspaceOwner,
    isWorkspaceAdmin
  } = useWorkspace();
  
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setOpen(false);
      return;
    }

    const result = await switchWorkspace(workspaceId);
    if (result.success) {
      toast.success("Switched workspace");
      // Reload the page to reset all context
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to switch workspace");
    }
    setOpen(false);
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setIsCreating(true);
    const result = await createWorkspace(newWorkspaceName.trim());
    setIsCreating(false);

    if (result.success) {
      toast.success(`Created workspace "${result.workspace?.name}"`);
      setCreateDialogOpen(false);
      setNewWorkspaceName("");
      // Reload to switch to new workspace
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to create workspace");
    }
  };

  if (loading || !activeWorkspace) {
    return (
      <div className={cn("animate-pulse h-9 bg-white/10 rounded-lg", className)} />
    );
  }

  // Get role badge for workspace
  const getRoleBadge = (role: string, isOwner: boolean) => {
    if (isOwner || role === "owner") {
      return <Crown className="h-3 w-3 text-amber-500" />;
    }
    if (role === "admin") {
      return <Shield className="h-3 w-3 text-blue-500" />;
    }
    return null;
  };

  // Collapsed view - just show icon
  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-lg",
              "bg-white/10 hover:bg-white/20 text-white",
              className
            )}
            title={activeWorkspace.name}
            aria-label="Switch workspace"
          >
            <Building2 className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" side="right">
          <WorkspaceList 
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspace.id}
            isSuperAdmin={isSuperAdmin}
            onSelect={handleSwitchWorkspace}
            onCreateNew={() => {
              setOpen(false);
              setCreateDialogOpen(true);
            }}
            getRoleBadge={getRoleBadge}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-9 px-3",
              "bg-white/10 hover:bg-white/20 text-white",
              "text-sm font-medium",
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{activeWorkspace.name}</span>
              {isWorkspaceOwner && (
                <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
              )}
              {!isWorkspaceOwner && isWorkspaceAdmin && (
                <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <WorkspaceList 
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspace.id}
            isSuperAdmin={isSuperAdmin}
            onSelect={handleSwitchWorkspace}
            onCreateNew={() => {
              setOpen(false);
              setCreateDialogOpen(true);
            }}
            getRoleBadge={getRoleBadge}
          />
        </PopoverContent>
      </Popover>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to collaborate with your team or manage a separate brokerage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Acme Realty"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateWorkspace();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Separate component for the workspace list
interface WorkspaceListProps {
  workspaces: Array<{
    workspace_id: string;
    role: string;
    is_owner: boolean;
    workspace?: {
      id: string;
      name: string;
      slug?: string;
    };
  }>;
  activeWorkspaceId: string;
  isSuperAdmin: boolean;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  getRoleBadge: (role: string, isOwner: boolean) => React.ReactNode;
}

function WorkspaceList({ 
  workspaces, 
  activeWorkspaceId, 
  isSuperAdmin,
  onSelect, 
  onCreateNew,
  getRoleBadge 
}: WorkspaceListProps) {
  return (
    <Command>
      <CommandInput placeholder="Search workspaces..." />
      <CommandList>
        <CommandEmpty>No workspace found.</CommandEmpty>
        <CommandGroup heading="Your Workspaces">
          {workspaces.map((membership) => {
            const workspace = membership.workspace;
            if (!workspace) return null;

            return (
              <CommandItem
                key={workspace.id}
                value={workspace.name}
                onSelect={() => onSelect(workspace.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{workspace.name}</span>
                  {getRoleBadge(membership.role, membership.is_owner)}
                </div>
                {workspace.id === activeWorkspaceId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup>
          <CommandItem
            onSelect={onCreateNew}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2 text-muted-foreground" />
            Create New Workspace
          </CommandItem>
        </CommandGroup>
        {isSuperAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Super Admin">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Platform administrator access enabled
              </div>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
