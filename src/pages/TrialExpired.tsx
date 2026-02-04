
import { Clock, Zap, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_PRICES } from "@/hooks/useSubscription";
import { createCheckoutSession } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "For growing agents",
    features: [
      "500 AI queries per month",
      "50 document uploads",
      "Full CRM access",
      "Pipeline management",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Most popular",
    features: [
      "Unlimited AI queries",
      "Unlimited documents",
      "Custom AI agents",
      "Advanced analytics",
      "API access",
    ],
    isPopular: true,
  },
  {
    id: "team",
    name: "Team",
    description: "For small teams",
    features: [
      "Everything in Professional",
      "Up to 10 team members",
      "Team collaboration tools",
      "Admin controls",
    ],
  },
];

export default function TrialExpired() {
  
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const url = await createCheckoutSession(planId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-6">
      <div className="max-w-4xl w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-500 mb-4">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Your Trial Has Ended</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            We hope you enjoyed trying Smart Agent. Choose a plan to continue accessing all features.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.isPopular ? "border-primary shadow-lg" : ""
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    ${PLAN_PRICES[plan.id]}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {loading === plan.id ? "Loading..." : "Upgrade"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground text-sm">
            Have questions?{" "}
            <Button variant="link" className="p-0 h-auto text-sm">
              <MessageSquare className="h-3 w-3 mr-1" />
              Contact Support
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
