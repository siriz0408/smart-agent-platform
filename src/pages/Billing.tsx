import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, CreditCard, Zap, Crown, Loader2, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { useSubscription, createCheckoutSession, openCustomerPortal, PLAN_PRICES } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { UsageChart } from "@/components/billing/UsageChart";
import { TrialCountdown } from "@/components/billing/TrialCountdown";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For individual agents getting started",
    features: [
      "50 AI queries per month",
      "5 document uploads",
      "Basic CRM features",
      "Email support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 29,
    description: "For growing agents",
    features: [
      "500 AI queries per month",
      "50 document uploads",
      "Full CRM access",
      "Pipeline management",
      "Priority email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 79,
    description: "For power users",
    features: [
      "Unlimited AI queries",
      "Unlimited documents",
      "Custom AI agents",
      "Advanced analytics",
      "API access",
      "Phone support",
    ],
    isPopular: true,
  },
  {
    id: "team",
    name: "Team",
    price: 199,
    description: "For small teams",
    features: [
      "Everything in Professional",
      "Up to 10 team members",
      "Team collaboration tools",
      "Admin controls",
      "Dedicated success manager",
    ],
  },
];

export default function Billing() {
  const { subscription, usage, plan: currentPlan, limits, isLoading, refetch, isTrialing, trialDaysRemaining } = useSubscription();
  const [searchParams] = useSearchParams();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Handle success/cancel URL params from Stripe
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast.success("Subscription successful!", { description: "Your plan has been upgraded. It may take a moment to reflect." });
      refetch();
    } else if (searchParams.get("canceled") === "true") {
      toast.error("Subscription canceled", { description: "You can upgrade anytime." });
    }
  }, [searchParams, refetch]);

  const handleUpgrade = async (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;
    
    setUpgradeLoading(planId);
    try {
      const url = await createCheckoutSession(planId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to start checkout" });
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await openCustomerPortal();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      toast.error("Error", { description: error instanceof Error ? error.message : "Failed to open billing portal" });
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (used: number, limit: number) => {
    if (limit === -1) return `${used} / Unlimited`;
    return `${used} / ${limit}`;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Billing & Subscription</h1>
            <p className="text-sm text-muted-foreground">
              Manage your subscription and view usage
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link to="/settings">Back to Settings</Link>
          </Button>
        </div>

        {/* Trial Countdown Banner */}
        {isTrialing && <TrialCountdown />}

        {/* Current Plan & Usage */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-semibold capitalize">{currentPlan}</div>
                  <div className="text-muted-foreground">
                    {isTrialing ? (
                      <span className="text-primary font-medium">Free Trial • ${PLAN_PRICES[currentPlan] || 0}/month after trial</span>
                    ) : (
                      `$${PLAN_PRICES[currentPlan] || 0}/month`
                    )}
                  </div>
                </div>
                <Badge variant={subscription?.status === "active" || subscription?.status === "trialing" ? "default" : "secondary"}>
                  {subscription?.status === "trialing" ? "Trial" : subscription?.status || "active"}
                </Badge>
              </div>
              {isTrialing && trialDaysRemaining !== undefined && (
                <p className="text-sm text-muted-foreground mb-4">
                  {trialDaysRemaining === 0
                    ? "Your trial ends today"
                    : trialDaysRemaining === 1
                    ? "1 day remaining in your trial"
                    : `${trialDaysRemaining} days remaining in your trial`}
                </p>
              )}
              {!isTrialing && subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground mb-4">
                  Your plan renews on {formatDate(subscription.current_period_end)}
                </p>
              )}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleManageSubscription}
                  disabled={portalLoading || !subscription?.stripe_customer_id}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Manage Subscription
                </Button>
                <Button variant="outline" disabled={!subscription?.stripe_customer_id}>
                  <CreditCard className="h-4 w-4" />
                </Button>
              </div>
              {!subscription?.stripe_customer_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Subscribe to a paid plan to manage your billing
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>AI Queries</span>
                  <span className="font-medium">
                    {formatLimit(usage?.aiQueries || 0, limits.aiQueries)}
                  </span>
                </div>
                <Progress value={getUsagePercent(usage?.aiQueries || 0, limits.aiQueries)} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Documents</span>
                  <span className="font-medium">
                    {formatLimit(usage?.documents || 0, limits.documents)}
                  </span>
                </div>
                <Progress value={getUsagePercent(usage?.documents || 0, limits.documents)} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Storage</span>
                  <span className="font-medium">0 GB / {limits.storageGb} GB</span>
                </div>
                <Progress value={0} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Trends Chart */}
        <UsageChart planLimit={limits.aiQueries} />

        {/* Invoice History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice History
            </CardTitle>
            <CardDescription>
              View and download your past invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceList />
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Plans</h2>
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const isUpgrading = upgradeLoading === plan.id;
              
              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative",
                    plan.isPopular && "border-primary",
                    isCurrent && "bg-accent/50"
                  )}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {isCurrent && (
                        <Badge variant="secondary">Current</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : plan.isPopular ? "default" : "outline"}
                      disabled={isCurrent || plan.id === "free" || isUpgrading}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isUpgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isCurrent 
                        ? "Current Plan" 
                        : plan.id === "free" 
                        ? "Free" 
                        : isTrialing && plan.id === currentPlan
                        ? "Trial Active"
                        : "Start 14-Day Trial"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
