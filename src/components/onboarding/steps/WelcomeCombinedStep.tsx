/**
 * GRW-012: Streamlined Onboarding Variant - Combined Welcome Step
 *
 * A single-page onboarding step that combines welcome, profile, and role selection
 * into one streamlined experience. Used in the "streamlined" A/B test variant.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Briefcase, Home, DollarSign, Check, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface WelcomeCombinedStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const roles = [
  {
    id: "agent" as const,
    title: "Real Estate Agent",
    description: "Help buyers and sellers",
    icon: Briefcase,
  },
  {
    id: "buyer" as const,
    title: "Home Buyer",
    description: "Looking to purchase",
    icon: Home,
  },
  {
    id: "seller" as const,
    title: "Home Seller",
    description: "Looking to sell",
    icon: DollarSign,
  },
];

export function WelcomeCombinedStep({ data, updateData, onNext }: WelcomeCombinedStepProps) {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState(data.fullName || profile?.full_name || "");
  const [selectedRole, setSelectedRole] = useState<"agent" | "buyer" | "seller" | undefined>(
    data.role
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Name required", { description: "Please enter your name to continue." });
      return;
    }

    if (!selectedRole) {
      toast.error("Role required", { description: "Please select how you'll use Smart Agent." });
      return;
    }

    setIsLoading(true);

    try {
      if (profile?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            primary_role: selectedRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (error) throw error;
      }

      updateData({ fullName, role: selectedRole });
      onNext();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Error", { description: "Failed to save your information. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/25">
          <Bot className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Smart Agent</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Let's get you set up in under a minute.
        </p>
      </div>

      {/* Combined Form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="fullName">What's your name?</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
                className="h-12 text-lg"
              />
            </div>

            {/* Role Selection - Compact */}
            <div className="space-y-2">
              <Label>How will you use Smart Agent?</Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all relative",
                      "hover:border-primary/50 hover:bg-accent/50",
                      selectedRole === role.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    {selectedRole === role.id && (
                      <div className="absolute top-1 right-1">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <role.icon
                      className={cn(
                        "h-6 w-6 mx-auto mb-1",
                        selectedRole === role.id ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <p className="text-xs font-medium leading-tight">{role.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading || !fullName.trim() || !selectedRole}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Trust Signals */}
      <p className="text-center text-xs text-muted-foreground">
        No credit card required. Get started for free.
      </p>
    </div>
  );
}
