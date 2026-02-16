import { useEffect, useState, useCallback } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export type PushNotificationPlatform = "ios" | "android" | "web";

export interface PushToken {
  id: string;
  user_id: string;
  device_token: string;
  platform: PushNotificationPlatform;
  device_name: string | null;
  active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface PushNotificationState {
  isSupported: boolean;
  isRegistered: boolean;
  permissionStatus: "prompt" | "granted" | "denied" | "unknown";
  token: string | null;
  platform: PushNotificationPlatform | null;
}

/**
 * Hook for managing push notifications on mobile (iOS/Android)
 *
 * Features:
 * - Checks if device supports push notifications
 * - Requests permission from user
 * - Registers device token with backend
 * - Handles incoming notifications
 * - Handles notification tap actions
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isRegistered: false,
    permissionStatus: "unknown",
    token: null,
    platform: null,
  });

  // Determine if push is supported (native mobile only)
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as PushNotificationPlatform | "web";

  // Query to get user's registered push tokens
  const tokensQuery = useQuery({
    queryKey: ["push_notification_tokens", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("push_notification_tokens")
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true);

      if (error) {
        logger.error("Error fetching push tokens:", error);
        throw error;
      }

      return (data || []) as PushToken[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to register a new push token
  const registerTokenMutation = useMutation({
    mutationFn: async ({
      deviceToken,
      platform,
      deviceName,
    }: {
      deviceToken: string;
      platform: PushNotificationPlatform;
      deviceName?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Upsert token (update if exists, insert if not)
      const { data, error } = await supabase
        .from("push_notification_tokens")
        .upsert(
          {
            user_id: user.id,
            device_token: deviceToken,
            platform,
            device_name: deviceName || `${platform} device`,
            active: true,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,device_token",
          }
        )
        .select()
        .single();

      if (error) {
        logger.error("Error registering push token:", error);
        throw error;
      }

      return data as PushToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push_notification_tokens"] });
      setState((prev) => ({ ...prev, isRegistered: true }));
    },
  });

  // Mutation to deactivate a push token
  const deactivateTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("push_notification_tokens")
        .update({ active: false })
        .eq("id", tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push_notification_tokens"] });
    },
  });

  // Check and request permission
  const requestPermission = useCallback(async () => {
    if (!isNative) {
      logger.info("Push notifications not supported on web");
      return false;
    }

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === "granted") {
        setState((prev) => ({ ...prev, permissionStatus: "granted" }));
        return true;
      }

      if (permStatus.receive === "denied") {
        setState((prev) => ({ ...prev, permissionStatus: "denied" }));
        return false;
      }

      // Request permission
      const reqResult = await PushNotifications.requestPermissions();

      if (reqResult.receive === "granted") {
        setState((prev) => ({ ...prev, permissionStatus: "granted" }));
        return true;
      }

      setState((prev) => ({ ...prev, permissionStatus: "denied" }));
      return false;
    } catch (error) {
      logger.error("Error requesting push permission:", error);
      return false;
    }
  }, [isNative]);

  // Register for push notifications
  const register = useCallback(async () => {
    if (!isNative || !user?.id) {
      return;
    }

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        logger.warn("Push notification permission denied");
        return;
      }

      // Register with the native platform
      await PushNotifications.register();
      logger.info("Push notification registration initiated");
    } catch (error) {
      logger.error("Error registering for push notifications:", error);
    }
  }, [isNative, user?.id, requestPermission]);

  // Unregister from push notifications
  const unregister = useCallback(async () => {
    if (state.token && tokensQuery.data) {
      const currentToken = tokensQuery.data.find(
        (t) => t.device_token === state.token
      );
      if (currentToken) {
        await deactivateTokenMutation.mutateAsync(currentToken.id);
      }
    }

    setState((prev) => ({
      ...prev,
      isRegistered: false,
      token: null,
    }));
  }, [state.token, tokensQuery.data, deactivateTokenMutation]);

  // Initialize push notifications on mount
  useEffect(() => {
    if (!isNative) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        platform: "web",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isSupported: true,
      platform: platform as PushNotificationPlatform,
    }));

    // Check initial permission status
    PushNotifications.checkPermissions().then((result) => {
      setState((prev) => ({
        ...prev,
        permissionStatus: result.receive as "prompt" | "granted" | "denied",
      }));
    });
  }, [isNative, platform]);

  // Set up push notification listeners
  useEffect(() => {
    if (!isNative) return;

    // Registration success - save token
    const registrationListener = PushNotifications.addListener(
      "registration",
      async (token: Token) => {
        logger.info("Push registration success, token:", token.value);

        setState((prev) => ({
          ...prev,
          token: token.value,
          isRegistered: true,
        }));

        // Save token to backend
        if (user?.id && platform !== "web") {
          try {
            await registerTokenMutation.mutateAsync({
              deviceToken: token.value,
              platform: platform as PushNotificationPlatform,
            });
          } catch (error) {
            logger.error("Failed to save push token:", error);
          }
        }
      }
    );

    // Registration error
    const errorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        logger.error("Push registration error:", error);
        setState((prev) => ({
          ...prev,
          isRegistered: false,
        }));
      }
    );

    // Push notification received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        logger.info("Push notification received:", notification);

        // Refresh notifications in the app
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      }
    );

    // User tapped on notification
    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        logger.info("Push notification action performed:", action);

        // Handle navigation based on notification data
        const data = action.notification.data;
        if (data?.action_url) {
          // Navigate to the action URL
          window.location.href = data.action_url;
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then((l) => l.remove());
      errorListener.then((l) => l.remove());
      receivedListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
    };
  }, [isNative, user?.id, platform, queryClient, registerTokenMutation]);

  return {
    // State
    ...state,
    tokens: tokensQuery.data || [],
    isLoading: tokensQuery.isLoading,

    // Actions
    requestPermission,
    register,
    unregister,

    // Mutation states
    isRegistering: registerTokenMutation.isPending,
    registerError: registerTokenMutation.error,
  };
}
