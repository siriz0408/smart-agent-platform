import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Bell, CreditCard, Palette, Keyboard, Shield, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { EditProfileDialog } from "@/components/settings/EditProfileDialog";
import { DataExportDialog } from "@/components/settings/DataExportDialog";
import { KeyboardShortcutsDialog } from "@/components/settings/KeyboardShortcutsDialog";

export default function Settings() {
  const { user, profile } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lg">
                    {profile?.full_name || "User"}
                  </div>
                  <div className="text-muted-foreground">{user?.email}</div>
                  {profile?.title && (
                    <div className="text-sm text-muted-foreground">{profile.title}</div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="ml-auto"
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <EditProfileDialog
            open={isEditProfileOpen}
            onOpenChange={setIsEditProfileOpen}
          />

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your activity
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => updatePreference("emailNotifications", checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked) => updatePreference("pushNotifications", checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deal-updates">Deal Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when deals move stages
                  </p>
                </div>
                <Switch
                  id="deal-updates"
                  checked={preferences.dealUpdates}
                  onCheckedChange={(checked) => updatePreference("dealUpdates", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={preferences.darkMode}
                  onCheckedChange={(checked) => updatePreference("darkMode", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>
                Download your data in CSV or JSON format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Export contacts, properties, and deals. You own your data.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <DataExportDialog
            open={isExportDialogOpen}
            onOpenChange={setIsExportDialogOpen}
          />

          <KeyboardShortcutsDialog
            open={isShortcutsOpen}
            onOpenChange={setIsShortcutsOpen}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/settings/billing">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <CreditCard className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Billing & Subscription</div>
                    <div className="text-sm text-muted-foreground">
                      Manage your plan and payments
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Card
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setIsShortcutsOpen(true)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Keyboard className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Keyboard Shortcuts</div>
                  <div className="text-sm text-muted-foreground">
                    View all available shortcuts
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <Shield className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">Security</div>
                  <div className="text-sm text-muted-foreground">
                    Password and two-factor auth
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
