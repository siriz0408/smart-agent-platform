import { useState, useMemo } from "react";
import { Home, DollarSign, Percent, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface AffordabilityCalculatorProps {
  initialMonthlyBudget?: number;
  initialDownPaymentPercent?: number;
  initialInterestRate?: number;
  initialAnnualIncome?: number;
}

export function AffordabilityCalculator({
  initialMonthlyBudget = 3000,
  initialDownPaymentPercent = 20,
  initialInterestRate = 6.75,
  initialAnnualIncome = 100000,
}: AffordabilityCalculatorProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(initialMonthlyBudget);
  const [downPaymentPercent, setDownPaymentPercent] = useState(initialDownPaymentPercent);
  const [interestRate, setInterestRate] = useState(initialInterestRate);
  const [annualIncome, setAnnualIncome] = useState(initialAnnualIncome);

  // Calculate max home price based on monthly budget
  const calculations = useMemo(() => {
    // Reverse mortgage calculation
    // Monthly payment = P * [r(1+r)^n] / [(1+r)^n - 1]
    // We need to solve for P (principal/loan amount)
    
    // Estimate taxes & insurance (~1.5% of home value annually = 0.125%/month)
    // So if budget is $3000, maybe $2400 goes to P&I, $600 to tax/insurance
    
    // Iterative approach: estimate home price, check if payment fits budget
    const monthlyRate = interestRate / 100 / 12;
    const loanTermMonths = 30 * 12; // Assume 30-year loan
    
    // Property tax estimate: 1.2% annually
    // Insurance estimate: 0.5% annually
    // PMI if < 20%: 0.5% annually
    const taxRate = 0.012 / 12;
    const insuranceRate = 0.005 / 12;
    const pmiRate = downPaymentPercent < 20 ? 0.005 / 12 : 0;
    
    // Monthly payment for P&I only (without extras)
    // budget = P&I + tax + insurance + pmi
    // budget = P&I + homePrice * (taxRate + insuranceRate + pmiRate * loanPercent)
    // P&I = loanAmount * [r(1+r)^n] / [(1+r)^n - 1]
    // loanAmount = homePrice * (1 - downPaymentPercent/100)
    
    // Let's solve iteratively
    let maxHomePrice = 0;
    const loanPercent = 1 - downPaymentPercent / 100;
    
    // Binary search for max home price
    let low = 0;
    let high = 3000000;
    
    while (high - low > 1000) {
      const mid = (low + high) / 2;
      const loanAmount = mid * loanPercent;
      
      // P&I payment
      const piPayment = monthlyRate > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
          (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
        : loanAmount / loanTermMonths;
      
      // Tax, insurance, PMI
      const taxPayment = mid * taxRate;
      const insurancePayment = mid * insuranceRate;
      const pmiPayment = loanAmount * pmiRate;
      
      const totalPayment = piPayment + taxPayment + insurancePayment + pmiPayment;
      
      if (totalPayment <= monthlyBudget) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    maxHomePrice = Math.floor(low / 1000) * 1000; // Round down to nearest $1000
    
    // Calculate breakdown for the max home price
    const loanAmount = maxHomePrice * loanPercent;
    const piPayment = monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
        (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
      : loanAmount / loanTermMonths;
    
    const taxPayment = maxHomePrice * taxRate;
    const insurancePayment = maxHomePrice * insuranceRate;
    const pmiPayment = loanAmount * pmiRate;
    const totalMonthly = piPayment + taxPayment + insurancePayment + pmiPayment;
    
    // Calculate housing ratio (28% rule)
    const monthlyGrossIncome = annualIncome / 12;
    const housingRatio = (totalMonthly / monthlyGrossIncome) * 100;
    
    // Debt-to-income ratio (36% rule) - assume 10% for other debts
    const estimatedOtherDebt = monthlyGrossIncome * 0.10;
    const dtiRatio = ((totalMonthly + estimatedOtherDebt) / monthlyGrossIncome) * 100;
    
    return {
      maxHomePrice,
      downPaymentAmount: maxHomePrice * (downPaymentPercent / 100),
      loanAmount,
      principalInterest: piPayment,
      propertyTax: taxPayment,
      insurance: insurancePayment,
      pmi: pmiPayment,
      totalMonthly,
      housingRatio,
      dtiRatio,
      housingRatioOk: housingRatio <= 28,
      dtiRatioOk: dtiRatio <= 36,
    };
  }, [monthlyBudget, downPaymentPercent, interestRate, annualIncome]);

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
          <Home className="h-5 w-5 text-primary" />
          Affordability Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Budget */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Monthly Housing Budget
            </Label>
            <span className="text-sm font-medium font-mono">
              {formatCurrency(monthlyBudget)}
            </span>
          </div>
          <Slider
            value={[monthlyBudget]}
            onValueChange={(value) => setMonthlyBudget(value[0])}
            min={1000}
            max={15000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$1,000</span>
            <span>$15,000</span>
          </div>
        </div>

        {/* Annual Income */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Annual Gross Income
            </Label>
            <span className="text-sm font-medium font-mono">
              {formatCurrency(annualIncome)}
            </span>
          </div>
          <Slider
            value={[annualIncome]}
            onValueChange={(value) => setAnnualIncome(value[0])}
            min={30000}
            max={500000}
            step={5000}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$30k</span>
            <span>$500k</span>
          </div>
        </div>

        {/* Down Payment */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Down Payment</Label>
            <span className="text-sm font-medium">
              {downPaymentPercent}% ({formatCurrency(calculations.downPaymentAmount)})
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

        {/* Interest Rate */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Interest Rate
            </Label>
            <span className="text-sm font-medium">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={(value) => setInterestRate(value[0])}
            min={2}
            max={12}
            step={0.125}
            className="w-full"
          />
        </div>

        {/* Max Home Price Result */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">You Can Afford Up To</p>
          <p className="text-3xl font-bold text-primary font-mono">
            {formatCurrency(calculations.maxHomePrice)}
          </p>
        </div>

        {/* Housing Ratios */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 flex items-center gap-2 ${
            calculations.housingRatioOk 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            {calculations.housingRatioOk ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Housing Ratio</p>
              <p className="text-sm font-medium">{calculations.housingRatio.toFixed(0)}% of income</p>
            </div>
          </div>
          <div className={`rounded-lg p-3 flex items-center gap-2 ${
            calculations.dtiRatioOk 
              ? 'bg-green-500/10 border border-green-500/20' 
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            {calculations.dtiRatioOk ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Debt-to-Income</p>
              <p className="text-sm font-medium">{calculations.dtiRatio.toFixed(0)}% total</p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="rounded-lg bg-muted p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Monthly Breakdown</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Principal & Interest</span>
            <span className="font-mono">{formatCurrency(calculations.principalInterest)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Property Tax (est.)</span>
            <span className="font-mono">{formatCurrency(calculations.propertyTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Insurance (est.)</span>
            <span className="font-mono">{formatCurrency(calculations.insurance)}</span>
          </div>
          {calculations.pmi > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PMI</span>
              <span className="font-mono">{formatCurrency(calculations.pmi)}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Total Monthly</span>
            <span className="font-bold text-lg text-primary font-mono">
              {formatCurrency(calculations.totalMonthly)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Based on the 28/36 rule. The housing ratio should be ≤28% and total DTI ≤36%. 
          Estimates only—actual approval depends on credit, employment, and other factors.
        </p>
      </CardContent>
    </Card>
  );
}
