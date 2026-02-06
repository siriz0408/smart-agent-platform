import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Briefcase, Home, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface RoleSelectionStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const roles = [
  {
    id: "agent" as const,
    title: "Real Estate Agent",
    description: "I help buyers and sellers with their real estate needs",
    icon: Briefcase,
    features: ["Full CRM access", "Pipeline management", "Document analysis", "AI agents"],
  },
  {
    id: "buyer" as const,
    title: "Home Buyer",
    description: "I'm looking to purchase a property",
    icon: Home,
    features: ["Property search", "Saved properties", "Journey tracking", "Document review"],
  },
  {
    id: "seller" as const,
    title: "Home Seller",
    description: "I'm looking to sell my property",
    icon: DollarSign,
    features: ["Listing management", "Journey tracking", "Document review", "Agent messaging"],
  },
];

export function RoleSelectionStep({ data, updateData, onNext, onBack }: RoleSelectionStepProps) {
  const { profile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"agent" | "buyer" | "seller" | undefined>(
    data.role
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      // Persist the role selection to the profile in the database
      if (profile?.id) {
        const { error } = await supabase
          .from("profiles")
          .update({
            primary_role: selectedRole,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (error) throw error;
      }

      updateData({ role: selectedRole });
      onNext();
    } catch (error) {
      console.error("Failed to save role:", error);
      toast.error("Error", { description: "Failed to save your role. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>How will you use Smart Agent?</CardTitle>
        <CardDescription>
          Select your primary role to customize your experience.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRole(role.id)}
            className={cn(
              "w-full p-4 rounded-lg border-2 text-left transition-all",
              "hover:border-primary/50 hover:bg-accent/50",
              selectedRole === role.id
                ? "border-primary bg-primary/5"
                : "border-border"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center",
                  selectedRole === role.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <role.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{role.title}</h3>
                  {selectedRole === role.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {role.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {role.features.slice(0, 3).map((feature) => (
                    <span
                      key={feature}
                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1"
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? "Saving..." : "Continue"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
