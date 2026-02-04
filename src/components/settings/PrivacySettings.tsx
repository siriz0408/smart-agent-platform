import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useProfilePrivacy } from "@/hooks/useProfilePrivacy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PrivacySettings() {
  const { settings, isLoading, updatePrivacy } = useProfilePrivacy();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading privacy settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can see your profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Visibility */}
        <div className="space-y-2">
          <Label htmlFor="profile-visibility">Profile Visibility</Label>
          <Select
            value={settings.profile_visibility}
            onValueChange={(value: "public" | "tenant" | "private") =>
              updatePrivacy.mutate({ profile_visibility: value })
            }
          >
            <SelectTrigger id="profile-visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                Public - Anyone can view
              </SelectItem>
              <SelectItem value="tenant">
                Team Only - Only your organization
              </SelectItem>
              <SelectItem value="private">
                Private - Only you
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose who can see your full profile
          </p>
        </div>

        <Separator />

        {/* Email Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-email">Show Email</Label>
            <p className="text-sm text-muted-foreground">
              Display your email address on your profile
            </p>
          </div>
          <Switch
            id="show-email"
            checked={settings.show_email}
            onCheckedChange={(checked) =>
              updatePrivacy.mutate({ show_email: checked })
            }
          />
        </div>

        <Separator />

        {/* Phone Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-phone">Show Phone Number</Label>
            <p className="text-sm text-muted-foreground">
              Display your phone number on your profile
            </p>
          </div>
          <Switch
            id="show-phone"
            checked={settings.show_phone}
            onCheckedChange={(checked) =>
              updatePrivacy.mutate({ show_phone: checked })
            }
          />
        </div>

        <Separator />

        {/* Social Links Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-social-links">Show Social Links</Label>
            <p className="text-sm text-muted-foreground">
              Display your social media links
            </p>
          </div>
          <Switch
            id="show-social-links"
            checked={settings.show_social_links}
            onCheckedChange={(checked) =>
              updatePrivacy.mutate({ show_social_links: checked })
            }
          />
        </div>

        <Separator />

        {/* Credentials Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-credentials">Show Credentials</Label>
            <p className="text-sm text-muted-foreground">
              Display your licenses and certifications
            </p>
          </div>
          <Switch
            id="show-credentials"
            checked={settings.show_credentials}
            onCheckedChange={(checked) =>
              updatePrivacy.mutate({ show_credentials: checked })
            }
          />
        </div>

        <Separator />

        {/* Gallery Visibility */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="show-gallery">Show Photo Gallery</Label>
            <p className="text-sm text-muted-foreground">
              Display your photo gallery on your profile
            </p>
          </div>
          <Switch
            id="show-gallery"
            checked={settings.show_gallery}
            onCheckedChange={(checked) =>
              updatePrivacy.mutate({ show_gallery: checked })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
