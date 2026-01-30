import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useRole } from "@/contexts/RoleContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: ReactNode;
  allowExpiredTrial?: boolean;
  requiredRoles?: AppRole[];  // NEW: Role-based access control
}

export function ProtectedRoute({
  children,
  allowExpiredTrial = false,
  requiredRoles
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { activeRole, availableRoles, loading: roleLoading } = useRole();
  const { isTrialExpired, isLoading: subscriptionLoading } = useSubscription();
  const location = useLocation();

  if (loading || subscriptionLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  // For admin routes, check availableRoles (actual DB permissions) not activeRole
  // This allows admins to test other roles while still accessing admin pages
  if (requiredRoles) {
    const isAdminRoute = requiredRoles.includes("super_admin") || requiredRoles.includes("admin");
    const hasAccess = isAdminRoute
      ? requiredRoles.some(r => availableRoles.includes(r))
      : requiredRoles.includes(activeRole);
    
    if (!hasAccess) {
      return <Navigate to="/" replace />;
    }
  }

  // Allow access to billing and trial-expired pages even when trial is expired
  const allowedPaths = ["/billing", "/trial-expired", "/settings/billing"];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // Redirect to trial-expired page if trial has expired (unless allowed)
  if (isTrialExpired && !allowExpiredTrial && !isAllowedPath) {
    return <Navigate to="/trial-expired" replace />;
  }

  return <>{children}</>;
}
