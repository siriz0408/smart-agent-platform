import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, FileText, Users, TrendingUp, ArrowRight } from "lucide-react";
import type { OnboardingData } from "@/hooks/useOnboarding";

interface WelcomeStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const features = [
  {
    icon: Bot,
    title: "AI-Powered Chat",
    description: "Ask questions about your documents and get instant answers",
  },
  {
    icon: FileText,
    title: "Document Intelligence",
    description: "Upload contracts, disclosures, and more for AI analysis",
  },
  {
    icon: Users,
    title: "CRM Built for Real Estate",
    description: "Manage contacts, properties, and deals in one place",
  },
  {
    icon: TrendingUp,
    title: "Pipeline Management",
    description: "Track buyer and seller deals through every stage",
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-8">
      {/* Logo */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary shadow-lg shadow-primary/25">
        <Bot className="h-10 w-10 text-primary-foreground" />
      </div>

      {/* Welcome Text */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Smart Agent
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Your AI-powered real estate assistant. Let's get you set up in just a few steps.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-3 text-left">
        {features.map((feature) => (
          <Card key={feature.title} className="bg-card/50">
            <CardContent className="p-4">
              <feature.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-medium text-sm">{feature.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Button size="lg" onClick={onNext} className="w-full max-w-xs">
        Get Started
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
