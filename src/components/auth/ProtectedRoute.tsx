import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useRole } from "@/contexts/RoleContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Super admin email - only this user has platform-wide admin access
const SUPER_ADMIN_EMAIL = "siriz04081@gmail.com";

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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:ONBOARDING_CHECK',message:'Checking onboarding status',data:{path:location.pathname,isOnboardingExempt,onboardingCompleted:profile?.onboarding_completed,willRedirect:!isOnboardingExempt&&profile&&profile.onboarding_completed===false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
  // #endregion

  if (!isOnboardingExempt && profile && profile.onboarding_completed === false) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/86d72d9e-7714-47a3-9f8a-3809f80faebf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:REDIRECT_TO_ONBOARDING',message:'Redirecting to onboarding because onboarding_completed is false',data:{path:location.pathname,onboardingCompleted:profile.onboarding_completed},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    return <Navigate to="/onboarding" replace />;
  }

  // Role-based access control
  // For admin routes, check availableRoles (actual DB permissions) not activeRole
  // This allows admins to test other roles while still accessing admin pages
  if (requiredRoles) {
    // Super admin check - only Sam's email can access super_admin routes
    const requiresSuperAdmin = requiredRoles.includes("super_admin") && requiredRoles.length === 1;
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    
    // For routes that ONLY require super_admin, verify email
    if (requiresSuperAdmin && !isSuperAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    
    const isAdminRoute = requiredRoles.includes("super_admin") || requiredRoles.includes("admin");
    
    // For admin routes, super_admin email always has access
    // Otherwise check availableRoles
    const hasAccess = isSuperAdmin || (isAdminRoute
      ? requiredRoles.some(r => availableRoles.includes(r))
      : requiredRoles.includes(activeRole));
    
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
