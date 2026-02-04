import { useState } from "react";
import { Share2, Plus, Trash2, Linkedin, Twitter, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfileExtensions } from "@/hooks/useProfileExtensions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "twitter", label: "Twitter", icon: Twitter },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "facebook", label: "Facebook", icon: Facebook },
] as const;

export function SocialLinksManagement() {
  const { socialLinks, isLoading, addSocialLink, deleteSocialLink } = useProfileExtensions();
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");

  const resetForm = () => {
    setPlatform("");
    setUrl("");
  };

  const handleAdd = async () => {
    if (!platform || !url) {
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    await addSocialLink.mutateAsync({ platform, url });
    resetForm();
    setIsAddOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this social link?")) {
      await deleteSocialLink.mutateAsync(id);
    }
  };

  const getPlatformIcon = (platformValue: string) => {
    const platform = PLATFORMS.find((p) => p.value === platformValue);
    return platform?.icon || Share2;
  };

  const getPlatformLabel = (platformValue: string) => {
    const platform = PLATFORMS.find((p) => p.value === platformValue);
    return platform?.label || platformValue;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Social Media Links
            </CardTitle>
            <CardDescription>
              Add links to your professional social media profiles
            </CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Social Link</DialogTitle>
                <DialogDescription>
                  Add a link to your social media profile
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform *</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <div className="flex items-center gap-2">
                            <p.icon className="h-4 w-4" />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Profile URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!platform || !url}>
                  Add Link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading social links...</p>
        ) : socialLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No social links added yet. Click "Add" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {socialLinks.map((link) => {
              const Icon = getPlatformIcon(link.platform);
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{getPlatformLabel(link.platform)}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate max-w-[300px] block"
                      >
                        {link.url}
                      </a>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
