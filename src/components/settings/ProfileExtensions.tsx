import { useState } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function ProfileExtensions() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [bio, setBio] = useState(profile?.bio || "");
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [brokerage, setBrokerage] = useState(profile?.brokerage_name || "");
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || "");
  const [licenseState, setLicenseState] = useState(profile?.license_state || "");
  const [yearsExperience, setYearsExperience] = useState(profile?.years_experience?.toString() || "");
  const [specialties, setSpecialties] = useState(profile?.specialties?.join(", ") || "");
  const [serviceAreas, setServiceAreas] = useState(profile?.service_areas?.join(", ") || "");
  const [website, setWebsite] = useState(profile?.website || "");

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      // Parse specialties and service areas from comma-separated strings
      const specialtiesArray = specialties
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const serviceAreasArray = serviceAreas
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase
        .from("profiles")
        .update({
          bio: bio || null,
          headline: headline || null,
          brokerage_name: brokerage || null,
          license_number: licenseNumber || null,
          license_state: licenseState || null,
          years_experience: yearsExperience ? parseInt(yearsExperience) : null,
          specialties: specialtiesArray.length > 0 ? specialtiesArray : null,
          service_areas: serviceAreasArray.length > 0 ? serviceAreasArray : null,
          website: website || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Professional Profile
        </CardTitle>
        <CardDescription>
          Enhance your profile with professional information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline */}
        <div className="space-y-2">
          <Label htmlFor="headline">Professional Headline</Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g., Top Producer | Luxury Homes Specialist"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {headline.length}/100 characters
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself, your experience, and what makes you unique..."
            maxLength={500}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/500 characters
          </p>
        </div>

        {/* Brokerage Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brokerage">Brokerage Name</Label>
            <Input
              id="brokerage"
              value={brokerage}
              onChange={(e) => setBrokerage(e.target.value)}
              placeholder="e.g., Keller Williams Realty"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years-experience">Years of Experience</Label>
            <Input
              id="years-experience"
              type="number"
              min="0"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g., 5"
            />
          </div>
        </div>

        {/* License Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="license-number">License Number</Label>
            <Input
              id="license-number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g., RE123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license-state">License State</Label>
            <Select value={licenseState} onValueChange={setLicenseState}>
              <SelectTrigger id="license-state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <Label htmlFor="specialties">Specialties</Label>
          <Input
            id="specialties"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="e.g., Luxury Homes, First-Time Buyers, Relocation"
          />
          <p className="text-xs text-muted-foreground">
            Separate with commas
          </p>
        </div>

        {/* Service Areas */}
        <div className="space-y-2">
          <Label htmlFor="service-areas">Service Areas</Label>
          <Input
            id="service-areas"
            value={serviceAreas}
            onChange={(e) => setServiceAreas(e.target.value)}
            placeholder="e.g., Downtown, Suburbs, Waterfront"
          />
          <p className="text-xs text-muted-foreground">
            Separate with commas
          </p>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://www.yourwebsite.com"
          />
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
