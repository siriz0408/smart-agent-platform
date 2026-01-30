import { useState, useMemo } from "react";
import { DollarSign, Landmark, Receipt, Percent, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// ============================================================================
// TYPES
// ============================================================================

interface SellerNetSheetProps {
  initialSalePrice?: number;
  initialMortgageBalance?: number;
  initialCommissionPercent?: number;
}

interface CostItem {
  name: string;
  amount: number;
  description?: string;
  editable?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SellerNetSheet({
  initialSalePrice = 450000,
  initialMortgageBalance = 280000,
  initialCommissionPercent = 6,
}: SellerNetSheetProps) {
  const [salePrice, setSalePrice] = useState(initialSalePrice);
  const [mortgageBalance, setMortgageBalance] = useState(initialMortgageBalance);
  const [commissionPercent, setCommissionPercent] = useState(initialCommissionPercent);
  const [showDetailedCosts, setShowDetailedCosts] = useState(false);

  // Calculate commission
  const commission = salePrice * (commissionPercent / 100);

  // Calculate seller closing costs
  const closingCosts = useMemo((): CostItem[] => {
    return [
      { name: "Title Insurance (Owner's)", amount: Math.round(salePrice * 0.003), description: "~0.3% of sale price" },
      { name: "Transfer Tax", amount: Math.round(salePrice * 0.002), description: "Varies by location" },
      { name: "Escrow Fees", amount: Math.round(salePrice * 0.002), description: "~0.2% of sale price" },
      { name: "Attorney Fees", amount: 600, description: "Legal services" },
      { name: "Recording Fees", amount: 75, description: "Document recording" },
      { name: "Home Warranty (Buyer)", amount: 500, description: "Optional buyer incentive" },
      { name: "Prorated Property Tax", amount: Math.round((salePrice * 0.012) / 4), description: "Est. 3 months" },
      { name: "HOA Transfer Fee", amount: 300, description: "If applicable" },
    ];
  }, [salePrice]);

  const totalClosingCosts = closingCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = mortgageBalance + commission + totalClosingCosts;
  const netProceeds = salePrice - totalDeductions;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyColor = (value: number) => {
    if (value < 0) return "text-destructive";
    if (value > 0) return "text-green-600 dark:text-green-400";
    return "text-foreground";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Seller Net Sheet</CardTitle>
            <CardDescription className="text-xs">
              Calculate your estimated proceeds from selling
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

        {/* Mortgage Balance Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            Remaining Mortgage Balance
          </Label>
          <Input
            type="number"
            value={mortgageBalance}
            onChange={(e) => setMortgageBalance(Number(e.target.value))}
            className="text-right font-mono"
          />
        </div>

        {/* Commission Slider */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Agent Commission
            </Label>
            <span className="text-sm font-medium">
              {commissionPercent}% ({formatCurrency(commission)})
            </span>
          </div>
          <Slider
            value={[commissionPercent]}
            onValueChange={(value) => setCommissionPercent(value[0])}
            min={0}
            max={8}
            step={0.5}
            className="w-full"
          />
        </div>

        {/* Net Proceeds Summary */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sale Price</span>
            <span className="font-mono">{formatCurrency(salePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Less: Mortgage Payoff</span>
            <span className="font-mono text-destructive">-{formatCurrency(mortgageBalance)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Less: Agent Commission</span>
            <span className="font-mono text-destructive">-{formatCurrency(commission)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Less: Closing Costs</span>
            <span className="font-mono text-destructive">-{formatCurrency(totalClosingCosts)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Estimated Net Proceeds
            </span>
            <span className={`font-bold text-xl font-mono ${formatCurrencyColor(netProceeds)}`}>
              {formatCurrency(netProceeds)}
            </span>
          </div>
        </div>

        {/* Equity Summary */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Home Equity</span>
            <span className="font-mono font-medium">
              {formatCurrency(salePrice - mortgageBalance)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Selling Costs</span>
            <span className="font-mono text-destructive">
              -{formatCurrency(commission + totalClosingCosts)}
            </span>
          </div>
        </div>

        {/* Toggle for detailed costs */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-details" className="text-sm text-muted-foreground">
            Show closing cost breakdown
          </Label>
          <Switch
            id="show-details"
            checked={showDetailedCosts}
            onCheckedChange={setShowDetailedCosts}
          />
        </div>

        {/* Detailed Closing Costs */}
        {showDetailedCosts && (
          <div className="rounded-lg bg-muted p-4 space-y-3 animate-in slide-in-from-top-2">
            <p className="text-sm font-medium text-muted-foreground">
              Estimated Closing Costs
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {closingCosts.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-foreground">{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                  <span className="font-mono shrink-0">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-medium">Total Closing Costs</span>
              <span className="font-bold text-primary font-mono">
                {formatCurrency(totalClosingCosts)}
              </span>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Estimates only. Actual costs vary by location, lender, and transaction.
          Does not include capital gains tax or other individual tax considerations.
        </p>
      </CardContent>
    </Card>
  );
}
