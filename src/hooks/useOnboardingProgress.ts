import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface OnboardingMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  category: "setup" | "explore" | "engage";
}

interface OnboardingProgressData {
  hasDocument: boolean;
  hasContact: boolean;
  hasConversation: boolean;
  hasDeal: boolean;
  profileComplete: boolean;
}

const CHECKLIST_DISMISSED_KEY = "smart_agent_onboarding_checklist_dismissed";

/**
 * Hook to track user activation milestones after initial onboarding wizard.
 * Queries real data from Supabase to determine which key actions the user has taken.
 * Shows a persistent checklist on the dashboard until all milestones are complete or dismissed.
 */
export function useOnboardingProgress() {
  const { user, profile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  // Dismissed state from localStorage (persists across sessions)
  const [isDismissed, setIsDismissed] = useState(() => {
    if (!user?.id) return false;
    return localStorage.getItem(`${CHECKLIST_DISMISSED_KEY}_${user.id}`) === "true";
  });

  // Query activation milestones from real data
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["onboarding-progress", workspaceId, user?.id],
    queryFn: async (): Promise<OnboardingProgressData> => {
      if (!workspaceId || !user?.id) {
        return {
          hasDocument: false,
          hasContact: false,
          hasConversation: false,
          hasDeal: false,
          profileComplete: false,
        };
      }

      // Run all queries in parallel for performance
      const [docsResult, contactsResult, convoResult, dealsResult] = await Promise.all([
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("ai_conversations")
          .select("id", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
        supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .or(`workspace_id.eq.${workspaceId},tenant_id.eq.${workspaceId}`),
      ]);

      const profileComplete = !!(
        profile?.full_name &&
        profile?.primary_role
      );

      return {
        hasDocument: (docsResult.count ?? 0) > 0,
        hasContact: (contactsResult.count ?? 0) > 0,
        hasConversation: (convoResult.count ?? 0) > 0,
        hasDeal: (dealsResult.count ?? 0) > 0,
        profileComplete,
      };
    },
    enabled: !!workspaceId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute - milestones don't change rapidly
    refetchOnWindowFocus: true, // Re-check when user returns from completing a task
  });

  // Build milestone list from progress data
  const milestones: OnboardingMilestone[] = useMemo(() => {
    const data = progressData || {
      hasDocument: false,
      hasContact: false,
      hasConversation: false,
      hasDeal: false,
      profileComplete: false,
    };

    return [
      {
        id: "profile",
        title: "Complete your profile",
        description: "Add your name and select your role",
        completed: data.profileComplete,
        href: "/settings",
        category: "setup",
      },
      {
        id: "document",
        title: "Upload your first document",
        description: "Add a contract, disclosure, or inspection report for AI analysis",
        completed: data.hasDocument,
        href: "/documents",
        category: "explore",
      },
      {
        id: "contact",
        title: "Add your first contact",
        description: "Start building your CRM with a client or lead",
        completed: data.hasContact,
        href: "/contacts",
        category: "explore",
      },
      {
        id: "ai-chat",
        title: "Try the AI assistant",
        description: "Ask a question about real estate or your documents",
        completed: data.hasConversation,
        href: "/dashboard",
        category: "engage",
      },
      {
        id: "deal",
        title: "Create your first deal",
        description: "Track a buyer or seller transaction in your pipeline",
        completed: data.hasDeal,
        href: "/pipeline/buyers",
        category: "engage",
      },
    ];
  }, [progressData]);

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allComplete = completedCount === totalCount;

  // Should show checklist: user completed onboarding wizard but hasn't done all activation items
  const showChecklist = useMemo(() => {
    if (!profile) return false;
    if (!profile.onboarding_completed) return false; // Still in wizard
    if (isDismissed && !allComplete) return false; // Dismissed by user
    if (allComplete) return false; // All done, no need to show
    return true;
  }, [profile, isDismissed, allComplete]);

  const dismissChecklist = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`${CHECKLIST_DISMISSED_KEY}_${user.id}`, "true");
    }
    setIsDismissed(true);
  }, [user?.id]);

  const restoreChecklist = useCallback(() => {
    if (user?.id) {
      localStorage.removeItem(`${CHECKLIST_DISMISSED_KEY}_${user.id}`);
    }
    setIsDismissed(false);
  }, [user?.id]);

  return {
    milestones,
    completedCount,
    totalCount,
    progressPercent,
    allComplete,
    showChecklist,
    isLoading,
    dismissChecklist,
    restoreChecklist,
  };
}
