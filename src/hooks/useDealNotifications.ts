import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

/**
 * Deal Notifications Hook (TRX-011)
 *
 * Sends notifications for deal activity changes via the deal-notifications edge function.
 * Respects user preferences set in the Settings page.
 */

interface StageChangePayload {
  type: "stage_change";
  dealId: string;
  previousStage: string | null;
  newStage: string;
}

interface MilestoneCompletionPayload {
  type: "milestone_completion";
  milestoneId: string;
  dealId: string;
  milestoneTitle: string;
}

type NotificationPayload = StageChangePayload | MilestoneCompletionPayload;

interface NotificationResult {
  success: boolean;
  notificationId?: string;
  skipped?: boolean;
  reason?: string;
}

export function useDealNotifications() {
  const { user, profile } = useAuth();

  const sendNotification = useMutation({
    mutationFn: async (payload: NotificationPayload): Promise<NotificationResult> => {
      if (!user?.id || !profile?.tenant_id) {
        logger.warn("Cannot send notification: missing user or tenant");
        return { success: false, reason: "No user or tenant" };
      }

      try {
        const response = await supabase.functions.invoke("deal-notifications", {
          body: {
            ...payload,
            userId: user.id,
            tenantId: profile.tenant_id,
          },
        });

        if (response.error) {
          logger.error("Deal notification error", { error: response.error });
          return { success: false, reason: response.error.message };
        }

        return response.data as NotificationResult;
      } catch (error) {
        logger.error("Failed to send deal notification", {
          error: error instanceof Error ? error.message : String(error),
        });
        return { success: false, reason: "Network error" };
      }
    },
  });

  /**
   * Send a notification when a deal moves to a new stage
   */
  const notifyStageChange = async (
    dealId: string,
    previousStage: string | null,
    newStage: string
  ): Promise<NotificationResult> => {
    return sendNotification.mutateAsync({
      type: "stage_change",
      dealId,
      previousStage,
      newStage,
    });
  };

  /**
   * Send a notification when a milestone is completed
   */
  const notifyMilestoneCompletion = async (
    milestoneId: string,
    dealId: string,
    milestoneTitle: string
  ): Promise<NotificationResult> => {
    return sendNotification.mutateAsync({
      type: "milestone_completion",
      milestoneId,
      dealId,
      milestoneTitle,
    });
  };

  return {
    notifyStageChange,
    notifyMilestoneCompletion,
    isLoading: sendNotification.isPending,
  };
}
