import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleContextType {
  activeRole: AppRole;
  availableRoles: AppRole[];
  canSwitchRoles: boolean;
  loading: boolean;
  isAdmin: boolean;
  isOverrideActive: boolean;
  switchRole: (role: AppRole) => Promise<void>;
  overrideRole: (role: AppRole) => void;
  clearOverride: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const ROLE_STORAGE_KEY = "smart_agent_active_role";
const ROLE_OVERRIDE_KEY = "smart_agent_role_override";

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading, isSuperAdmin } = useAuth();
  const [baseRole, setBaseRole] = useState<AppRole>("agent");
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [canSwitchRoles, setCanSwitchRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overrideRoleValue, setOverrideRoleValue] = useState<AppRole | null>(() => {
    const stored = localStorage.getItem(ROLE_OVERRIDE_KEY);
    return stored ? (stored as AppRole) : null;
  });

  // Computed values
  // isAdmin: true if user has admin/super_admin role in DB OR is the hardcoded super admin email
  const isAdmin = isSuperAdmin || availableRoles.includes("super_admin") || availableRoles.includes("admin");
  const isOverrideActive = overrideRoleValue !== null && isAdmin;
  const activeRole = isOverrideActive ? overrideRoleValue : baseRole;

  // Fetch user roles when user changes
  useEffect(() => {
    const fetchRoles = async () => {
      // Wait for auth to finish loading before making decisions
      if (authLoading) {
        return; // Keep loading=true until auth is done
      }
      
      // No user means no roles needed - safe to stop loading
      if (!user) {
        setAvailableRoles([]);
        setCanSwitchRoles(false);
        setLoading(false);
        return;
      }
      
      // User exists but profile not yet loaded - wait for it
      if (!profile) {
        return; // Keep loading=true until profile arrives
      }

      try {
        // Fetch all roles for this user
        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = error ? ["agent" as AppRole] : (roleData?.map((r) => r.role) || ["agent" as AppRole]);

        if (error) {
          logger.error("Error fetching user roles:", error);
        }

        setAvailableRoles(roles);
        setCanSwitchRoles(roles.length > 1);

        // Get primary role from profile or localStorage
        const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
        const profileRole = (profile as unknown as { primary_role?: AppRole }).primary_role;

        // Use freshly fetched roles for the check
        if (storedRole && roles.includes(storedRole as AppRole)) {
          setBaseRole(storedRole as AppRole);
        } else if (profileRole && roles.includes(profileRole)) {
          setBaseRole(profileRole);
        } else if (roles.length > 0) {
          setBaseRole(roles[0]);
        }
        
        // Clear override if user doesn't have admin role (also check isSuperAdmin from email)
        const hasAdminRole = isSuperAdmin || roles.includes("super_admin") || roles.includes("admin");
        if (!hasAdminRole && overrideRoleValue) {
          setOverrideRoleValue(null);
          localStorage.removeItem(ROLE_OVERRIDE_KEY);
        }
      } catch (err) {
        logger.error("Error in fetchRoles:", err);
        setAvailableRoles(["agent"]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, profile, authLoading]);

  const switchRole = async (role: AppRole) => {
    if (!availableRoles.includes(role)) {
      logger.error("User does not have access to role:", role);
      return;
    }

    setBaseRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);

    // Update profile.primary_role in database (column now exists)
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ primary_role: role })
          .eq("user_id", user.id);
      } catch (err) {
        logger.error("Error updating primary role:", err);
        // Non-fatal - localStorage already updated
      }
    }
  };

  const overrideRole = (role: AppRole) => {
    if (!isAdmin) {
      logger.error("Only admins can override roles");
      return;
    }
    setOverrideRoleValue(role);
    localStorage.setItem(ROLE_OVERRIDE_KEY, role);
  };

  const clearOverride = () => {
    setOverrideRoleValue(null);
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
  };

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        availableRoles,
        canSwitchRoles,
        loading,
        isAdmin,
        isOverrideActive,
        switchRole,
        overrideRole,
        clearOverride,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
