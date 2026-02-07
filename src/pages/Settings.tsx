import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, Bell, CreditCard, Palette, Keyboard, Shield, ChevronRight, Download, Sun, Moon, Monitor, Check, Plug2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { EditProfileDialog } from "@/components/settings/EditProfileDialog";
import { DataExportDialog } from "@/components/settings/DataExportDialog";
import { DataDeletionDialog } from "@/components/settings/DataDeletionDialog";
import { KeyboardShortcutsDialog } from "@/components/settings/KeyboardShortcutsDialog";
import { ProfileExtensions } from "@/components/settings/ProfileExtensions";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { CredentialsManagement } from "@/components/settings/CredentialsManagement";
import { SocialLinksManagement } from "@/components/settings/SocialLinksManagement";
import { PhotoGalleryManagement } from "@/components/settings/PhotoGalleryManagement";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { Progress } from "@/components/ui/progress";

export default function Settings() {
  const { user, profile } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const { data: profileCompletion } = useProfileCompletion();
  const { theme, setTheme } = useTheme();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const location = useLocation();

  const defaultTab = location.hash?.replace("#", "") || "profile";

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold">Settings</h1>
            {profileCompletion && (
              <div className="text-sm text-muted-foreground">
                Profile {profileCompletion.percentage}% complete
              </div>
            )}
          </div>
          {profileCompletion && profileCompletion.percentage < 80 && (
            <div className="mb-2">
              <Progress value={profileCompletion.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Complete your profile to unlock all features
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>

        <Tabs
          defaultValue={defaultTab}
          onValueChange={(value) => {
            window.history.replaceState(null, "", `#${value}`);
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto mb-6">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1.5">
              <Plug2 className="h-4 w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">More</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg sm:text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base sm:text-lg truncate">
                      {profile?.full_name || "User"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{user?.email}</div>
                    {profile?.title && (
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">{profile.title}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto mt-2 sm:mt-0"
                    onClick={() => setIsEditProfileOpen(true)}
                  >
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ProfileExtensions />
            <CredentialsManagement />
            <SocialLinksManagement />
            <PhotoGalleryManagement />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Plug2 className="h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Connect your favorite tools and services to Smart Agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegrationsSettings />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Channels
                </CardTitle>
                <CardDescription>
                  Choose how you receive notifications
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>
                  Control what types of events trigger notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="message-notifications">Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive new messages
                    </p>
                  </div>
                  <Switch
                    id="message-notifications"
                    checked={preferences.messageNotifications ?? true}
                    onCheckedChange={(checked) => updatePreference("messageNotifications", checked)}
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
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="property-notifications">Property Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new matches and price changes
                    </p>
                  </div>
                  <Switch
                    id="property-notifications"
                    checked={preferences.propertyNotifications ?? true}
                    onCheckedChange={(checked) => updatePreference("propertyNotifications", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Frequency</CardTitle>
                <CardDescription>
                  Control how often you receive email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-frequency">Email Frequency</Label>
                  <Select
                    value={preferences.emailFrequency ?? "instant"}
                    onValueChange={(value) => updatePreference("emailFrequency", value)}
                  >
                    <SelectTrigger id="email-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant (as soon as events occur)</SelectItem>
                      <SelectItem value="daily">Daily Digest (once per day)</SelectItem>
                      <SelectItem value="weekly">Weekly Summary (once per week)</SelectItem>
                      <SelectItem value="off">Off (no email notifications)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {preferences.emailFrequency === "instant" && "You'll receive emails immediately when events occur"}
                    {preferences.emailFrequency === "daily" && "You'll receive a summary email once per day"}
                    {preferences.emailFrequency === "weekly" && "You'll receive a summary email once per week"}
                    {preferences.emailFrequency === "off" && "No email notifications will be sent"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiet Hours</CardTitle>
                <CardDescription>
                  Set times when you don't want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-hours-start">Start Time</Label>
                    <Input
                      id="quiet-hours-start"
                      type="time"
                      value={preferences.quietHoursStart ?? ""}
                      onChange={(e) => updatePreference("quietHoursStart", e.target.value || null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-hours-end">End Time</Label>
                    <Input
                      id="quiet-hours-end"
                      type="time"
                      value={preferences.quietHoursEnd ?? ""}
                      onChange={(e) => updatePreference("quietHoursEnd", e.target.value || null)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  During quiet hours, notifications will be delayed until the end time
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>
                  Choose your preferred color theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "light" as Theme, label: "Light", icon: Sun, preview: "bg-white border-border" },
                    { value: "dark" as Theme, label: "Dark", icon: Moon, preview: "bg-zinc-900 border-zinc-700" },
                    { value: "system" as Theme, label: "System", icon: Monitor, preview: "bg-gradient-to-r from-white to-zinc-900 border-border" },
                  ]).map(({ value, label, icon: Icon, preview }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={`relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${
                        theme === value
                          ? "border-primary bg-accent/50 ring-1 ring-primary/20"
                          : "border-border"
                      }`}
                      aria-label={`Set theme to ${label}`}
                      aria-pressed={theme === value}
                    >
                      {theme === value && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className={`h-12 w-full rounded-md border ${preview}`} />
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {theme === "system"
                    ? "Automatically matches your operating system's theme preference"
                    : `Using ${theme} mode`}
                </p>
              </CardContent>
            </Card>

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
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4 md:space-y-6">
            <div id="privacy-section">
              <PrivacySettings />
            </div>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Account Deletion
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data (GDPR Right to Erasure)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      This will permanently delete your account, all your data, and cannot be undone.
                      We recommend exporting your data first.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      In compliance with GDPR Article 17, your data will be deleted within 30 days.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeletionDialogOpen(true)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing & More Tab */}
          <TabsContent value="billing" className="space-y-4 md:space-y-6">
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <EditProfileDialog
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
        />
        <DataExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
        />
        <DataDeletionDialog
          open={isDeletionDialogOpen}
          onOpenChange={setIsDeletionDialogOpen}
        />
        <KeyboardShortcutsDialog
          open={isShortcutsOpen}
          onOpenChange={setIsShortcutsOpen}
        />
      </div>
    </AppLayout>
  );
}
