import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// Super admin email - only this user has platform-wide admin access
const SUPER_ADMIN_EMAIL = "siriz04081@gmail.com";

interface Workspace {
  id: string;
  name: string;
  slug?: string;
  subscription_tier?: string;
}

interface WorkspaceMembership {
  workspace_id: string;
  role: string;
  is_owner: boolean;
  workspace?: Workspace;
}

interface WorkspaceContextType {
  // Current state
  activeWorkspace: Workspace | null;
  workspaces: WorkspaceMembership[];
  loading: boolean;
  
  // Super admin status
  isSuperAdmin: boolean;
  
  // Actions
  switchWorkspace: (workspaceId: string) => Promise<{ success: boolean; error?: string }>;
  createWorkspace: (name: string, slug?: string) => Promise<{ success: boolean; workspace?: Workspace; error?: string }>;
  inviteToWorkspace: (email: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  refreshWorkspaces: () => Promise<void>;
  
  // Helpers
  isWorkspaceAdmin: boolean;
  isWorkspaceOwner: boolean;
  currentMembership: WorkspaceMembership | null;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, profile, session, loading: authLoading } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine if user is super admin
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  // Get current membership for active workspace
  const currentMembership = workspaces.find(w => w.workspace_id === activeWorkspace?.id) || null;
  
  // Computed permissions
  const isWorkspaceOwner = currentMembership?.is_owner || currentMembership?.role === "owner" || false;
  const isWorkspaceAdmin = isSuperAdmin || isWorkspaceOwner || currentMembership?.role === "admin" || false;

  // Fetch user's workspaces and active workspace
  const fetchWorkspaces = useCallback(async () => {
    if (authLoading || !user) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      // Fetch all workspace memberships
      // Note: workspaces table doesn't have subscription_tier column
      const { data: memberships, error: membershipError } = await supabase
        .from("workspace_memberships")
        .select(`
          workspace_id,
          role,
          is_owner,
          workspace:workspaces(id, name, slug)
        `)
        .eq("user_id", user.id);

      if (membershipError) {
        logger.error("Error fetching workspace memberships:", membershipError);
        // Fallback to profile tenant_id
        if (profile?.tenant_id) {
          const { data: workspace } = await supabase
            .from("workspaces")
            .select("id, name, slug, subscription_tier")
            .eq("id", profile.tenant_id)
            .single();
          
          if (workspace) {
            setWorkspaces([{
              workspace_id: workspace.id,
              role: "admin",
              is_owner: true,
              workspace
            }]);
            setActiveWorkspace(workspace);
          }
        }
        setLoading(false);
        return;
      }

      // Map memberships with workspace data
      const mappedMemberships: WorkspaceMembership[] = (memberships || []).map(m => ({
        workspace_id: m.workspace_id,
        role: m.role,
        is_owner: m.is_owner,
        // Handle Supabase's nested object return type
        workspace: Array.isArray(m.workspace) ? m.workspace[0] : m.workspace
      }));

      setWorkspaces(mappedMemberships);

      // Determine active workspace
      // Priority: profile.active_workspace_id > profile.tenant_id > first workspace
      const activeId = (profile as { active_workspace_id?: string })?.active_workspace_id 
                      || profile?.tenant_id;
      
      const activeWs = mappedMemberships.find(m => m.workspace_id === activeId)?.workspace
                      || mappedMemberships[0]?.workspace
                      || null;
      
      setActiveWorkspace(activeWs);
    } catch (err) {
      logger.error("Error in fetchWorkspaces:", err);
    } finally {
      setLoading(false);
    }
  }, [user, profile, authLoading]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Switch to a different workspace
  const switchWorkspace = async (workspaceId: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await supabase.functions.invoke("switch-workspace", {
        body: { workspaceId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        return { success: false, error: response.data.error };
      }

      // Update local state
      const newActive = workspaces.find(w => w.workspace_id === workspaceId)?.workspace || null;
      setActiveWorkspace(newActive);

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch workspace";
      logger.error("Switch workspace error:", err);
      return { success: false, error: message };
    }
  };

  // Create a new workspace
  const createWorkspace = async (
    name: string, 
    slug?: string
  ): Promise<{ success: boolean; workspace?: Workspace; error?: string }> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await supabase.functions.invoke("create-workspace", {
        body: { name, slug },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        return { success: false, error: response.data.error };
      }

      const newWorkspace = response.data.workspace;

      // Refresh workspaces to include the new one
      await fetchWorkspaces();

      return { success: true, workspace: newWorkspace };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      logger.error("Create workspace error:", err);
      return { success: false, error: message };
    }
  };

  // Invite user to current workspace
  const inviteToWorkspace = async (
    email: string, 
    role: string = "agent"
  ): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    if (!activeWorkspace) {
      return { success: false, error: "No active workspace" };
    }

    try {
      const response = await supabase.functions.invoke("invite-to-workspace", {
        body: { 
          email, 
          role,
          workspaceId: activeWorkspace.id 
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        return { success: false, error: response.data.error };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invitation";
      logger.error("Invite to workspace error:", err);
      return { success: false, error: message };
    }
  };

  const refreshWorkspaces = async () => {
    setLoading(true);
    await fetchWorkspaces();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        loading,
        isSuperAdmin,
        switchWorkspace,
        createWorkspace,
        inviteToWorkspace,
        refreshWorkspaces,
        isWorkspaceAdmin,
        isWorkspaceOwner,
        currentMembership,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
