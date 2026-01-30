import { useState, useMemo } from "react";
import { Receipt, DollarSign, Home, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClosingCostsCalculatorProps {
  initialHomePrice?: number;
  initialDownPaymentPercent?: number;
  initialView?: "buyer" | "seller";
}

interface CostItem {
  name: string;
  amount: number;
  description?: string;
}

export function ClosingCostsCalculator({
  initialHomePrice = 450000,
  initialDownPaymentPercent = 20,
  initialView = "buyer",
}: ClosingCostsCalculatorProps) {
  const [homePrice, setHomePrice] = useState(initialHomePrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(initialDownPaymentPercent);
  const [view, setView] = useState<"buyer" | "seller">(initialView);

  const downPayment = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPayment;

  // Calculate buyer closing costs
  const buyerCosts = useMemo((): CostItem[] => {
    return [
      { name: "Loan Origination Fee", amount: loanAmount * 0.01, description: "1% of loan amount" },
      { name: "Appraisal", amount: 500, description: "Property valuation" },
      { name: "Home Inspection", amount: 400, description: "Professional inspection" },
      { name: "Title Insurance", amount: homePrice * 0.005, description: "~0.5% of home price" },
      { name: "Title Search & Exam", amount: 350, description: "Title research" },
      { name: "Attorney Fees", amount: 800, description: "Legal services" },
      { name: "Recording Fees", amount: 125, description: "Document recording" },
      { name: "Prepaid Insurance (12 mo)", amount: Math.round(homePrice * 0.004), description: "~0.4% of home price" },
      { name: "Prepaid Property Tax (6 mo)", amount: Math.round((homePrice * 0.012) / 2), description: "~1.2% annual rate" },
      { name: "Credit Report", amount: 50, description: "Credit check" },
      { name: "Escrow Fees", amount: Math.round(homePrice * 0.002), description: "~0.2% of home price" },
    ];
  }, [homePrice, loanAmount]);

  // Calculate seller closing costs
  const sellerCosts = useMemo((): CostItem[] => {
    return [
      { name: "Real Estate Commission", amount: homePrice * 0.06, description: "Typically 5-6%" },
      { name: "Title Insurance (Owner's)", amount: homePrice * 0.003, description: "~0.3% of home price" },
      { name: "Transfer Tax", amount: homePrice * 0.002, description: "Varies by location" },
      { name: "Attorney Fees", amount: 600, description: "Legal services" },
      { name: "Escrow Fees", amount: Math.round(homePrice * 0.002), description: "~0.2% of home price" },
      { name: "Recording Fees", amount: 75, description: "Document recording" },
      { name: "Home Warranty (Buyer)", amount: 500, description: "Optional buyer incentive" },
      { name: "Prorated Property Tax", amount: Math.round((homePrice * 0.012) / 4), description: "Estimated 3 months" },
      { name: "HOA Transfer Fee", amount: 300, description: "If applicable" },
    ];
  }, [homePrice]);

  const currentCosts = view === "buyer" ? buyerCosts : sellerCosts;
  const totalClosingCosts = currentCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalCashNeeded = view === "buyer" ? downPayment + totalClosingCosts : 0;
  const estimatedProceeds = view === "seller" ? homePrice - totalClosingCosts : 0;

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
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Closing Costs Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Buyer/Seller Toggle */}
        <Tabs value={view} onValueChange={(v) => setView(v as "buyer" | "seller")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buyer" className="gap-2">
              <Home className="h-4 w-4" />
              Buyer View
            </TabsTrigger>
            <TabsTrigger value="seller" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Seller View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Home Price Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {view === "buyer" ? "Home Price" : "Sale Price"}
          </Label>
          <Input
            type="number"
            value={homePrice}
            onChange={(e) => setHomePrice(Number(e.target.value))}
            className="text-right font-mono"
          />
        </div>

        {/* Down Payment (Buyer Only) */}
        {view === "buyer" && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Down Payment</Label>
              <span className="text-sm font-medium">
                {downPaymentPercent}% ({formatCurrency(downPayment)})
              </span>
            </div>
            <Slider
              value={[downPaymentPercent]}
              onValueChange={(value) => setDownPaymentPercent(value[0])}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Summary Card */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
          {view === "buyer" ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Down Payment</span>
                <span className="font-mono">{formatCurrency(downPayment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Closing Costs</span>
                <span className="font-mono">{formatCurrency(totalClosingCosts)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Total Cash at Closing</span>
                <span className="font-bold text-lg text-primary font-mono">
                  {formatCurrency(totalCashNeeded)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sale Price</span>
                <span className="font-mono">{formatCurrency(homePrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Less: Closing Costs</span>
                <span className="font-mono text-destructive">-{formatCurrency(totalClosingCosts)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Estimated Proceeds</span>
                <span className="font-bold text-lg text-primary font-mono">
                  {formatCurrency(estimatedProceeds)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Itemized Breakdown */}
        <div className="rounded-lg bg-muted p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {view === "buyer" ? "Buyer" : "Seller"} Closing Costs Breakdown
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {currentCosts.map((item, index) => (
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
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Total Closing Costs</span>
            <span className="font-bold text-primary font-mono">
              {formatCurrency(totalClosingCosts)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estimates only. Actual costs vary by location, lender, and transaction details.
          {view === "seller" && " Commission rate assumed at 6%."}
        </p>
      </CardContent>
    </Card>
  );
}
