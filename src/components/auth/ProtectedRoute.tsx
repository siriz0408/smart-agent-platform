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
  requiredRoles?: AppRole[];  // Role-based access control
  skipOnboardingCheck?: boolean; // Skip onboarding redirect (for onboarding page itself)
}

export function ProtectedRoute({
  children,
  allowExpiredTrial = false,
  requiredRoles,
  skipOnboardingCheck = false
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
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

  // Onboarding check - redirect new users to onboarding
  // Skip this check for the onboarding page itself and certain settings paths
  const onboardingExemptPaths = ["/onboarding", "/settings", "/logout"];
  const isOnboardingExempt = skipOnboardingCheck || 
    onboardingExemptPaths.some(path => location.pathname.startsWith(path));
  
  if (!isOnboardingExempt && profile && profile.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
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
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Allow access to billing and trial-expired pages even when trial is expired
  const allowedPaths = ["/billing", "/trial-expired", "/settings/billing", "/onboarding"];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // Redirect to trial-expired page if trial has expired (unless allowed)
  if (isTrialExpired && !allowExpiredTrial && !isAllowedPath) {
    return <Navigate to="/trial-expired" replace />;
  }

  return <>{children}</>;
}
