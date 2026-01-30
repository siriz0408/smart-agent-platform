import { useState, useMemo } from "react";
import { DollarSign, Percent, Users, Building2, TrendingUp, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// ============================================================================
// TYPES
// ============================================================================

interface AgentCommissionCalculatorProps {
  initialSalePrice?: number;
  initialTotalCommission?: number;
  initialListingBuyerSplit?: number;
  initialBrokerSplit?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AgentCommissionCalculator({
  initialSalePrice = 450000,
  initialTotalCommission = 6,
  initialListingBuyerSplit = 50,
  initialBrokerSplit = 70,
}: AgentCommissionCalculatorProps) {
  const [salePrice, setSalePrice] = useState(initialSalePrice);
  const [totalCommissionPercent, setTotalCommissionPercent] = useState(initialTotalCommission);
  const [listingBuyerSplit, setListingBuyerSplit] = useState(initialListingBuyerSplit);
  const [brokerSplitPercent, setBrokerSplitPercent] = useState(initialBrokerSplit);
  const [showGCI, setShowGCI] = useState(false);
  const [transactionsPerYear, setTransactionsPerYear] = useState(12);
  const [isListingSide, setIsListingSide] = useState(true);

  // Calculate commission breakdown
  const calculations = useMemo(() => {
    const totalCommission = salePrice * (totalCommissionPercent / 100);
    const listingSidePercent = listingBuyerSplit;
    const buyerSidePercent = 100 - listingBuyerSplit;

    const listingSideAmount = totalCommission * (listingSidePercent / 100);
    const buyerSideAmount = totalCommission * (buyerSidePercent / 100);

    // Which side is the agent on?
    const agentSideAmount = isListingSide ? listingSideAmount : buyerSideAmount;

    // Broker split: agent keeps X%, broker gets (100-X)%
    const agentNetBeforeBroker = agentSideAmount;
    const agentNet = agentSideAmount * (brokerSplitPercent / 100);
    const brokerShare = agentSideAmount - agentNet;

    // GCI projection
    const annualGCI = agentNet * transactionsPerYear;
    const monthlyGCI = annualGCI / 12;

    return {
      totalCommission,
      listingSideAmount,
      buyerSideAmount,
      agentSideAmount,
      agentNetBeforeBroker,
      agentNet,
      brokerShare,
      annualGCI,
      monthlyGCI,
    };
  }, [salePrice, totalCommissionPercent, listingBuyerSplit, brokerSplitPercent, isListingSide, transactionsPerYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Agent Commission Calculator</CardTitle>
            <CardDescription className="text-xs">
              Calculate your commission, broker split, and GCI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Sale Price Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Sale Price
          </Label>
          <Input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            className="text-right font-mono"
          />
        </div>

        {/* Total Commission Slider */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Total Commission
            </Label>
            <span className="text-sm font-medium">
              {totalCommissionPercent}% ({formatCurrency(calculations.totalCommission)})
            </span>
          </div>
          <Slider
            value={[totalCommissionPercent]}
            onValueChange={(value) => setTotalCommissionPercent(value[0])}
            min={1}
            max={8}
            step={0.25}
            className="w-full"
          />
        </div>

        {/* Listing/Buyer Side Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Your Side
          </Label>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", !isListingSide && "text-muted-foreground")}>
              Listing
            </span>
            <Switch
              checked={!isListingSide}
              onCheckedChange={(checked) => setIsListingSide(!checked)}
            />
            <span className={cn("text-sm", isListingSide && "text-muted-foreground")}>
              Buyer
            </span>
          </div>
        </div>

        {/* Listing/Buyer Split */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Listing / Buyer Agent Split</Label>
            <span className="text-sm font-medium">
              {listingBuyerSplit}% / {100 - listingBuyerSplit}%
            </span>
          </div>
          <Slider
            value={[listingBuyerSplit]}
            onValueChange={(value) => setListingBuyerSplit(value[0])}
            min={30}
            max={70}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Listing: {formatCurrency(calculations.listingSideAmount)}</span>
            <span>Buyer: {formatCurrency(calculations.buyerSideAmount)}</span>
          </div>
        </div>

        {/* Broker Split */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Your Split (vs. Broker)
            </Label>
            <span className="text-sm font-medium">
              {brokerSplitPercent}% to you / {100 - brokerSplitPercent}% to broker
            </span>
          </div>
          <Slider
            value={[brokerSplitPercent]}
            onValueChange={(value) => setBrokerSplitPercent(value[0])}
            min={50}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Commission Summary */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Transaction Commission</span>
            <span className="font-mono">{formatCurrency(calculations.totalCommission)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Your Side ({isListingSide ? "Listing" : "Buyer"})
            </span>
            <span className="font-mono">{formatCurrency(calculations.agentSideAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Less: Broker Share ({100 - brokerSplitPercent}%)</span>
            <span className="font-mono text-destructive">-{formatCurrency(calculations.brokerShare)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Your Net Commission</span>
            <span className="font-bold text-xl text-green-600 dark:text-green-400 font-mono">
              {formatCurrency(calculations.agentNet)}
            </span>
          </div>
        </div>

        {/* GCI Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-gci" className="text-sm text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Show GCI Projection
          </Label>
          <Switch
            id="show-gci"
            checked={showGCI}
            onCheckedChange={setShowGCI}
          />
        </div>

        {/* GCI Projection */}
        {showGCI && (
          <div className="rounded-lg bg-muted p-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Transactions per Year</Label>
                <span className="text-sm font-medium">{transactionsPerYear}</span>
              </div>
              <Slider
                value={[transactionsPerYear]}
                onValueChange={(value) => setTransactionsPerYear(value[0])}
                min={1}
                max={50}
                step={1}
                className="w-full"
              />
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly GCI (avg)</span>
                <span className="font-mono font-medium">{formatCurrency(calculations.monthlyGCI)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Annual GCI</span>
                <span className="font-bold text-lg text-primary font-mono">
                  {formatCurrency(calculations.annualGCI)}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          GCI = Gross Commission Income. Projections assume consistent sale price and split.
          Does not account for taxes, marketing costs, or other expenses.
        </p>
      </CardContent>
    </Card>
  );
}

// Helper cn function (if not imported)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
