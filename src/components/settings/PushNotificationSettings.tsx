import { Smartphone, Bell, BellOff, RefreshCw, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { usePushNotifications, PushToken } from "@/hooks/usePushNotifications";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatDistanceToNow } from "date-fns";

/**
 * Push Notification Settings Component
 *
 * Shows push notification status and controls for mobile devices.
 * Includes:
 * - Permission status indicator
 * - Enable/disable push toggle
 * - Device token registration button
 * - List of registered devices
 */
export function PushNotificationSettings() {
  const {
    isSupported,
    isRegistered,
    permissionStatus,
    platform,
    tokens,
    isLoading,
    requestPermission,
    register,
    unregister,
    isRegistering,
  } = usePushNotifications();

  const { preferences, updatePreference } = useUserPreferences();

  // Handle toggle change
  const handleTogglePush = async (enabled: boolean) => {
    updatePreference("pushNotifications", enabled);

    if (enabled && isSupported && !isRegistered) {
      await register();
    } else if (!enabled && isRegistered) {
      await unregister();
    }
  };

  // Handle request permission and register
  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) {
      await register();
      updatePreference("pushNotifications", true);
    }
  };

  // Get status badge based on permission
  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Web Only
        </Badge>
      );
    }

    switch (permissionStatus) {
      case "granted":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <Check className="h-3 w-3" />
            Enabled
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Denied
          </Badge>
        );
      case "prompt":
        return (
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            Not Set
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  // Get platform icon
  const getPlatformIcon = (p: string) => {
    switch (p) {
      case "ios":
        return "iOS";
      case "android":
        return "Android";
      default:
        return "Web";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Push Notifications
            </CardTitle>
            <CardDescription>
              Get real-time alerts on your mobile device
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="mobile-push-notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {isSupported
                ? "Receive push notifications on this device"
                : "Push notifications require the mobile app"}
            </p>
          </div>
          <Switch
            id="mobile-push-notifications"
            checked={preferences.pushNotifications && isRegistered}
            onCheckedChange={handleTogglePush}
            disabled={!isSupported || permissionStatus === "denied"}
          />
        </div>

        {/* Permission request button (shown on mobile when permission not granted) */}
        {isSupported && permissionStatus === "prompt" && (
          <>
            <Separator />
            <div className="flex flex-col gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Enable Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Stay updated with deal changes, new messages, and important reminders
                  </p>
                </div>
              </div>
              <Button
                onClick={handleEnablePush}
                disabled={isRegistering}
                className="w-full sm:w-auto"
              >
                {isRegistering ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Permission denied message */}
        {isSupported && permissionStatus === "denied" && (
          <>
            <Separator />
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
              <BellOff className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Notifications Blocked
                </p>
                <p className="text-sm text-muted-foreground">
                  Push notifications are blocked. To enable them, go to your device
                  settings and allow notifications for Smart Agent.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Registered devices list */}
        {tokens.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Registered Devices</Label>
              <div className="mt-2 space-y-2">
                {tokens.map((token: PushToken) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {token.device_name || `${getPlatformIcon(token.platform)} Device`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last used{" "}
                          {formatDistanceToNow(new Date(token.last_used_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{getPlatformIcon(token.platform)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Web-only message */}
        {!isSupported && (
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Mobile App Required</p>
              <p className="text-sm text-muted-foreground">
                Push notifications are available in the Smart Agent mobile app.
                Download it from the App Store or Google Play to receive
                real-time alerts.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
